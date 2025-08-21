import { Card } from 'antd'
import * as echarts from 'echarts'
import { useEffect, useRef } from 'react'

type RegionalSalesChartProps = {
  data: Array<{
    addressId: string
    addressName: string
    customerCount: number
  }>
  loading?: boolean
  onRegionalClick?: (addressId: string, addressName: string) => void
}

/**
 * 地域销售分析柱状图组件
 * 展示不同地区的客户数量分布
 */
const RegionalSalesChart: React.FC<RegionalSalesChartProps> = ({
  data,
  loading,
  onRegionalClick
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

      // 提取地址名称和客户数量
      const addressNames = data.map(item => item.addressName || '未知地址')
      const customerCounts = data.map(item => item.customerCount)

      const option = {
        tooltip: {
          trigger: 'axis',
          axisPointer: {
            type: 'shadow',
            shadowStyle: {
              color: 'rgba(150,150,150,0.15)'
            }
          },
          formatter: (params: any) => {
            const dataIndex = params[0].dataIndex
            const item = data[dataIndex]
            return `${item.addressName || '未知地址'}<br/>客户数量: ${item.customerCount}人`
          }
        },
        grid: {
          left: '5%',
          right: '2%',
          bottom: '0%',
          top: '13%',
          containLabel: true
        },
        xAxis: {
          type: 'category',
          data: addressNames,
          axisLabel: {
            interval: 0,
            rotate: addressNames.length > 5 ? 45 : 0,
            fontSize: 12
          }
        },
        yAxis: {
          type: 'value',
          name: '客户数量(人)',
          nameTextStyle: {
            fontSize: 12
          }
        },
        series: [
          {
            name: '客户数量',
            type: 'bar',
            data: customerCounts.map((count, index) => ({
              value: count,
              itemStyle: {
                color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                  { offset: 0, color: '#83bff6' },
                  { offset: 0.5, color: '#188df0' },
                  { offset: 1, color: '#188df0' }
                ])
              },
              // 存储原始数据用于点击事件
              addressId: data[index].addressId,
              addressName: data[index].addressName
            })),
            barWidth: '60%',
            label: {
              show: true,
              position: 'top',
              formatter: '{c}人',
              fontSize: 12,
              fontWeight: 'bold',
              color: '#333'
            },
            emphasis: {
              itemStyle: {
                color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                  { offset: 0, color: '#2378f7' },
                  { offset: 0.7, color: '#2378f7' },
                  { offset: 1, color: '#83bff6' }
                ])
              }
            }
          }
        ]
      }

      chartInstance.setOption(option)

      // 初始绑定点击事件，避免首次渲染时遗漏
      if (onRegionalClick) {
        chartInstance.off('click')
        chartInstance.on('click', (params: any) => {
          if (params.data && params.data.addressId) {
            onRegionalClick(params.data.addressId, params.data.addressName)
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
  }, [data]) // 移除 onRegionalClick 依赖

  // 单独处理点击事件，避免因回调函数变化导致重新渲染
  useEffect(() => {
    if (chartInstanceRef.current && onRegionalClick) {
      // 清除之前的点击事件
      chartInstanceRef.current.off('click')

      // 添加新的点击事件
      chartInstanceRef.current.on('click', (params: any) => {
        if (params.data && params.data.addressId) {
          onRegionalClick(params.data.addressId, params.data.addressName)
        }
      })
    }
  }, [onRegionalClick, data])

  return (
    <Card
      size="small"
      loading={loading}
      title="地域销售分布图"
      className="h-80"
    >
      <div
        ref={chartRef}
        style={{ width: '100%', height: '250px' }}
      />
    </Card>
  )
}

export default RegionalSalesChart
