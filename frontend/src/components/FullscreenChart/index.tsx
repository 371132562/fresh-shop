import { FullscreenOutlined } from '@ant-design/icons'
import { Button, Modal, Tooltip } from 'antd'
import type { EChartsOption } from 'echarts'
import * as echarts from 'echarts'
import { useEffect, useRef, useState } from 'react'

type FullscreenChartProps = {
  title: string
  option: EChartsOption
  height?: string
  className?: string
  onChartClick?: (params: echarts.ECElementEvent) => void
  onChartReady?: (chart: echarts.ECharts) => void
}

/**
 * 全屏图表组件
 * 支持图表全屏显示功能，hover时显示全屏按钮
 */
export const FullscreenChart = ({
  title,
  option,
  height = '300px',
  className = '',
  onChartClick,
  onChartReady
}: FullscreenChartProps) => {
  const chartRef = useRef<HTMLDivElement>(null)
  const fullscreenChartRef = useRef<HTMLDivElement>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isHovered, setIsHovered] = useState(false)

  // 主图表实例管理
  useEffect(() => {
    if (!chartRef.current) return

    const chartInstance = echarts.init(chartRef.current)

    // 设置图表配置
    if (option) {
      chartInstance.setOption(option, true)
    }

    // 添加点击事件监听
    if (onChartClick) {
      chartInstance.on('click', onChartClick)
    }

    // 调用图表就绪回调
    if (onChartReady) {
      onChartReady(chartInstance)
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
  }, [option, onChartClick])

  // 全屏图表实例管理
  useEffect(() => {
    if (!isFullscreen || !fullscreenChartRef.current) return

    const fullscreenInstance = echarts.init(fullscreenChartRef.current)

    // 直接使用当前 option，保留其中的 formatter 等函数引用
    fullscreenInstance.setOption(option, true)

    // 添加点击事件监听
    if (onChartClick) {
      fullscreenInstance.on('click', onChartClick)
    }

    // 延迟调整大小，确保DOM完全渲染
    const timer = setTimeout(() => {
      fullscreenInstance.resize()
    }, 0)

    return () => {
      clearTimeout(timer)
      fullscreenInstance.dispose()
    }
  }, [isFullscreen, option, onChartClick])

  return (
    <>
      <div
        className={`group relative ${className}`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div
          ref={chartRef}
          style={{ height }}
          className="w-full"
        />
        {/* 全屏按钮 - 只在hover时显示，不挤占空间 */}
        <Tooltip
          title="全屏显示图表"
          placement="left"
        >
          <Button
            color="primary"
            variant="outlined"
            icon={<FullscreenOutlined />}
            onClick={() => setIsFullscreen(true)}
            className={`absolute right-2 top-2 z-10 transition-all duration-200 ${
              isHovered ? 'opacity-100' : 'pointer-events-none opacity-0'
            }`}
            style={{
              position: 'absolute',
              top: '2px',
              right: '2px',
              background: 'rgba(255, 255, 255, 0.9)',
              borderRadius: '6px',
              width: '36px',
              height: '36px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
              zIndex: 10
            }}
          />
        </Tooltip>
      </div>

      <Modal
        title={title}
        open={isFullscreen}
        onCancel={() => setIsFullscreen(false)}
        footer={null}
        width="95vw"
        zIndex={1000}
        style={{
          top: 20,
          maxWidth: '95vw',
          height: '95vh'
        }}
        styles={{
          body: {
            height: 'calc(95vh - 55px)',
            padding: 0,
            overflow: 'hidden',
            margin: 0
          }
        }}
      >
        <div
          ref={fullscreenChartRef}
          className="w-full"
          style={{
            height: 'calc(95vh - 55px)',
            width: '100%'
          }}
        />
      </Modal>
    </>
  )
}
