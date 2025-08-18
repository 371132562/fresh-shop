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

  useEffect(() => {
    if (chartRef.current && data && data.length > 0) {
      const chartInstance = echarts.init(chartRef.current)

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

      // 添加点击事件
      if (onRegionalClick) {
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
        resizeObserver.disconnect()
      }
    }
  }, [data, onRegionalClick])

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
