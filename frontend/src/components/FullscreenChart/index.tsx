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
}

/**
 * 全屏图表组件
 * 支持图表全屏显示功能，hover时显示全屏按钮
 */
export const FullscreenChart = ({
  title,
  option,
  height = '300px',
  className = ''
}: FullscreenChartProps) => {
  const chartRef = useRef<HTMLDivElement>(null)
  const fullscreenChartRef = useRef<HTMLDivElement>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [chartInstance, setChartInstance] = useState<echarts.ECharts | null>(null)
  const [fullscreenChartInstance, setFullscreenChartInstance] = useState<echarts.ECharts | null>(
    null
  )
  const [isHovered, setIsHovered] = useState(false)

  // 初始化图表
  useEffect(() => {
    if (chartRef.current && !chartInstance) {
      const instance = echarts.init(chartRef.current)
      setChartInstance(instance)
    }
  }, [chartInstance])

  // 更新图表配置
  useEffect(() => {
    if (chartInstance && option) {
      chartInstance.setOption(option, true)
    }
  }, [chartInstance, option])

  // 处理全屏图表初始化和配置
  useEffect(() => {
    if (isFullscreen && fullscreenChartRef.current) {
      // 销毁之前的实例
      if (fullscreenChartInstance) {
        fullscreenChartInstance.dispose()
      }

      // 创建新的全屏图表实例
      const instance = echarts.init(fullscreenChartRef.current)
      setFullscreenChartInstance(instance)

      // 设置图表配置
      if (option) {
        instance.setOption(option, true)
      }

      // 调整大小
      setTimeout(() => {
        instance.resize()
      }, 100)
    }
  }, [isFullscreen, option])

  // 处理窗口大小变化
  useEffect(() => {
    const handleResize = () => {
      if (chartInstance) {
        chartInstance.resize()
      }
      if (fullscreenChartInstance) {
        fullscreenChartInstance.resize()
      }
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [chartInstance, fullscreenChartInstance])

  // 打开全屏
  const openFullscreen = () => {
    setIsFullscreen(true)
  }

  // 关闭全屏
  const closeFullscreen = () => {
    setIsFullscreen(false)
    // 关闭全屏后重新渲染原图表，防止变白
    if (chartInstance && option) {
      setTimeout(() => {
        chartInstance.setOption(option, true)
        chartInstance.resize()
      }, 100)
    }
  }

  // 清理图表实例
  useEffect(() => {
    return () => {
      if (chartInstance) {
        chartInstance.dispose()
      }
      if (fullscreenChartInstance) {
        fullscreenChartInstance.dispose()
      }
    }
  }, [chartInstance, fullscreenChartInstance])

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
            onClick={openFullscreen}
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
        onCancel={closeFullscreen}
        footer={null}
        width="95vw"
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
