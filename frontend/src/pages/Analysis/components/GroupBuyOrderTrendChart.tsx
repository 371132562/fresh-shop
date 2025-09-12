import { Card } from 'antd'
import dayjs from 'dayjs'
import type { AnalysisCountResult } from 'fresh-shop-backend/types/dto'
import { useMemo } from 'react'

import { FullscreenChart } from '@/components/FullscreenChart'
import useAnalysisStore from '@/stores/analysisStore'

export const GroupBuyOrderTrendChart = () => {
  const getCountLoading = useAnalysisStore(state => state.getCountLoading)
  const groupBuyTrend = useAnalysisStore(state => state.count.groupBuyTrend)
  const orderTrend = useAnalysisStore(state => state.count.orderTrend)

  const option = useMemo(() => {
    const safeGroupBuyTrend = groupBuyTrend || []
    const safeOrderTrend = orderTrend || []

    const dates = safeGroupBuyTrend.map((item: AnalysisCountResult['groupBuyTrend'][number]) =>
      dayjs(item.date).format('MM-DD')
    )
    const groupBuyCounts = safeGroupBuyTrend.map(
      (item: AnalysisCountResult['groupBuyTrend'][number]) => item.count
    )
    const orderCounts = safeOrderTrend.map(
      (item: AnalysisCountResult['orderTrend'][number]) => item.count
    )

    return {
      tooltip: {
        trigger: 'axis' as const,
        axisPointer: {
          // 轴指示器配置
          type: 'shadow' as const,
          shadowStyle: {
            color: 'rgba(150,150,150,0.15)' // 阴影颜色
          }
        }
      },
      legend: {
        data: ['团购单', '订单']
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        containLabel: true
      },
      xAxis: {
        type: 'category' as const,
        boundaryGap: false,
        data: dates
      },
      yAxis: {
        type: 'value' as const
      },
      series: [
        {
          name: '团购单',
          type: 'line' as const,
          data: groupBuyCounts,
          smooth: true,
          itemStyle: { color: '#5470C6' } // 蓝色
        },
        {
          name: '订单',
          type: 'line' as const,
          data: orderCounts,
          smooth: true,
          itemStyle: { color: '#91CC75' } // 绿色
        }
      ]
    }
  }, [groupBuyTrend, orderTrend])

  return (
    <Card
      size="small"
      loading={getCountLoading}
      title="团购单和订单趋势"
    >
      <FullscreenChart
        title="团购单和订单趋势"
        option={option}
        height="300px"
      />
    </Card>
  )
}
