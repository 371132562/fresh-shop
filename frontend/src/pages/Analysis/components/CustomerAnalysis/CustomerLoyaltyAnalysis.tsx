import { QuestionCircleOutlined, TeamOutlined } from '@ant-design/icons'
import { Card, Col, Divider, Row, Statistic, Table, Tooltip } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import type { CustomerPurchaseFrequency } from 'fresh-shop-backend/types/dto'
import React from 'react'

import PurchaseFrequencyChart from './PurchaseFrequencyChart'

type CustomerLoyaltyAnalysisProps = {
  multiPurchaseCustomerCount: number
  multiPurchaseCustomerRatio: number
  customerPurchaseFrequency: CustomerPurchaseFrequency[]
  onFrequencyClick?: (minFrequency: number, maxFrequency?: number | null) => void
  title?: string
  // 标题问号提示内容（可选），支持字符串或JSX
  tooltip?: React.ReactNode
}

/**
 * 客户忠诚度分析组件
 * 展示多次购买客户统计和购买次数分布
 */
const CustomerLoyaltyAnalysis: React.FC<CustomerLoyaltyAnalysisProps> = ({
  multiPurchaseCustomerCount,
  multiPurchaseCustomerRatio,
  customerPurchaseFrequency,
  onFrequencyClick,
  title = '客户忠诚度分析',
  tooltip
}) => {
  const formatLabel = (min: number, max?: number | null) => {
    if (max == null) return `${min}次及以上`
    if (min === max) return `${min}次`
    return `${min}-${max}次`
  }

  // 客户购买次数分布表格列定义
  const purchaseFrequencyColumns: ColumnsType<CustomerPurchaseFrequency & { key: number }> = [
    {
      title: '购买次数',
      dataIndex: 'minFrequency',
      key: 'frequencyRange',
      render: (_: number, record) => (
        <span>{formatLabel(record.minFrequency, record.maxFrequency ?? null)}</span>
      )
    },
    {
      title: '客户数量',
      dataIndex: 'count',
      key: 'count',
      render: (count: number, record) => (
        <span
          className={`font-medium text-blue-600 ${onFrequencyClick ? 'cursor-pointer hover:text-blue-800' : ''}`}
          onClick={() => onFrequencyClick?.(record.minFrequency, record.maxFrequency ?? null)}
          title={onFrequencyClick ? '点击查看该频次范围客户列表' : ''}
        >
          {count}人
        </span>
      )
    }
  ]

  return (
    <Card
      title={
        <div className="flex h-12 items-center gap-2">
          <TeamOutlined className="text-purple-500" />
          <span className="text-lg font-medium">{title}</span>
          {tooltip ? (
            <Tooltip
              title={tooltip}
              placement="right"
            >
              <QuestionCircleOutlined className="text-gray-400" />
            </Tooltip>
          ) : null}
        </div>
      }
      size="small"
      styles={{ header: { background: '#f9f0ff' } }}
    >
      <Row gutter={16}>
        <Col span={12}>
          <Statistic
            title="多次购买客户数"
            value={multiPurchaseCustomerCount}
            suffix="人"
            valueStyle={{ color: '#52c41a' }}
          />
        </Col>
        <Col span={12}>
          <Statistic
            title="多次购买客户占比"
            value={multiPurchaseCustomerRatio}
            precision={1}
            suffix="%"
            valueStyle={{ color: '#1890ff' }}
          />
        </Col>
      </Row>

      <Divider
        orientation="left"
        orientationMargin="0"
      >
        <span className="text-sm text-gray-600">客户购买次数分布</span>
      </Divider>

      {/* 购买次数分布图表和表格 */}
      <Row gutter={16}>
        <Col span={12}>
          <PurchaseFrequencyChart
            data={customerPurchaseFrequency}
            onFrequencyClick={onFrequencyClick}
          />
        </Col>
        <Col span={12}>
          <Table
            columns={purchaseFrequencyColumns}
            dataSource={customerPurchaseFrequency.map((item, index) => ({
              key: index,
              minFrequency: item.minFrequency,
              maxFrequency: item.maxFrequency ?? null,
              count: item.count
            }))}
            pagination={false}
            size="small"
          />
        </Col>
      </Row>
    </Card>
  )
}

export default CustomerLoyaltyAnalysis
