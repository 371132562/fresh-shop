import { Card } from 'antd'
import * as echarts from 'echarts'
import { useEffect, useRef } from 'react'

type PurchaseFrequencyChartProps = {
  data: Array<{
    frequency: number
    count: number
  }>
  loading?: boolean
  onFrequencyClick?: (frequency: number) => void
}

/**
 * 客户购买次数分布饼图组件
 * 展示不同购买次数的客户分布情况
 */
const PurchaseFrequencyChart: React.FC<PurchaseFrequencyChartProps> = ({
  data,
  loading,
  onFrequencyClick
}) => {
  const chartRef = useRef<HTMLDivElement>(null)

  const chartInstanceRef = useRef<echarts.ECharts | null>(null)

  useEffect(() => {
    if (chartRef.current && data && data.length > 0) {
      // 如果已经存在实例，先销毁
      if (chartInstanceRef.current) {
        chartInstanceRef.current.dispose()
      }

      const chartInstance = echarts.init(chartRef.current)
      chartInstanceRef.current = chartInstance

      // 转换数据格式为echarts需要的格式
      const chartData = data.map(item => ({
        name: `${item.frequency}次`,
        value: item.count,
        frequency: item.frequency
      }))

      const option = {
        tooltip: {
          trigger: 'item',
          formatter: '{a} <br/>{b}: {c}人 ({d}%)'
        },
        legend: {
          orient: 'vertical',
          left: 'left',
          data: chartData.map(item => item.name)
        },
        series: [
          {
            name: '购买次数分布',
            type: 'pie',
            radius: ['40%', '70%'],
            center: ['60%', '50%'],
            avoidLabelOverlap: false,
            itemStyle: {
              borderRadius: 10,
              borderColor: '#fff',
              borderWidth: 2
            },
            label: {
              show: true,
              position: 'outside',
              formatter: '{b}: {c}人\n({d}%)',
              fontSize: 12,
              fontWeight: 'bold'
            },
            emphasis: {
              label: {
                show: true,
                fontSize: 14,
                fontWeight: 'bold',
                formatter: '{b}: {c}人\n({d}%)'
              }
            },
            labelLine: {
              show: false
            },
            data: chartData
          }
        ],
        // 配置颜色
        color: [
          '#5470C6',
          '#91CC75',
          '#FAC858',
          '#EE6666',
          '#73C0DE',
          '#3BA272',
          '#FC8452',
          '#9A60B4'
        ]
      }

      chartInstance.setOption(option)

      // 初始绑定点击事件，避免首次渲染时遗漏
      if (onFrequencyClick) {
        chartInstance.off('click')
        chartInstance.on('click', (params: any) => {
          if (params.data && params.data.frequency) {
            onFrequencyClick(params.data.frequency)
          }
        })
      }

      // 监听容器大小变化
      const resizeObserver = new ResizeObserver(() => {
        chartInstance.resize()
      })
      resizeObserver.observe(chartRef.current)

      return () => {
        chartInstance.dispose()
        chartInstanceRef.current = null
        resizeObserver.disconnect()
      }
    }
  }, [data]) // 移除 onFrequencyClick 依赖

  // 单独处理点击事件，避免因回调函数变化导致重新渲染
  useEffect(() => {
    if (chartInstanceRef.current && onFrequencyClick) {
      // 清除之前的点击事件
      chartInstanceRef.current.off('click')

      // 添加新的点击事件
      chartInstanceRef.current.on('click', (params: any) => {
        if (params.data && params.data.frequency) {
          onFrequencyClick(params.data.frequency)
        }
      })
    }
  }, [onFrequencyClick, data])

  return (
    <Card
      size="small"
      loading={loading}
      title="购买次数分布图"
      className="h-80"
    >
      <div
        ref={chartRef}
        style={{ width: '100%', height: '250px' }}
      />
    </Card>
  )
}

export default PurchaseFrequencyChart
