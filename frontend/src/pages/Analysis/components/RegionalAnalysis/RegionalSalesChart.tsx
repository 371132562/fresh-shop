import { Card } from 'antd'
import * as echarts from 'echarts'
import { useMemo } from 'react'

import { FullscreenChart } from '@/components/FullscreenChart'

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
 * 客户地址分布柱状图组件
 * 展示不同地区的客户量分布
 */
const RegionalSalesChart: React.FC<RegionalSalesChartProps> = ({
  data,
  loading,
  onRegionalClick
}) => {
  const option = useMemo(() => {
    if (!data || data.length === 0) return {}

    // 提取地址名称和客户量
    const addressNames = data.map(item => item.addressName || '未知地址')
    const customerCounts = data.map(item => item.customerCount)

    return {
      tooltip: {
        trigger: 'axis' as const,
        axisPointer: {
          type: 'shadow' as const,
          shadowStyle: {
            color: 'rgba(150,150,150,0.15)'
          }
        },
        formatter: (params: unknown) => {
          type AxisPoint = { dataIndex: number }
          const arr = Array.isArray(params) ? (params as AxisPoint[]) : []
          const dataIndex = arr[0]?.dataIndex ?? 0
          const item = data[dataIndex] ?? { addressName: '未知地址', customerCount: 0 }
          return `${item.addressName || '未知地址'}<br/>客户量: ${item.customerCount}人`
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
        type: 'category' as const,
        data: addressNames,
        axisLabel: {
          interval: 0,
          rotate: addressNames.length > 5 ? 45 : 0,
          fontSize: 12
        }
      },
      yAxis: {
        type: 'value' as const,
        name: '客户量(人)',
        nameTextStyle: {
          fontSize: 12
        }
      },
      series: [
        {
          name: '客户量',
          type: 'bar' as const,
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
            position: 'top' as const,
            formatter: '{c}人',
            fontSize: 12,
            fontWeight: 'bold' as const,
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
  }, [data])

  return (
    <Card
      size="small"
      loading={loading}
      title="客户地址分布"
      className="h-80"
    >
      <FullscreenChart
        title="客户地址分布"
        option={option}
        height="250px"
        onChartClick={params => {
          const payload = (
            params as unknown as {
              data?: { addressId?: string; addressName?: string }
            }
          ).data
          if (onRegionalClick && payload && payload.addressId) {
            onRegionalClick(payload.addressId, payload.addressName || '未知地址')
          }
        }}
      />
    </Card>
  )
}

export default RegionalSalesChart
