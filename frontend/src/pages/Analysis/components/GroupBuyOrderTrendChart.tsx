import { Card } from 'antd'
import dayjs from 'dayjs'
import * as echarts from 'echarts'
import type { AnalysisCountResult } from 'fresh-shop-backend/types/dto'
import { useEffect, useRef } from 'react'

interface GroupBuyOrderTrendChartProps {
  groupBuyTrend: AnalysisCountResult['groupBuyTrend']
  orderTrend: AnalysisCountResult['orderTrend']
  loading: boolean
}

export const GroupBuyOrderTrendChart = ({
  groupBuyTrend,
  orderTrend,
  loading
}: GroupBuyOrderTrendChartProps) => {
  const chartRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (chartRef.current) {
      const chartInstance = echarts.init(chartRef.current)

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
          data: ['团购单', '订单']
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
        series: [
          {
            name: '团购单',
            type: 'line',
            data: groupBuyCounts,
            smooth: true,
            itemStyle: { color: '#5470C6' } // 蓝色
          },
          {
            name: '订单',
            type: 'line',
            data: orderCounts,
            smooth: true,
            itemStyle: { color: '#91CC75' } // 绿色
          }
        ]
      }

      chartInstance.setOption(option)

      const resizeObserver = new ResizeObserver(() => {
        chartInstance.resize()
      })
      resizeObserver.observe(chartRef.current)

      return () => {
        chartInstance.dispose()
        resizeObserver.disconnect()
      }
    }
  }, [groupBuyTrend, orderTrend])

  return (
    <Card
      loading={loading}
      title="团购单和订单趋势"
    >
      <div
        ref={chartRef}
        style={{ width: '100%', height: '300px' }}
      ></div>
    </Card>
  )
}
