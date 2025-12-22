import { UserOutlined } from '@ant-design/icons'
import { Card, Col, Row, Statistic } from 'antd'
import React from 'react'

type CustomerStatsAnalysisProps = {
  uniqueCustomerCount: number
  averageCustomerOrderValue: number
  title?: string
}

/**
 * 客户统计分析组件
 * 展示基础客户统计信息
 */
const CustomerStatsAnalysis: React.FC<CustomerStatsAnalysisProps> = ({
  uniqueCustomerCount,
  averageCustomerOrderValue,
  title = '客户统计'
}) => {
  return (
    <Card
      title={
        <div className="flex h-12 items-center gap-2">
          <UserOutlined className="text-green-500" />
          <span className="text-lg font-medium">{title}</span>
        </div>
      }
      size="small"
      styles={{ header: { background: '#f6ffed' } }}
    >
      <Row gutter={16}>
        <Col span={12}>
          <Statistic
            title="参与客户数"
            value={uniqueCustomerCount}
            suffix="人"
            styles={{ content: { color: '#2563eb', fontWeight: 700 } }}
          />
        </Col>
        <Col span={12}>
          <Statistic
            title="平均客单价"
            value={averageCustomerOrderValue}
            precision={2}
            prefix="¥"
            styles={{ content: { color: '#60a5fa', fontWeight: 700 } }}
          />
        </Col>
      </Row>
    </Card>
  )
}

export default CustomerStatsAnalysis
