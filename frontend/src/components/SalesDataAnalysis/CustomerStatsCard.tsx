import { UserOutlined } from '@ant-design/icons'
import { Card, Col, Row, Statistic } from 'antd'
import React from 'react'

type CustomerStatsCardProps = {
  uniqueCustomerCount: number
  averageCustomerOrderValue: number
  title?: string
}

/**
 * 客户统计公共组件
 * 展示基础客户统计信息
 */
const CustomerStatsCard: React.FC<CustomerStatsCardProps> = ({
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
            valueStyle={{ color: '#722ed1' }}
          />
        </Col>
        <Col span={12}>
          <Statistic
            title="平均客单价"
            value={averageCustomerOrderValue}
            precision={2}
            prefix="¥"
            valueStyle={{ color: '#eb2f96' }}
          />
        </Col>
      </Row>
    </Card>
  )
}

export default CustomerStatsCard
