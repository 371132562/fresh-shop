import { Button, Modal, Table } from 'antd'
import React, { useState } from 'react'

import ConsumptionDetailModal from '@/pages/Customer/components/ConsumptionDetailModal'
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
  const getConsumptionDetail = useCustomerStore(state => state.getConsumptionDetail)
  const consumptionDetail = useCustomerStore(state => state.consumptionDetail)
  const consumptionDetailLoading = useCustomerStore(state => state.consumptionDetailLoading)
  const resetConsumptionDetail = useCustomerStore(state => state.resetConsumptionDetail)

  // 构建表头
  const columns: any[] = [
    {
      title: '客户姓名',
      dataIndex: 'customerName',
      key: 'customerName'
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
    render: (_: any, record: any) => (
      <Button
        type="primary"
        ghost
        onClick={() => {
          getConsumptionDetail(record.customerId)
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
      >
        <Table
          columns={columns}
          dataSource={data.map(item => ({
            key: item.customerId,
            customerId: item.customerId,
            customerName: item.customerName,
            purchaseCount: item.purchaseCount
          }))}
          loading={loading}
          pagination={false}
          size="middle"
        />
      </Modal>

      <ConsumptionDetailModal
        visible={consumptionDetailVisible}
        onClose={() => {
          setConsumptionDetailVisible(false)
          resetConsumptionDetail()
        }}
        consumptionDetail={consumptionDetail}
        loading={consumptionDetailLoading}
      />
    </>
  )
}

export default CustomerListModal
