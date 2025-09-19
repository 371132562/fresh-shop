import { Card, Checkbox } from 'antd'
import type { AnalysisCountResult } from 'fresh-shop-backend/types/dto'
import { useMemo } from 'react'

import { FullscreenChart } from '@/components/FullscreenChart'
import useAnalysisStore from '@/stores/analysisStore'
import useGlobalSettingStore from '@/stores/globalSettingStore'
import dayjs from '@/utils/day'

export const PriceProfitTrendChart = () => {
  const getCountLoading = useAnalysisStore(state => state.getCountLoading)
  const priceTrend = useAnalysisStore(state => state.count.priceTrend)
  const profitTrend = useAnalysisStore(state => state.count.profitTrend)
  const cumulativePriceTrend = useAnalysisStore(state => state.count.cumulativePriceTrend)
  const cumulativeProfitTrend = useAnalysisStore(state => state.count.cumulativeProfitTrend)
  const monthlyPriceTrend = useAnalysisStore(state => state.count.monthlyPriceTrend)
  const monthlyProfitTrend = useAnalysisStore(state => state.count.monthlyProfitTrend)
  const sensitive = useGlobalSettingStore(state => state.globalSetting?.value?.sensitive)
  const isAllData = useAnalysisStore(state => state.isAllData)
  const showCumulative = useAnalysisStore(state => state.showCumulative)
  const showMonthly = useAnalysisStore(state => state.showMonthly)
  const setShowCumulative = useAnalysisStore(state => state.setShowCumulative)
  const setShowMonthly = useAnalysisStore(state => state.setShowMonthly)

  const option = useMemo(() => {
    let usingPriceTrend, usingProfitTrend

    if (isAllData && showMonthly) {
      usingPriceTrend = monthlyPriceTrend
      usingProfitTrend = monthlyProfitTrend
    } else if (showCumulative) {
      usingPriceTrend = cumulativePriceTrend
      usingProfitTrend = cumulativeProfitTrend
    } else {
      usingPriceTrend = priceTrend
      usingProfitTrend = profitTrend
    }

    const safePriceTrend = usingPriceTrend || []
    const safeProfitTrend = usingProfitTrend || []

    const dateFormat = isAllData && showMonthly ? 'YYYY-MM' : 'MM-DD'
    const dates = safePriceTrend.map((item: AnalysisCountResult['priceTrend'][number]) =>
      dayjs(item.date).format(dateFormat)
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
      series
    }
  }, [
    priceTrend,
    profitTrend,
    cumulativePriceTrend,
    cumulativeProfitTrend,
    monthlyPriceTrend,
    monthlyProfitTrend,
    sensitive,
    isAllData,
    showCumulative,
    showMonthly
  ])

  return (
    <Card
      loading={getCountLoading}
      title={sensitive ? '销售额趋势' : '销售额和利润趋势'}
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
        title={sensitive ? '销售额趋势' : '销售额和利润趋势'}
        option={option}
        height="300px"
      />
    </Card>
  )
}
