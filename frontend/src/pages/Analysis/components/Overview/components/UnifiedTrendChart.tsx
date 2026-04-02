import type { RadioChangeEvent } from 'antd'
import { Card, Radio } from 'antd'
import type { CallbackDataParams, EChartsOption } from 'echarts'
import * as echarts from 'echarts'
import type { AnalysisCountResult } from 'fresh-shop-backend/types/dto'
import { useMemo, useRef } from 'react'

import { FullscreenChart } from '@/components/FullscreenChart'
import useAnalysisStore from '@/stores/analysisStore'
import dayjs from '@/utils/day'

type TrendPoint = AnalysisCountResult['groupBuyTrend'][number]

const generateChartOption = (
  data:
    | AnalysisCountResult['groupBuyTrend']
    | AnalysisCountResult['orderTrend']
    | AnalysisCountResult['priceTrend']
    | AnalysisCountResult['profitTrend'],
  seriesConfig: {
    name: string
    color: string
    formatter?: (params: { value: number }) => string
  },
  chartState: {
    isAllData: boolean
    showMonthly: boolean
    showCumulative: boolean
  }
): EChartsOption => {
  const safeData: TrendPoint[] = (data || []) as TrendPoint[]
  const dateFormat = chartState.isAllData && chartState.showMonthly ? 'YYYY-MM' : 'MM-DD'
  const dates = safeData.map((item: TrendPoint) => dayjs(item.date).format(dateFormat))
  const counts = safeData.map((item: TrendPoint) => item.count)
  // 为分桶场景准备起止日期，用于tooltip展示区间
  const ranges = safeData.map((item: TrendPoint) => ({
    start: item.startDate ? dayjs(item.startDate).format('YYYY-MM-DD') : null,
    end: item.endDate ? dayjs(item.endDate).format('YYYY-MM-DD') : null,
    label: dayjs(item.date).format(dateFormat)
  }))
  // 统一控制是否显示数值标签：按月 或 任意点有区间信息（分桶）
  const labelShow = chartState.showMonthly || ranges.some(r => !!r.start && !!r.end)

  return {
    tooltip: {
      trigger: 'axis' as const,
      axisPointer: {
        type: 'shadow' as const,
        shadowStyle: {
          color: 'rgba(150,150,150,0.15)'
        }
      },
      connect: true,
      formatter: (params: CallbackDataParams | CallbackDataParams[]) => {
        const p = Array.isArray(params) ? params[0] : params
        const idx = p?.dataIndex ?? 0
        const r = ranges[idx]
        // 累计趋势或按月统计一律显示单日期/月份；仅当非累计且分桶生效时显示区间
        const showRange =
          !!r.start && !!r.end && !chartState.showCumulative && !chartState.showMonthly
        const title = showRange ? `${r.start} ~ ${r.end}` : r.label
        const val = counts[idx]
        const valText = seriesConfig.formatter
          ? seriesConfig.formatter({ value: val })
          : String(val)
        return `${title}<br/>${seriesConfig.name}: ${valText}`
      }
    },
    legend: {
      top: 0,
      data: [seriesConfig.name]
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
        name: seriesConfig.name,
        type: 'line' as const,
        data: counts,
        smooth: true,
        itemStyle: { color: seriesConfig.color },
        emphasis: {
          focus: 'series' as const,
          itemStyle: {
            borderWidth: 2,
            borderColor: seriesConfig.color
          }
        },
        label: {
          show: labelShow,
          position: 'top' as const,
          formatter: '{c}',
          fontSize: 12,
          color: seriesConfig.color,
          backgroundColor: 'rgba(255, 255, 255, 0.85)',
          borderColor: seriesConfig.color,
          borderWidth: 0.5,
          borderRadius: 3,
          padding: [1, 4, 1, 4],
          distance: 6
        },
        labelLayout: {
          moveOverlap: 'shiftY' as const,
          hideOverlap: true
        }
      }
    ]
  }
}

export const UnifiedTrendChart = () => {
  const getCountLoading = useAnalysisStore(state => state.getCountLoading)
  const groupBuyTrend = useAnalysisStore(state => state.count.groupBuyTrend)
  const orderTrend = useAnalysisStore(state => state.count.orderTrend)
  const priceTrend = useAnalysisStore(state => state.count.priceTrend)
  const profitTrend = useAnalysisStore(state => state.count.profitTrend)
  const cumulativeGroupBuyTrend = useAnalysisStore(state => state.count.cumulativeGroupBuyTrend)
  const cumulativeOrderTrend = useAnalysisStore(state => state.count.cumulativeOrderTrend)
  const cumulativePriceTrend = useAnalysisStore(state => state.count.cumulativePriceTrend)
  const cumulativeProfitTrend = useAnalysisStore(state => state.count.cumulativeProfitTrend)
  const monthlyGroupBuyTrend = useAnalysisStore(state => state.count.monthlyGroupBuyTrend)
  const monthlyOrderTrend = useAnalysisStore(state => state.count.monthlyOrderTrend)
  const monthlyPriceTrend = useAnalysisStore(state => state.count.monthlyPriceTrend)
  const monthlyProfitTrend = useAnalysisStore(state => state.count.monthlyProfitTrend)
  const isAllData = useAnalysisStore(state => state.isAllData)
  const showCumulative = useAnalysisStore(state => state.showCumulative)
  const showMonthly = useAnalysisStore(state => state.showMonthly)
  const setShowCumulative = useAnalysisStore(state => state.setShowCumulative)
  const setShowMonthly = useAnalysisStore(state => state.setShowMonthly)

  // 计算当前统计模式
  const getCurrentMode = () => {
    if (showMonthly) return 'monthly'
    if (showCumulative) return 'cumulative'
    return 'daily'
  }

  // 处理统计模式变化
  const handleModeChange = (e: RadioChangeEvent) => {
    const mode = e.target.value as 'daily' | 'monthly' | 'cumulative'
    switch (mode) {
      case 'daily':
        setShowMonthly(false)
        setShowCumulative(false)
        break
      case 'monthly':
        setShowMonthly(true)
        setShowCumulative(false)
        break
      case 'cumulative':
        setShowMonthly(false)
        setShowCumulative(true)
        break
    }
  }

  // 图表实例引用
  const groupBuyChartRef = useRef<echarts.ECharts | null>(null)
  const orderChartRef = useRef<echarts.ECharts | null>(null)
  const priceChartRef = useRef<echarts.ECharts | null>(null)
  const profitChartRef = useRef<echarts.ECharts | null>(null)

  // 连接所有图表实例以实现联动
  const connectCharts = () => {
    const charts = [groupBuyChartRef, orderChartRef, priceChartRef, profitChartRef]
    const validCharts = charts.filter(ref => ref.current).map(ref => ref.current!)

    if (validCharts.length > 1) {
      echarts.connect(validCharts)
    }
  }

  const { groupBuyOption, orderOption, priceOption, profitOption } = useMemo(() => {
    const chartState = { isAllData, showMonthly, showCumulative }
    const currentData =
      isAllData && showMonthly
        ? {
            groupBuy: monthlyGroupBuyTrend,
            order: monthlyOrderTrend,
            price: monthlyPriceTrend,
            profit: monthlyProfitTrend
          }
        : showCumulative
          ? {
              groupBuy: cumulativeGroupBuyTrend,
              order: cumulativeOrderTrend,
              price: cumulativePriceTrend,
              profit: cumulativeProfitTrend
            }
          : {
              groupBuy: groupBuyTrend,
              order: orderTrend,
              price: priceTrend,
              profit: profitTrend
            }

    return {
      groupBuyOption: generateChartOption(
        currentData.groupBuy,
        {
          name: '团购单',
          color: '#2563EB'
        },
        chartState
      ),
      orderOption: generateChartOption(
        currentData.order,
        {
          name: '订单',
          color: '#2563EB'
        },
        chartState
      ),
      priceOption: generateChartOption(
        currentData.price,
        {
          name: '销售额',
          color: '#2563EB',
          formatter: (params: { value: number }) => `¥${params.value.toLocaleString()}`
        },
        chartState
      ),
      profitOption: generateChartOption(
        currentData.profit,
        {
          name: '利润',
          color: '#16A34A',
          formatter: (params: { value: number }) => `¥${params.value.toLocaleString()}`
        },
        chartState
      )
    }
  }, [
    groupBuyTrend,
    orderTrend,
    priceTrend,
    profitTrend,
    cumulativeGroupBuyTrend,
    cumulativeOrderTrend,
    cumulativePriceTrend,
    cumulativeProfitTrend,
    monthlyGroupBuyTrend,
    monthlyOrderTrend,
    monthlyPriceTrend,
    monthlyProfitTrend,
    isAllData,
    showCumulative,
    showMonthly
  ])

  return (
    <div className="w-full !space-y-4">
      {/* 全局控制面板 */}
      <Card
        size="small"
        className="mb-4 border-blue-200 bg-blue-50/30"
        styles={{
          body: { padding: '16px 20px' }
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-blue-500"></div>
              <span className="text-sm font-semibold text-gray-800">图表统计选项</span>
            </div>
            <Radio.Group
              value={getCurrentMode()}
              onChange={handleModeChange}
              className="flex gap-6"
            >
              <Radio.Button
                value="daily"
                className="text-sm font-medium"
              >
                按日统计
              </Radio.Button>
              <Radio.Button
                value="monthly"
                className="text-sm font-medium"
                disabled={!isAllData}
              >
                按月统计
              </Radio.Button>
              <Radio.Button
                value="cumulative"
                className="text-sm font-medium"
              >
                累计趋势
              </Radio.Button>
            </Radio.Group>
          </div>
        </div>
      </Card>

      {/* 四个图表容器 - 每个图表单独占一行 */}
      <Card
        loading={getCountLoading}
        title="团购单"
      >
        <FullscreenChart
          title="团购单"
          option={groupBuyOption}
          height="300px"
          onChartReady={chart => {
            groupBuyChartRef.current = chart
            // 连接所有图表以实现联动
            connectCharts()
          }}
        />
      </Card>

      <Card
        loading={getCountLoading}
        title="订单"
      >
        <FullscreenChart
          title="订单"
          option={orderOption}
          height="300px"
          onChartReady={chart => {
            orderChartRef.current = chart
            // 连接所有图表以实现联动
            connectCharts()
          }}
        />
      </Card>

      <Card
        loading={getCountLoading}
        title="销售额"
      >
        <FullscreenChart
          title="销售额"
          option={priceOption}
          height="300px"
          onChartReady={chart => {
            priceChartRef.current = chart
            // 连接所有图表以实现联动
            connectCharts()
          }}
        />
      </Card>

      <Card
        loading={getCountLoading}
        title="利润"
      >
        <FullscreenChart
          title="利润"
          option={profitOption}
          height="300px"
          onChartReady={chart => {
            profitChartRef.current = chart
            // 连接所有图表以实现联动
            connectCharts()
          }}
        />
      </Card>
    </div>
  )
}
