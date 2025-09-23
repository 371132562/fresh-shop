import { UserOutlined } from '@ant-design/icons'
import { Card, Table } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import type { CustomerAddressConsumptionDetailDto } from 'fresh-shop-backend/types/dto'
import React, { useMemo } from 'react'

type AddressCustomerRow = {
  key: number
  customerId: string
  customerName: string
  orderCount: number
  totalAmount: number
  totalRefundAmount: number
  totalPartialRefundAmount: number
  partialRefundOrderCount: number
  refundedOrderCount: number
}

type AddressCustomerTableProps = {
  stats: NonNullable<CustomerAddressConsumptionDetailDto['addressCustomerStats']>
}

const AddressCustomerTable: React.FC<AddressCustomerTableProps> = ({ stats }) => {
  const dataSource = useMemo(() => stats.map((item, index) => ({ key: index, ...item })), [stats])

  const columns: ColumnsType<AddressCustomerRow> = [
    {
      title: '客户名称',
      dataIndex: 'customerName',
      key: 'customerName',
      width: 260,
      ellipsis: true
    },
    {
      title: '订单量',
      dataIndex: 'orderCount',
      key: 'orderCount',
      sorter: (a, b) => (a.orderCount || 0) - (b.orderCount || 0),
      render: count => <span className="font-bold text-blue-600">{count}单</span>
    },
    {
      title: '消费额',
      dataIndex: 'totalAmount',
      key: 'totalAmount',
      sorter: (a, b) => (a.totalAmount || 0) - (b.totalAmount || 0),
      render: v => <span className="font-bold text-blue-400">¥{(v || 0).toFixed(2)}</span>
    },
    {
      title: '退款金额',
      dataIndex: 'totalRefundAmount',
      key: 'totalRefundAmount',
      sorter: (a, b) => (a.totalRefundAmount || 0) - (b.totalRefundAmount || 0),
      render: v => <span className="font-medium text-orange-600">¥{(v || 0).toFixed(2)}</span>
    },
    {
      title: '部分退款/退款订单',
      key: 'refundOrders',
      render: (_, record) => (
        <span className="font-medium text-orange-600">
          {record.partialRefundOrderCount || 0}/{record.refundedOrderCount || 0} 单
        </span>
      )
    }
  ]

  return (
    <Card
      title={
        <div className="flex h-12 items-center gap-2">
          <UserOutlined className="text-blue-500" />
          <span className="text-lg font-medium">该地址下客户列表</span>
        </div>
      }
      size="small"
      styles={{ header: { background: '#f0f5ff' } }}
      className="mt-2"
    >
      <Table
        size="small"
        pagination={false}
        dataSource={dataSource}
        columns={columns}
      />
    </Card>
  )
}

export default AddressCustomerTable
