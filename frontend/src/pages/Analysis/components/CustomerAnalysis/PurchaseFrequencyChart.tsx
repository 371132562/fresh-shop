import { Card } from 'antd'
import { useMemo } from 'react'

import { FullscreenChart } from '@/components/FullscreenChart'

type PurchaseFrequencyChartProps = {
  data: Array<{
    minFrequency: number
    maxFrequency?: number | null
    count: number
  }>
  loading?: boolean
  onFrequencyClick?: (minFrequency: number, maxFrequency?: number | null) => void
}

/**
 * 客户购买次数分布饼图组件
 * 展示不同购买次数的客户分布情况
 */
const PurchaseFrequencyChart: React.FC<PurchaseFrequencyChartProps> = ({ data, loading }) => {
  const option = useMemo(() => {
    if (!data || data.length === 0) return {}

    // 转换数据格式为echarts需要的格式
    const formatLabel = (min: number, max?: number | null) => {
      if (max == null) return `${min}次及以上`
      if (min === max) return `${min}次`
      return `${min}-${max}次`
    }

    const chartData = data.map(item => ({
      name: formatLabel(item.minFrequency, item.maxFrequency ?? null),
      value: item.count,
      frequencyMin: item.minFrequency,
      frequencyMax: item.maxFrequency ?? null
    }))

    return {
      tooltip: {
        trigger: 'item' as const,
        formatter: '{a} <br/>{b}: {c}人 ({d}%)'
      },
      legend: {
        orient: 'vertical' as const,
        left: 'left',
        data: chartData.map(item => item.name)
      },
      series: [
        {
          name: '购买次数分布',
          type: 'pie' as const,
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
            position: 'outside' as const,
            formatter: '{b}: {c}人\n({d}%)',
            fontSize: 12,
            fontWeight: 'bold' as const
          },
          emphasis: {
            label: {
              show: true,
              fontSize: 14,
              fontWeight: 'bold' as const,
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
  }, [data])

  return (
    <Card
      size="small"
      loading={loading}
      title="购买次数分布图"
      className="h-80"
    >
      <FullscreenChart
        title="购买次数分布图"
        option={option}
        height="250px"
      />
    </Card>
  )
}

export default PurchaseFrequencyChart
