import { BarChartOutlined, QuestionCircleOutlined } from '@ant-design/icons'
import { Card, Col, Row, Table, Tooltip } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import type { RegionalSalesItem } from 'fresh-shop-backend/types/dto'
import React from 'react'

import RegionalSalesChart from './RegionalSalesChart'

type RegionalSalesAnalysisProps = {
  regionalSales: RegionalSalesItem[]
  onRegionalClick?: (addressId: string, addressName: string) => void
  title?: string
}

/**
 * 客户地址分布组件
 * 展示地域销售分布图表和表格
 */
const RegionalSalesAnalysis: React.FC<RegionalSalesAnalysisProps> = ({
  regionalSales,
  onRegionalClick,
  title = '客户地址分布'
}) => {
  // 客户地址分布表格列定义
  const regionalSalesColumns: ColumnsType<RegionalSalesItem & { key: number }> = [
    {
      title: '地址',
      dataIndex: 'addressName',
      key: 'addressName',
      render: (addressName: string) => <span>{addressName || '未知地址'}</span>
    },
    {
      title: '客户量',
      dataIndex: 'customerCount',
      key: 'customerCount',
      render: (count: number, record) => (
        <span
          className={`font-medium text-blue-600 ${
            onRegionalClick ? 'cursor-pointer hover:text-blue-800' : ''
          }`}
          onClick={() => onRegionalClick?.(record.addressId, record.addressName)}
          title={onRegionalClick ? '点击查看该地区客户列表' : ''}
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
          <BarChartOutlined className="text-orange-500" />
          <span className="text-lg font-medium">{title}</span>
          <Tooltip
            title={
              <div>
                <div>时间口径：按团购发起时间筛选。</div>
                <div>客户量：基于订单集合，仅统计已支付/已完成（不含已退款）。</div>
                <div>退款规则：退款订单不计入订单量；金额口径详见后端统计规范。</div>
              </div>
            }
            placement="right"
          >
            <QuestionCircleOutlined className="text-gray-400" />
          </Tooltip>
        </div>
      }
      size="small"
      styles={{ header: { background: '#fffbe6' } }}
    >
      {regionalSales && regionalSales.length > 0 ? (
        <Row gutter={16}>
          <Col span={12}>
            <RegionalSalesChart
              data={regionalSales}
              onRegionalClick={onRegionalClick}
            />
          </Col>
          <Col span={12}>
            <Table
              columns={regionalSalesColumns}
              dataSource={regionalSales.map((item, index) => ({
                key: index,
                addressId: item.addressId,
                addressName: item.addressName,
                customerCount: item.customerCount
              }))}
              pagination={false}
              size="small"
            />
          </Col>
        </Row>
      ) : (
        <div className="flex items-center justify-center py-8">
          <div className="text-gray-500">暂无地域数据</div>
        </div>
      )}
    </Card>
  )
}

export default RegionalSalesAnalysis
