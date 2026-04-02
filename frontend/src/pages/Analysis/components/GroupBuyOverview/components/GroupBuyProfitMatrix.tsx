import { DotChartOutlined } from '@ant-design/icons'
import { Card, Empty, Tag } from 'antd'
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

  const option = useMemo(() => {
    if (!filteredItems.length) {
      return {}
    }

    const maxOrderCount = Math.max(...filteredItems.map(item => item.totalOrderCount), 1)

    return {
      tooltip: {
        trigger: 'item' as const,
        formatter: (params: { data?: { rawItem?: MergedGroupBuyOverviewListItem } }) => {
          const rawItem = params.data?.rawItem

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
        bottom: '4%',
        top: '16%',
        containLabel: true
      },
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
          data: filteredItems.map(item => ({
            value: [item.totalRevenue, item.totalProfitMargin, item.totalOrderCount],
            rawItem: item,
            symbolSize: Math.max(18, Math.round((item.totalOrderCount / maxOrderCount) * 42)),
            itemStyle: {
              color:
                item.totalProfit < 0 ? '#EF4444' : item.totalProfit <= 0 ? '#F59E0B' : '#16A34A'
            },
            label: {
              show: filteredItems.length <= 8,
              position: 'top',
              formatter:
                !mergeSameName && item.groupBuyStartDate
                  ? `${item.groupBuyName}\n${dayjs(item.groupBuyStartDate).format('MM-DD')}`
                  : item.groupBuyName,
              color: '#374151',
              fontSize: 12
            }
          })),
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
  }, [filteredItems, mergeSameName, profitMarginBenchmark, revenueBenchmark])

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
        点击点位后进入同名团购聚合统计详情。
      </div>

      {filteredItems.length > 0 ? (
        <FullscreenChart
          title="团购盈利矩阵"
          option={option}
          height="420px"
          onChartClick={params => {
            const payload = (params as { data?: { rawItem?: MergedGroupBuyOverviewListItem } }).data
            if (payload?.rawItem) {
              onItemClick(payload.rawItem)
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
