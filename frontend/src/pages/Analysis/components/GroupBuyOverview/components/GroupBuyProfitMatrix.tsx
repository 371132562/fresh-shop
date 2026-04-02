import { DotChartOutlined } from '@ant-design/icons'
import { Card, Empty, Tag } from 'antd'
import type { CallbackDataParams, EChartsOption } from 'echarts'
import type { MergedGroupBuyOverviewListItem } from 'fresh-shop-backend/types/dto'
import { useMemo, useState } from 'react'

import { FullscreenChart } from '@/components/FullscreenChart'
import dayjs from '@/utils/day'
import {
  calculateProfitMarginPercent,
  isHighRefundPressure,
  LOW_PROFIT_MARGIN_PERCENT
} from '@/utils/profitability'

type GroupBuyProfitMatrixProps = {
  items: MergedGroupBuyOverviewListItem[]
  loading?: boolean
  onItemClick: (item: MergedGroupBuyOverviewListItem) => void
  mergeSameName?: boolean
}

type QuickFilterKey = 'all' | 'highRefund' | 'lowMargin' | 'loss' | 'highRevenue'
type MatrixPointData = {
  value: [number, number, number]
  rawItem: MergedGroupBuyOverviewListItem
  symbolSize: number
  z: number
  itemStyle: {
    color: string
    opacity: number
    borderColor: string
    borderWidth: number
  }
  label: {
    show: boolean
    position: 'top'
    formatter: string
    color: string
    fontSize: number
    backgroundColor: string
    borderRadius: number
    padding: [number, number, number, number]
  }
}

const MATRIX_MIN_SYMBOL_SIZE = 14
const MATRIX_MAX_SYMBOL_SIZE = 38
const MATRIX_ORDER_COUNT_VISUAL_QUANTILE = 0.95

const getProfitPointColor = (item: MergedGroupBuyOverviewListItem) => {
  if (item.totalProfit < 0) {
    return '#EF4444'
  }

  if (item.totalProfit <= 0) {
    return '#F59E0B'
  }

  return '#16A34A'
}

/**
 * 计算分位值。
 * 对订单量做上限截断时使用，避免个别超大团购把其余点都压成接近大小。
 */
const getQuantileValue = (values: number[], quantile: number) => {
  if (!values.length) {
    return 0
  }

  const sortedValues = [...values].sort((a, b) => a - b)
  const index = (sortedValues.length - 1) * quantile
  const lowerIndex = Math.floor(index)
  const upperIndex = Math.ceil(index)

  if (lowerIndex === upperIndex) {
    return sortedValues[lowerIndex]
  }

  const weight = index - lowerIndex

  return sortedValues[lowerIndex] + (sortedValues[upperIndex] - sortedValues[lowerIndex]) * weight
}

/**
 * 为矩阵气泡计算更稳定的视觉尺寸。
 * 这里同时做两件事：
 * 1. 用高分位值作为视觉上限，抑制极大订单量把其余点全部压扁；
 * 2. 用平方根映射代替线性映射，让接近的订单量仍能看出差异，但不会让大点过分膨胀。
 */
const calculateMatrixSymbolSize = (orderCount: number, visualOrderCountCap: number) => {
  if (visualOrderCountCap <= 0) {
    return MATRIX_MIN_SYMBOL_SIZE
  }

  const normalizedValue = Math.min(orderCount, visualOrderCountCap) / visualOrderCountCap
  const scaledValue = Math.sqrt(normalizedValue)

  return Math.round(
    MATRIX_MIN_SYMBOL_SIZE + scaledValue * (MATRIX_MAX_SYMBOL_SIZE - MATRIX_MIN_SYMBOL_SIZE)
  )
}

const matchQuickFilter = (
  item: MergedGroupBuyOverviewListItem,
  quickFilter: QuickFilterKey,
  revenueBenchmark: number
) => {
  switch (quickFilter) {
    case 'highRefund':
      return isHighRefundPressure(item.totalRefundAmount, item.totalRevenue)
    case 'lowMargin':
      return (
        calculateProfitMarginPercent(item.totalRevenue, item.totalProfit) <=
        LOW_PROFIT_MARGIN_PERCENT
      )
    case 'loss':
      return item.totalProfit < 0
    case 'highRevenue':
      return item.totalRevenue >= revenueBenchmark && item.totalRevenue > 0
    case 'all':
    default:
      return true
  }
}

/**
 * 团购盈利矩阵图。
 * 使用当前筛选条件下的全部团购概况结果，在单个图表中表达销售额、利润率、订单量与盈利状态。
 */
const GroupBuyProfitMatrix = ({
  items,
  loading = false,
  onItemClick,
  mergeSameName = true
}: GroupBuyProfitMatrixProps) => {
  const [quickFilter, setQuickFilter] = useState<QuickFilterKey>('all')

  const revenueBenchmark = useMemo(() => {
    if (!items.length) {
      return 0
    }

    const totalRevenue = items.reduce((sum, item) => sum + item.totalRevenue, 0)
    return totalRevenue / items.length
  }, [items])

  const profitMarginBenchmark = useMemo(() => {
    if (!items.length) {
      return 0
    }

    const totalMargin = items.reduce((sum, item) => sum + item.totalProfitMargin, 0)
    return totalMargin / items.length
  }, [items])

  const filteredItems = useMemo(() => {
    return items.filter(item => matchQuickFilter(item, quickFilter, revenueBenchmark))
  }, [items, quickFilter, revenueBenchmark])

  const chartData = useMemo(() => {
    if (!filteredItems.length) {
      return []
    }

    const visualOrderCountCap = Math.max(
      getQuantileValue(
        filteredItems.map(item => item.totalOrderCount),
        MATRIX_ORDER_COUNT_VISUAL_QUANTILE
      ),
      1
    )
    const alwaysShowLabel = filteredItems.length <= 8

    return [...filteredItems]
      .map(item => {
        const symbolSize = calculateMatrixSymbolSize(item.totalOrderCount, visualOrderCountCap)

        return {
          value: [item.totalRevenue, item.totalProfitMargin, item.totalOrderCount],
          rawItem: item,
          symbolSize,
          z: symbolSize,
          itemStyle: {
            color: getProfitPointColor(item),
            opacity: 0.66,
            borderColor: '#FFFFFF',
            borderWidth: 1
          },
          label: {
            show: alwaysShowLabel,
            position: 'top' as const,
            formatter:
              !mergeSameName && item.groupBuyStartDate
                ? `${item.groupBuyName}\n${dayjs(item.groupBuyStartDate).format('MM-DD')}`
                : item.groupBuyName,
            color: '#374151',
            fontSize: 12,
            backgroundColor: 'rgba(255,255,255,0.92)',
            borderRadius: 6,
            padding: [3, 6, 3, 6]
          }
        }
      })
      .sort((a, b) => b.symbolSize - a.symbolSize)
  }, [filteredItems, mergeSameName])

  const quickFilterOptions = useMemo(
    () => [
      {
        value: 'all' as const,
        label: '全部',
        description: '看看全部团购',
        detail: '显示当前范围内的全部团购，方便先整体看一眼。',
        count: items.length
      },
      {
        value: 'highRefund' as const,
        label: '高退款',
        description: '退款影响比较明显',
        detail: '这类团购的退款金额占销售额比例比较高，或者虽然没形成销售额但有退款。',
        count: items.filter(item => matchQuickFilter(item, 'highRefund', revenueBenchmark)).length
      },
      {
        value: 'lowMargin' as const,
        label: '低利润率',
        description: '卖了不少，但赚得偏少',
        detail: `这类团购的利润率不高，当前按不超过 ${LOW_PROFIT_MARGIN_PERCENT}% 判断。`,
        count: items.filter(item => matchQuickFilter(item, 'lowMargin', revenueBenchmark)).length
      },
      {
        value: 'loss' as const,
        label: '亏损',
        description: '整体已经没赚钱',
        detail: '这类团购算下来总利润已经是负数，适合优先排查。',
        count: items.filter(item => matchQuickFilter(item, 'loss', revenueBenchmark)).length
      },
      {
        value: 'highRevenue' as const,
        label: '高销售',
        description: '卖得比平均更好',
        detail: `这类团购的销售额高于当前结果里的平均水平（约 ¥${revenueBenchmark.toFixed(2)}）。`,
        count: items.filter(item => matchQuickFilter(item, 'highRevenue', revenueBenchmark)).length
      }
    ],
    [items, revenueBenchmark]
  )

  const activeQuickFilter = quickFilterOptions.find(option => option.value === quickFilter)

  const option = useMemo<EChartsOption>(() => {
    if (!chartData.length) {
      return {}
    }

    return {
      tooltip: {
        trigger: 'item' as const,
        formatter: (params: CallbackDataParams | CallbackDataParams[]) => {
          const currentParams = Array.isArray(params) ? params[0] : params
          const rawItem = (currentParams.data as MatrixPointData | undefined)?.rawItem

          if (!rawItem) {
            return ''
          }

          return [
            `${rawItem.groupBuyName}（${rawItem.supplierName}）`,
            !mergeSameName && rawItem.groupBuyStartDate
              ? `发起时间：${dayjs(rawItem.groupBuyStartDate).format('YYYY-MM-DD')}`
              : '',
            `销售额：¥${rawItem.totalRevenue.toFixed(2)}`,
            `利润：¥${rawItem.totalProfit.toFixed(2)}`,
            `利润率：${rawItem.totalProfitMargin.toFixed(1)}%`,
            `订单量：${rawItem.totalOrderCount} 单`,
            `退款金额：¥${rawItem.totalRefundAmount.toFixed(2)}`
          ]
            .filter(Boolean)
            .join('<br/>')
        }
      },
      grid: {
        left: '5%',
        right: '12%',
        bottom: '12%',
        top: '16%',
        containLabel: true
      },
      toolbox: {
        right: 0,
        top: 0,
        feature: {
          restore: {
            title: '重置缩放'
          }
        }
      },
      dataZoom: [
        {
          type: 'inside' as const,
          xAxisIndex: 0,
          filterMode: 'none' as const
        },
        {
          type: 'inside' as const,
          yAxisIndex: 0,
          filterMode: 'none' as const
        },
        {
          type: 'slider' as const,
          xAxisIndex: 0,
          height: 18,
          bottom: 10,
          borderColor: 'transparent',
          backgroundColor: '#E2E8F0',
          fillerColor: 'rgba(37, 99, 235, 0.16)',
          moveHandleStyle: {
            color: '#2563EB'
          },
          handleStyle: {
            color: '#2563EB',
            borderColor: '#FFFFFF'
          }
        },
        {
          type: 'slider' as const,
          yAxisIndex: 0,
          width: 18,
          right: 10,
          borderColor: 'transparent',
          backgroundColor: '#E2E8F0',
          fillerColor: 'rgba(22, 163, 74, 0.16)',
          moveHandleStyle: {
            color: '#16A34A'
          },
          handleStyle: {
            color: '#16A34A',
            borderColor: '#FFFFFF'
          }
        }
      ],
      xAxis: {
        type: 'value' as const,
        name: '销售额(元)',
        scale: true
      },
      yAxis: {
        type: 'value' as const,
        name: '利润率(%)',
        scale: true,
        axisLabel: {
          formatter: '{value}%'
        }
      },
      series: [
        {
          name: '团购盈利矩阵',
          type: 'scatter' as const,
          data: chartData,
          emphasis: {
            focus: 'self' as const,
            scale: true,
            itemStyle: {
              opacity: 0.96,
              borderColor: '#0F172A',
              borderWidth: 1,
              shadowBlur: 18,
              shadowColor: 'rgba(15, 23, 42, 0.2)'
            },
            label: {
              show: true
            }
          },
          blur: {
            itemStyle: {
              opacity: 0.14
            },
            label: {
              show: false
            }
          },
          markLine: {
            symbol: 'none' as const,
            silent: true,
            lineStyle: {
              type: 'dashed' as const,
              color: '#94A3B8',
              width: 1.5
            },
            label: {
              color: '#64748B',
              fontSize: 12,
              backgroundColor: 'rgba(255,255,255,0.9)',
              padding: [2, 6, 2, 6],
              borderRadius: 999
            },
            data: [
              {
                xAxis: revenueBenchmark,
                lineStyle: {
                  type: 'dashed',
                  color: '#2563EB',
                  width: 1.5
                },
                label: {
                  color: '#2563EB',
                  borderColor: '#BFDBFE',
                  formatter: `平均销售额 ¥${revenueBenchmark.toFixed(2)}`
                }
              },
              {
                yAxis: profitMarginBenchmark,
                lineStyle: {
                  type: 'dashed',
                  color: '#16A34A',
                  width: 1.5
                },
                label: {
                  color: '#16A34A',
                  borderColor: '#BBF7D0',
                  formatter: `平均利润率 ${profitMarginBenchmark.toFixed(2)}%`
                }
              }
            ]
          }
        }
      ]
    }
  }, [chartData, mergeSameName, profitMarginBenchmark, revenueBenchmark])

  return (
    <Card
      size="small"
      loading={loading}
      title={
        <div className="flex items-center gap-2">
          <DotChartOutlined className="text-blue-500" />
          <span className="text-lg font-medium">盈利矩阵视图</span>
        </div>
      }
      extra={<span className="text-sm text-gray-500">基于当前筛选条件的全部结果</span>}
    >
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <Tag color="blue">X 轴：销售额</Tag>
          <Tag color="green">Y 轴：利润率</Tag>
          <Tag color="purple">气泡大小：订单量</Tag>
          <Tag color="default">虚线：当前筛选结果平均值</Tag>
          <Tag color="cyan">支持缩放查看密集区域</Tag>
        </div>
      </div>

      <div className="mb-4 rounded-xl border border-blue-100 bg-gradient-to-r from-blue-50 to-indigo-50 p-3">
        <div className="mb-3 flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-sm font-semibold text-gray-800">快速聚焦</div>
            <div className="text-sm text-gray-500">
              点一下就能只看某一类团购，不会改动上方搜索条件。
            </div>
          </div>
          <div className="text-sm text-gray-500">当前：{activeQuickFilter?.label}</div>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
          {quickFilterOptions.map(option => {
            const active = option.value === quickFilter

            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setQuickFilter(option.value)}
                className={`w-full rounded-xl border p-4 text-left transition-all ${
                  active
                    ? 'border-blue-500 bg-white shadow-md ring-2 ring-blue-100'
                    : 'border-white/70 bg-white/70 hover:border-blue-200 hover:bg-white hover:shadow-sm'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-base font-semibold text-gray-800">{option.label}</div>
                    <div className="mt-1 text-sm text-gray-500">{option.description}</div>
                  </div>
                  <div
                    className={`rounded-full px-2 py-1 text-xs font-medium ${
                      active ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-500'
                    } shrink-0 whitespace-nowrap`}
                  >
                    {option.count} 条
                  </div>
                </div>
              </button>
            )
          })}
        </div>

        {activeQuickFilter && (
          <div className="mt-3 rounded-lg bg-white/80 px-3 py-2 text-sm text-gray-600">
            {activeQuickFilter.detail}
          </div>
        )}
      </div>

      <div className="mb-3 text-sm text-gray-500">
        {!mergeSameName && '单期模式下，同名团购通过发起日期区分；'}
        点击点位后进入同名团购聚合统计详情，滚轮或拖动滑块可放大密集区域，右上角可重置缩放。
      </div>

      {filteredItems.length > 0 ? (
        <FullscreenChart
          title="团购盈利矩阵"
          option={option}
          height="500px"
          onChartClick={params => {
            const payload = (params.data as MatrixPointData | undefined)?.rawItem
            if (payload) {
              onItemClick(payload)
            }
          }}
        />
      ) : (
        <div className="flex items-center justify-center py-10">
          <Empty
            description="当前筛选条件下暂无可展示的团购"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        </div>
      )}
    </Card>
  )
}

export default GroupBuyProfitMatrix
