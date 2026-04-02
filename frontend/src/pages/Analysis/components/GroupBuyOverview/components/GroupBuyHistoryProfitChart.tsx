import { BarChartOutlined } from '@ant-design/icons'
import { Card, Empty } from 'antd'
import type { EChartsOption, TooltipComponentFormatterCallbackParams } from 'echarts'
import type { GroupBuyLaunchHistory } from 'fresh-shop-backend/types/dto'
import { useMemo } from 'react'

import { FullscreenChart } from '@/components/FullscreenChart'
import dayjs from '@/utils/day'
import { calculateProfitMarginPercent } from '@/utils/profitability'

type GroupBuyHistoryProfitChartProps = {
  groupBuyHistory: GroupBuyLaunchHistory[]
  sensitive?: boolean
}

type TooltipParams = TooltipComponentFormatterCallbackParams

/**
 * 团购历史盈利趋势图。
 * 通过“销售额 + 退款金额 + 利润率”组合表达每一期的盈利表现与退款压力。
 */
const GroupBuyHistoryProfitChart = ({
  groupBuyHistory,
  sensitive = false
}: GroupBuyHistoryProfitChartProps) => {
  const sortedHistory = useMemo(() => {
    return [...(groupBuyHistory || [])].sort(
      (a, b) => new Date(a.launchDate).getTime() - new Date(b.launchDate).getTime()
    )
  }, [groupBuyHistory])

  const option = useMemo<EChartsOption>(() => {
    if (sortedHistory.length === 0) {
      return {}
    }

    const dates = sortedHistory.map(item => dayjs(item.launchDate).format('YYYY-MM-DD'))
    const revenueData = sortedHistory.map(item => item.revenue)
    const refundData = sortedHistory.map(item => item.totalRefundAmount || 0)
    const profitMarginData = sortedHistory.map(item =>
      calculateProfitMarginPercent(item.revenue, item.profit)
    )

    return {
      tooltip: {
        trigger: 'axis' as const,
        axisPointer: {
          type: 'shadow' as const,
          shadowStyle: {
            color: 'rgba(150,150,150,0.15)'
          }
        },
        formatter: (params: TooltipParams) => {
          const currentParams = Array.isArray(params) ? params[0] : params
          const index = currentParams?.dataIndex ?? 0
          const item = sortedHistory[index]
          const margin = calculateProfitMarginPercent(item.revenue, item.profit)

          return [
            `${dayjs(item.launchDate).format('YYYY-MM-DD')} ${item.groupBuyName}`,
            `销售额：¥${item.revenue.toFixed(2)}`,
            `退款金额：¥${(item.totalRefundAmount || 0).toFixed(2)}`,
            !sensitive ? `利润率：${margin.toFixed(1)}%` : ''
          ]
            .filter(Boolean)
            .join('<br/>')
        }
      },
      legend: {
        top: 0,
        data: sensitive ? ['销售额', '退款金额'] : ['销售额', '退款金额', '利润率']
      },
      grid: {
        left: '3%',
        right: sensitive ? '3%' : '8%',
        bottom: '14%',
        top: '16%',
        containLabel: true
      },
      dataZoom: [
        {
          type: 'inside' as const,
          xAxisIndex: 0,
          filterMode: 'none' as const
        },
        {
          type: 'slider' as const,
          xAxisIndex: 0,
          height: 18,
          bottom: 10,
          borderColor: 'transparent',
          backgroundColor: '#E2E8F0',
          fillerColor: 'rgba(99, 102, 241, 0.16)',
          moveHandleStyle: {
            color: '#4F46E5'
          },
          handleStyle: {
            color: '#4F46E5',
            borderColor: '#FFFFFF'
          }
        }
      ],
      xAxis: {
        type: 'category' as const,
        data: dates,
        axisLabel: {
          rotate: dates.length > 5 ? 30 : 0
        }
      },
      yAxis: sensitive
        ? [
            {
              type: 'value' as const,
              name: '金额(元)'
            }
          ]
        : [
            {
              type: 'value' as const,
              name: '金额(元)'
            },
            {
              type: 'value' as const,
              name: '利润率(%)',
              axisLabel: {
                formatter: '{value}%'
              }
            }
          ],
      series: [
        {
          name: '销售额',
          type: 'bar' as const,
          data: revenueData,
          barMaxWidth: 28,
          itemStyle: {
            color: '#60A5FA'
          }
        },
        {
          name: '退款金额',
          type: 'bar' as const,
          data: refundData,
          barMaxWidth: 28,
          itemStyle: {
            color: '#FB923C'
          }
        },
        ...(!sensitive
          ? [
              {
                name: '利润率',
                type: 'line' as const,
                yAxisIndex: 1,
                smooth: true,
                data: profitMarginData,
                itemStyle: {
                  color: '#16A34A'
                }
              }
            ]
          : [])
      ]
    }
  }, [sensitive, sortedHistory])

  if (sortedHistory.length === 0) {
    return (
      <Card
        size="small"
        title={
          <div className="flex items-center gap-2">
            <BarChartOutlined className="text-indigo-500" />
            <span className="text-base font-medium">历史盈利趋势</span>
          </div>
        }
      >
        <div className="flex items-center justify-center py-8">
          <Empty
            description="暂无历史趋势数据"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        </div>
      </Card>
    )
  }

  return (
    <Card
      size="small"
      title={
        <div className="flex items-center gap-2">
          <BarChartOutlined className="text-indigo-500" />
          <span className="text-base font-medium">历史盈利趋势</span>
        </div>
      }
      extra={
        <span className="text-sm text-gray-500">
          {sensitive ? '销售额与退款金额' : '销售额、退款金额、利润率'}
        </span>
      }
    >
      <FullscreenChart
        title="历史盈利趋势"
        option={option}
        height="400px"
      />
    </Card>
  )
}

export default GroupBuyHistoryProfitChart
