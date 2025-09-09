import { PlusOutlined, SearchOutlined } from '@ant-design/icons'
import { Button, FloatButton, Form, List, Modal, Popconfirm, Select, Tag } from 'antd'
import { useEffect, useState } from 'react'
import { NavLink } from 'react-router'

import useCustomerStore from '@/stores/customerStore.ts'
import useGroupBuyStore from '@/stores/groupBuyStore.ts'
import useOrderStore, { OrderStatusMap, OrderStatusOptions } from '@/stores/orderStore.ts'
import { formatDate } from '@/utils'

import Modify from './Modify.tsx'

export const Component = () => {
  const [visible, setVisible] = useState(false)
  const [searchVisible, setSearchVisible] = useState(false)
  const [form] = Form.useForm()

  const listLoading = useOrderStore(state => state.listLoading)
  const ordersList = useOrderStore(state => state.orderList)
  const listCount = useOrderStore(state => state.listCount)
  const pageParams = useOrderStore(state => state.pageParams)
  const setPageParams = useOrderStore(state => state.setPageParams)
  const allCustomer = useCustomerStore(state => state.allCustomer)
  const getAllCustomer = useCustomerStore(state => state.getAllCustomer)
  const getAllCustomerLoading = useCustomerStore(state => state.getAllCustomerLoading)
  const allGroupBuy = useGroupBuyStore(state => state.allGroupBuy)
  const getAllGroupBuy = useGroupBuyStore(state => state.getAllGroupBuy)
  const getAllGroupBuyLoading = useGroupBuyStore(state => state.getAllGroupBuyLoading)
  const updateOrder = useOrderStore(state => state.updateOrder)
  const canUpdateOrderStatus = useOrderStore(state => state.canUpdateOrderStatus)
  const getNextOrderStatusLabel = useOrderStore(state => state.getNextOrderStatusLabel)
  const handleUpdateOrderStatus = useOrderStore(state => state.handleUpdateOrderStatus)

  useEffect(() => {
    getAllCustomer()
    getAllGroupBuy()
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
        setPageParams(val)
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
      statuses: [],
      customerIds: [],
      groupBuyIds: []
    }
    form.setFieldsValue(resetValues)
    setPageParams(resetValues)
    handleCancel()
  }

  const filterOption = (input: string, option?: { children?: string }) => {
    return (option?.children ?? '').toLowerCase().includes(input.toLowerCase())
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
                  搜索订单
                </Button>
              </div>
              <div>共 {listCount.totalCount} 条</div>
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
          dataSource={ordersList}
          renderItem={item => {
            const nextStatusLabel = getNextOrderStatusLabel(item.status)
            const canUpdate = canUpdateOrderStatus(item.status)

            return (
              <List.Item
                actions={
                  canUpdate
                    ? [
                        <Popconfirm
                          key="update-status"
                          title={
                            <div className="text-lg">
                              确定要将订单状态变更为{' '}
                              <span className="text-blue-500">{nextStatusLabel}</span> 吗？
                            </div>
                          }
                          placement="left"
                          onConfirm={() =>
                            handleUpdateOrderStatus(item, updateOrder, () => {
                              // 更新成功后重新获取订单列表和统计数据
                              pageChange()
                            })
                          }
                          okText="确定"
                          cancelText="取消"
                          okButtonProps={{ size: 'large', color: 'primary', variant: 'solid' }}
                          cancelButtonProps={{
                            size: 'large',
                            color: 'primary',
                            variant: 'outlined'
                          }}
                        >
                          <Button type="primary">更新状态</Button>
                        </Popconfirm>
                      ]
                    : []
                }
              >
                <List.Item.Meta
                  title={
                    <NavLink to={`/order/detail/${item.id}`}>
                      <Button
                        type="link"
                        style={{ padding: 0 }}
                      >
                        <span className="text-lg">{item.customer.name}</span>
                        <Tag color={OrderStatusMap[item.status].color}>
                          {OrderStatusMap[item.status].label}
                        </Tag>
                      </Button>
                    </NavLink>
                  }
                  description={
                    <>
                      {item.groupBuy?.name && (
                        <NavLink to={`/groupBuy/detail/${item.groupBuy.id}`}>
                          <div className="mb-1 font-medium text-gray-800">
                            团购单：<span className="text-blue-500">{item.groupBuy.name}</span>
                            {item.groupBuy.groupBuyStartDate && (
                              <span className="ml-2 text-sm text-gray-500">
                                ({'发起时间：' + formatDate(item.groupBuy.groupBuyStartDate)})
                              </span>
                            )}
                          </div>
                        </NavLink>
                      )}
                      {item.quantity && (
                        <div className="mt-1 font-medium text-gray-800">
                          购买数量：<span className="text-blue-500">{item.quantity}</span>
                        </div>
                      )}
                      {item.description && <div className="text-gray-600">{item.description}</div>}
                    </>
                  }
                />
              </List.Item>
            )
          }}
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
          visible={visible}
          setVisible={setVisible}
        />
      )}
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
            label="按客户搜索(可多选)"
            name="customerIds"
          >
            <Select
              loading={getAllCustomerLoading}
              showSearch
              mode="multiple"
              allowClear
              placeholder="请选择客户"
              filterOption={filterOption}
            >
              {allCustomer.map(item => {
                return (
                  <Select.Option
                    key={item.id}
                    value={item.id}
                  >
                    {item.name}
                  </Select.Option>
                )
              })}
            </Select>
          </Form.Item>
          <Form.Item
            label="按团购单搜索(可多选)"
            name="groupBuyIds"
          >
            <Select
              loading={getAllGroupBuyLoading}
              showSearch
              mode="multiple"
              allowClear
              placeholder="请选择团购单"
              filterOption={filterOption}
            >
              {allGroupBuy.map(item => {
                return (
                  <Select.Option
                    key={item.id}
                    value={item.id}
                  >
                    {item.name}
                  </Select.Option>
                )
              })}
            </Select>
          </Form.Item>
          <Form.Item
            label="按订单状态搜索(可多选)"
            name="statuses"
          >
            <Select
              mode="multiple"
              allowClear
              placeholder="请选择订单状态"
            >
              {OrderStatusOptions.map(option => {
                return (
                  <Select.Option
                    key={option.value}
                    value={option.value}
                  >
                    <Tag color={option.color}>{option.label}</Tag>
                  </Select.Option>
                )
              })}
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}
