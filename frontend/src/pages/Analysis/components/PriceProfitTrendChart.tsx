import { Card } from 'antd'
import dayjs from 'dayjs'
import * as echarts from 'echarts'
import type { AnalysisCountResult } from 'fresh-shop-backend/types/dto'
import { useEffect, useRef } from 'react'

import useAnalysisStore from '@/stores/analysisStore'
import useGlobalSettingStore from '@/stores/globalSettingStore'

export const PriceProfitTrendChart = () => {
  const priceProfitChartRef = useRef<HTMLDivElement>(null)
  const getCountLoading = useAnalysisStore(state => state.getCountLoading)
  const priceTrend = useAnalysisStore(state => state.count.priceTrend)
  const profitTrend = useAnalysisStore(state => state.count.profitTrend)
  const sensitive = useGlobalSettingStore(state => state.globalSetting?.value?.sensitive)

  useEffect(() => {
    if (priceProfitChartRef.current) {
      const chartInstance = echarts.init(priceProfitChartRef.current)

      const safePriceTrend = priceTrend || []
      const safeProfitTrend = profitTrend || []

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
          type: 'line',
          data: priceCounts,
          smooth: true,
          itemStyle: { color: '#0fb82c' }
        }
      ]
      if (!sensitive) {
        series.push({
          name: '利润',
          type: 'line',
          data: profitCounts,
          smooth: true,
          itemStyle: { color: '#EE6666' }
        })
      }

      const option = {
        tooltip: {
          trigger: 'axis',
          axisPointer: {
            // 轴指示器配置
            type: 'shadow',
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
          type: 'category',
          boundaryGap: false,
          data: dates
        },
        yAxis: {
          type: 'value'
        },
        series
      }

      chartInstance.setOption(option)

      const resizeObserver = new ResizeObserver(() => {
        chartInstance.resize()
      })
      resizeObserver.observe(priceProfitChartRef.current)

      return () => {
        chartInstance.dispose()
        resizeObserver.disconnect()
      }
    }
  }, [priceTrend, profitTrend, sensitive])

  return (
    <Card
      size="small"
      loading={getCountLoading}
      title="销售额和利润趋势"
    >
      <div
        ref={priceProfitChartRef}
        style={{ width: '100%', height: '300px' }}
      ></div>
    </Card>
  )
}
