import { Card, Checkbox } from 'antd'
import dayjs from 'dayjs'
import type { AnalysisCountResult } from 'fresh-shop-backend/types/dto'
import { useMemo, useState } from 'react'

import { FullscreenChart } from '@/components/FullscreenChart'
import useAnalysisStore from '@/stores/analysisStore'
import useGlobalSettingStore from '@/stores/globalSettingStore'

export const PriceProfitTrendChart = () => {
  const getCountLoading = useAnalysisStore(state => state.getCountLoading)
  const priceTrend = useAnalysisStore(state => state.count.priceTrend)
  const profitTrend = useAnalysisStore(state => state.count.profitTrend)
  const cumulativePriceTrend = useAnalysisStore(state => state.count.cumulativePriceTrend)
  const cumulativeProfitTrend = useAnalysisStore(state => state.count.cumulativeProfitTrend)
  const sensitive = useGlobalSettingStore(state => state.globalSetting?.value?.sensitive)
  const isAllData = useAnalysisStore(state => state.isAllData)
  const [showCumulative, setShowCumulative] = useState(false)

  const option = useMemo(() => {
    const usingPriceTrend = isAllData && showCumulative ? cumulativePriceTrend : priceTrend
    const usingProfitTrend = isAllData && showCumulative ? cumulativeProfitTrend : profitTrend
    const safePriceTrend = usingPriceTrend || []
    const safeProfitTrend = usingProfitTrend || []

    const dates = safePriceTrend.map((item: AnalysisCountResult['priceTrend'][number]) =>
      dayjs(item.date).format('MM-DD')
    )
    const priceCounts = safePriceTrend.map(
      (item: AnalysisCountResult['priceTrend'][number]) => item.count
    )
    const profitCounts = safeProfitTrend.map(
      (item: AnalysisCountResult['profitTrend'][number]) => item.count
    )

    const series = [
      {
        name: '销售额',
        type: 'line' as const,
        data: priceCounts,
        smooth: true,
        itemStyle: { color: '#0fb82c' }
      }
    ]
    if (!sensitive) {
      series.push({
        name: '利润',
        type: 'line' as const,
        data: profitCounts,
        smooth: true,
        itemStyle: { color: '#EE6666' }
      })
    }

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
        data: ['销售额', sensitive ? '' : '利润']
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
      series
    }
  }, [
    priceTrend,
    profitTrend,
    cumulativePriceTrend,
    cumulativeProfitTrend,
    sensitive,
    isAllData,
    showCumulative
  ])

  return (
    <Card
      loading={getCountLoading}
      title="销售额和利润趋势"
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
        title="销售额和利润趋势"
        option={option}
        height="300px"
      />
    </Card>
  )
}
