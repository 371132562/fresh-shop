import { Card, Checkbox } from 'antd'
import type { AnalysisCountResult } from 'fresh-shop-backend/types/dto'
import { useMemo } from 'react'

import { FullscreenChart } from '@/components/FullscreenChart'
import useAnalysisStore from '@/stores/analysisStore'
import dayjs from '@/utils/day'

export const GroupBuyOrderTrendChart = () => {
  const getCountLoading = useAnalysisStore(state => state.getCountLoading)
  const groupBuyTrend = useAnalysisStore(state => state.count.groupBuyTrend)
  const orderTrend = useAnalysisStore(state => state.count.orderTrend)
  const cumulativeGroupBuyTrend = useAnalysisStore(state => state.count.cumulativeGroupBuyTrend)
  const cumulativeOrderTrend = useAnalysisStore(state => state.count.cumulativeOrderTrend)
  const monthlyGroupBuyTrend = useAnalysisStore(state => state.count.monthlyGroupBuyTrend)
  const monthlyOrderTrend = useAnalysisStore(state => state.count.monthlyOrderTrend)
  const isAllData = useAnalysisStore(state => state.isAllData)
  const showCumulative = useAnalysisStore(state => state.showCumulative)
  const showMonthly = useAnalysisStore(state => state.showMonthly)
  const setShowCumulative = useAnalysisStore(state => state.setShowCumulative)
  const setShowMonthly = useAnalysisStore(state => state.setShowMonthly)

  const option = useMemo(() => {
    let usingGroupBuyTrend, usingOrderTrend

    if (isAllData && showMonthly) {
      usingGroupBuyTrend = monthlyGroupBuyTrend
      usingOrderTrend = monthlyOrderTrend
    } else if (showCumulative) {
      usingGroupBuyTrend = cumulativeGroupBuyTrend
      usingOrderTrend = cumulativeOrderTrend
    } else {
      usingGroupBuyTrend = groupBuyTrend
      usingOrderTrend = orderTrend
    }

    const safeGroupBuyTrend = usingGroupBuyTrend || []
    const safeOrderTrend = usingOrderTrend || []

    const dateFormat = isAllData && showMonthly ? 'YYYY-MM' : 'MM-DD'
    const dates = safeGroupBuyTrend.map((item: AnalysisCountResult['groupBuyTrend'][number]) =>
      dayjs(item.date).format(dateFormat)
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
    monthlyGroupBuyTrend,
    monthlyOrderTrend,
    isAllData,
    showCumulative,
    showMonthly
  ])

  return (
    <Card
      loading={getCountLoading}
      title="团购单和订单趋势"
      extra={
        <div className="flex gap-2">
          {isAllData && (
            <Checkbox
              checked={showMonthly}
              onChange={e => {
                setShowMonthly(e.target.checked)
                if (e.target.checked) {
                  setShowCumulative(false)
                }
              }}
            >
              按月统计
            </Checkbox>
          )}
          <Checkbox
            checked={showCumulative}
            onChange={e => {
              setShowCumulative(e.target.checked)
              if (e.target.checked) {
                setShowMonthly(false)
              }
            }}
          >
            累计趋势
          </Checkbox>
        </div>
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
