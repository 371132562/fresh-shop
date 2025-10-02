import { Button, Modal, Table } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import React, { useState } from 'react'

import ConsumptionDetailStatsModal from '@/pages/Analysis/components/ConsumptionDetail'
import useAnalysisStore from '@/stores/analysisStore'
import useCustomerStore from '@/stores/customerStore'

const CustomerListModal: React.FC = () => {
  // 来自分析 store 的客户列表弹窗状态与数据
  const visible = useAnalysisStore(state => state.customerListVisible)
  const setVisible = useAnalysisStore(state => state.setCustomerListVisible)
  const title = useAnalysisStore(state => state.customerListTitle)
  const loading = useAnalysisStore(state => state.customerListLoading)
  const data = useAnalysisStore(state => state.customerListData)
  const showPurchaseCount = useAnalysisStore(state => state.customerListShowPurchaseCount)
  const resetCustomerList = useAnalysisStore(state => state.resetCustomerList)

  // 客户消费详情弹窗状态与数据
  const [consumptionDetailVisible, setConsumptionDetailVisible] = useState(false)
  const [currentId, setCurrentId] = useState<string | null>(null)
  const resetConsumptionDetail = useCustomerStore(state => state.resetConsumptionDetail)

  type CustomerListRow = {
    key: string
    customerId: string
    customerName: string
    customerAddressName?: string
    purchaseCount?: number
  }

  // 构建表头
  const columns: ColumnsType<CustomerListRow> = [
    {
      title: '客户姓名',
      dataIndex: 'customerName',
      key: 'customerName'
    },
    {
      title: '客户地址',
      dataIndex: 'customerAddressName',
      key: 'customerAddressName',
      width: 150,
      render: (text: string) => text || '-'
    }
  ]

  if (showPurchaseCount) {
    columns.push({
      title: '购买次数',
      dataIndex: 'purchaseCount',
      key: 'purchaseCount',
      width: 100
    })
  }

  columns.push({
    title: '操作',
    key: 'action',
    render: (_: unknown, record: CustomerListRow) => (
      <Button
        type="primary"
        ghost
        onClick={() => {
          setCurrentId(record.customerId)
          setConsumptionDetailVisible(true)
        }}
      >
        查看全部消费详情
      </Button>
    )
  })

  return (
    <>
      <Modal
        title={title}
        open={visible}
        onCancel={() => {
          setVisible(false)
          resetCustomerList()
        }}
        footer={null}
        width={600}
        style={{
          top: 20
        }}
      >
        <Table
          columns={columns}
          dataSource={data.map(item => ({
            key: item.customerId,
            customerId: item.customerId,
            customerName: item.customerName,
            customerAddressName: item.customerAddressName,
            purchaseCount: item.purchaseCount
          }))}
          loading={loading}
          pagination={false}
          size="middle"
        />
      </Modal>

      {currentId && (
        <ConsumptionDetailStatsModal
          visible={consumptionDetailVisible}
          onClose={() => {
            setConsumptionDetailVisible(false)
            resetConsumptionDetail()
            setCurrentId(null)
          }}
          id={currentId}
          type="customer"
        />
      )}
    </>
  )
}

export default CustomerListModal
