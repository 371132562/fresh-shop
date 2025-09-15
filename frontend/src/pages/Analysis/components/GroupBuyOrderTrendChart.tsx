import { Card, Checkbox } from 'antd'
import type { AnalysisCountResult } from 'fresh-shop-backend/types/dto'
import { useMemo, useState } from 'react'

import { FullscreenChart } from '@/components/FullscreenChart'
import useAnalysisStore from '@/stores/analysisStore'
import dayjs from '@/utils/day'

export const GroupBuyOrderTrendChart = () => {
  const getCountLoading = useAnalysisStore(state => state.getCountLoading)
  const groupBuyTrend = useAnalysisStore(state => state.count.groupBuyTrend)
  const orderTrend = useAnalysisStore(state => state.count.orderTrend)
  const cumulativeGroupBuyTrend = useAnalysisStore(state => state.count.cumulativeGroupBuyTrend)
  const cumulativeOrderTrend = useAnalysisStore(state => state.count.cumulativeOrderTrend)
  const isAllData = useAnalysisStore(state => state.isAllData)
  const [showCumulative, setShowCumulative] = useState(false)

  const option = useMemo(() => {
    const usingGroupBuyTrend = isAllData && showCumulative ? cumulativeGroupBuyTrend : groupBuyTrend
    const usingOrderTrend = isAllData && showCumulative ? cumulativeOrderTrend : orderTrend
    const safeGroupBuyTrend = usingGroupBuyTrend || []
    const safeOrderTrend = usingOrderTrend || []

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
        left: '2%',
        right: '2%',
        bottom: '0%',
        top: '12%',
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
  }, [
    groupBuyTrend,
    orderTrend,
    cumulativeGroupBuyTrend,
    cumulativeOrderTrend,
    isAllData,
    showCumulative
  ])

  return (
    <Card
      loading={getCountLoading}
      title="团购单和订单趋势"
      extra={
        isAllData ? (
          <Checkbox
            checked={showCumulative}
            onChange={e => setShowCumulative(e.target.checked)}
          >
            累计趋势
          </Checkbox>
        ) : null
      }
    >
      <FullscreenChart
        title="团购单和订单趋势"
        option={option}
        height="300px"
      />
    </Card>
  )
}
