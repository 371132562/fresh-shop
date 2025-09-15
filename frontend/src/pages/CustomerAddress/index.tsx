import { PlusOutlined, SearchOutlined } from '@ant-design/icons'
import { Button, FloatButton, Form, Input, List, Modal, Select } from 'antd'
import type { CustomerAddressSortField, SortOrder } from 'fresh-shop-backend/types/dto'
import { useEffect, useState } from 'react'

import ConsumptionDetailStatsModal from '@/pages/Analysis/components/ConsumptionDetailStatsModal/index.tsx'
import useCustomerAddressStore from '@/stores/customerAddressStore.ts'

import Modify from './Modify.tsx'

export const Component = () => {
  const [visible, setVisible] = useState(false)
  const [currentId, setCurrentId] = useState<string | null>(null)
  const [searchVisible, setSearchVisible] = useState(false)
  const [consumptionDetailVisible, setConsumptionDetailVisible] = useState(false)
  const [form] = Form.useForm()

  const listLoading = useCustomerAddressStore(state => state.listLoading)
  const customerAddressList = useCustomerAddressStore(state => state.customerAddressList)
  const listCount = useCustomerAddressStore(state => state.listCount)
  const pageParams = useCustomerAddressStore(state => state.pageParams)
  const setPageParams = useCustomerAddressStore(state => state.setPageParams)

  // 消费详情相关状态
  const consumptionDetailLoading = useCustomerAddressStore(state => state.consumptionDetailLoading)
  const addressConsumptionDetail = useCustomerAddressStore(state => state.addressConsumptionDetail)
  const getAddressConsumptionDetail = useCustomerAddressStore(
    state => state.getAddressConsumptionDetail
  )
  const setAddressConsumptionDetail = useCustomerAddressStore(
    state => state.setAddressConsumptionDetail
  )

  useEffect(() => {
    pageChange()
    form.setFieldsValue(pageParams)
  }, [])

  const pageChange = (page: number = pageParams.page) => {
    setPageParams({
      page
    })
  }

  //搜索
  const handleOk = () => {
    form
      .validateFields()
      .then(async val => {
        setPageParams({
          page: 1,
          ...val
        })
        setSearchVisible(false)
      })
      .catch(err => {
        console.log(err)
      })
  }

  const handleCancel = () => {
    setSearchVisible(false)
  }

  const resetSearch = () => {
    const resetValues = {
      name: ''
    }
    form.setFieldsValue(resetValues)
    setPageParams({
      ...resetValues
    })
    handleCancel()
  }

  const handleModify = (id: string) => {
    setCurrentId(id)
    setVisible(true)
  }

  // 查看消费详情
  const handleViewConsumptionDetail = async (id: string) => {
    setConsumptionDetailVisible(true)
    await getAddressConsumptionDetail({ id })
  }

  // 关闭消费详情弹窗
  const handleCloseConsumptionDetail = () => {
    setConsumptionDetailVisible(false)
    setAddressConsumptionDetail(null)
  }

  return (
    <>
      <section className="box-border flex w-full items-center justify-between">
        <List
          className="w-full"
          itemLayout="horizontal"
          header={
            <div className="box-border flex w-full flex-row items-center justify-between">
              <div>
                <Button
                  type="primary"
                  size="large"
                  icon={<SearchOutlined />}
                  iconPosition="end"
                  onClick={() => setSearchVisible(true)}
                >
                  搜索地址
                </Button>
              </div>
              <div className="flex items-center gap-4">
                <Select
                  value={`${pageParams.sortField}_${pageParams.sortOrder}`}
                  style={{ width: 180 }}
                  onChange={value => {
                    const [sortField, sortOrder] = value.split('_') as [string, string]
                    setPageParams({
                      sortField: sortField as CustomerAddressSortField,
                      sortOrder: sortOrder as SortOrder,
                      page: 1
                    })
                  }}
                  options={[
                    { label: '按添加时间倒序', value: 'createdAt_desc' },
                    { label: '按添加时间正序', value: 'createdAt_asc' },
                    { label: '按订单数量倒序', value: 'orderCount_desc' },
                    { label: '按订单数量正序', value: 'orderCount_asc' },
                    { label: '按订单总额倒序', value: 'orderTotalAmount_desc' },
                    { label: '按订单总额正序', value: 'orderTotalAmount_asc' }
                  ]}
                />
                <div>共 {listCount.totalCount} 个</div>
              </div>
            </div>
          }
          loading={listLoading}
          pagination={{
            position: 'bottom',
            align: 'end',
            total: listCount.totalCount,
            current: pageParams.page,
            onChange: page => {
              pageChange(page)
            }
          }}
          dataSource={customerAddressList}
          renderItem={item => (
            <List.Item>
              <List.Item.Meta
                title={
                  <Button
                    type="link"
                    style={{ padding: 0 }}
                    onClick={() => {
                      handleModify(item.id)
                    }}
                  >
                    <span className="text-lg">{item.name}</span>
                  </Button>
                }
                description={
                  <div className="flex items-start justify-between">
                    <div>
                      {item.orderCount !== undefined && (
                        <div className="mb-1 font-medium text-gray-800">
                          订单数量：<span className="text-blue-500">{item.orderCount}</span>
                        </div>
                      )}
                      {item.orderTotalAmount !== undefined && (
                        <div className="mb-1 font-medium text-gray-800">
                          订单总额：
                          <span className="text-green-500">
                            ¥{item.orderTotalAmount.toFixed(2)}
                          </span>
                        </div>
                      )}
                    </div>
                    <Button
                      type="primary"
                      ghost
                      onClick={() => handleViewConsumptionDetail(item.id)}
                    >
                      查看消费详情
                    </Button>
                  </div>
                }
              />
            </List.Item>
          )}
        />
      </section>
      <FloatButton
        style={{ position: 'absolute', left: 24 }}
        icon={<PlusOutlined />}
        type="primary"
        description="添加"
        shape="square"
        onClick={() => setVisible(true)}
      />
      {visible && (
        <Modify
          id={currentId}
          visible={visible}
          setVisible={setVisible}
          setCurrentId={setCurrentId}
        />
      )}

      {/* 消费详情弹窗 */}
      <ConsumptionDetailStatsModal
        visible={consumptionDetailVisible}
        onClose={handleCloseConsumptionDetail}
        consumptionDetail={
          addressConsumptionDetail
            ? {
                customerName: addressConsumptionDetail.addressName, // 将地址名称映射为 customerName 以复用组件
                orderCount: addressConsumptionDetail.orderCount,
                totalAmount: addressConsumptionDetail.totalAmount,
                averagePricePerOrder: addressConsumptionDetail.averagePricePerOrder,
                totalPartialRefundAmount: addressConsumptionDetail.totalPartialRefundAmount,
                productConsumptionRanks: addressConsumptionDetail.productConsumptionRanks
              }
            : null
        }
        loading={consumptionDetailLoading}
        title="地址消费详情"
        width={900}
        type="address"
      />
      <Modal
        open={searchVisible}
        onOk={handleOk}
        onCancel={handleCancel}
        footer={[
          <Button onClick={resetSearch}>清空</Button>,
          <Button onClick={handleCancel}>取消</Button>,
          <Button
            type="primary"
            loading={listLoading}
            onClick={handleOk}
          >
            确定
          </Button>
        ]}
      >
        <Form
          form={form}
          layout="vertical"
          size="large"
          name="basic"
          labelCol={{ span: 24 }}
          wrapperCol={{ span: 24 }}
          style={{ maxWidth: 600 }}
          autoComplete="off"
        >
          <Form.Item
            label="按名称搜索"
            name="name"
          >
            <Input />
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}
