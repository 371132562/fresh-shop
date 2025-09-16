import { PlusOutlined } from '@ant-design/icons'
import { Button, Card, Col, FloatButton, Form, List, Popconfirm, Row, Select, Tag } from 'antd'
import { useEffect, useState } from 'react'
import { NavLink } from 'react-router'

import SearchToolbar from '@/components/SearchToolbar'
import useCustomerStore from '@/stores/customerStore.ts'
import useGroupBuyStore from '@/stores/groupBuyStore.ts'
import useOrderStore, {
  ExtendedOrderStatusOptions,
  OrderStatusMap,
  OrderStatusOptions
} from '@/stores/orderStore.ts'
import { formatDate } from '@/utils'

import { PartialRefundButton } from './components/PartialRefundModal.tsx'
import Modify from './Modify.tsx'

export const Component = () => {
  const [visible, setVisible] = useState(false)
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

  // 搜索功能
  const handleSearch = () => {
    form
      .validateFields()
      .then(async val => {
        setPageParams({
          page: 1,
          ...val
        })
      })
      .catch(err => {
        console.log(err)
      })
  }

  // 重置搜索
  const resetSearch = () => {
    const resetValues = {
      statuses: [],
      customerIds: [],
      groupBuyIds: []
    }
    form.setFieldsValue(resetValues)
    setPageParams({
      page: 1,
      ...resetValues
    })
  }

  return (
    <>
      {/* 搜索表单区域 */}
      <Card
        className="mb-4 w-full"
        size="small"
      >
        <Form
          form={form}
          layout="vertical"
          name="searchForm"
          autoComplete="off"
        >
          <Row gutter={[16, 8]}>
            <Col
              xs={24}
              sm={12}
              md={8}
            >
              <Form.Item
                label="客户"
                name="customerIds"
                className="!mb-1"
              >
                <Select
                  loading={getAllCustomerLoading}
                  showSearch
                  mode="multiple"
                  allowClear
                  placeholder="请选择客户"
                  onChange={handleSearch}
                  onClear={handleSearch}
                  filterOption={(input, option) =>
                    String(option?.children || '')
                      .toLowerCase()
                      .includes(input.toLowerCase())
                  }
                  popupMatchSelectWidth={300}
                >
                  {allCustomer.map(item => (
                    <Select.Option
                      key={item.id}
                      value={item.id}
                    >
                      {item.name}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col
              xs={24}
              sm={12}
              md={8}
            >
              <Form.Item
                label="团购单"
                name="groupBuyIds"
                className="!mb-1"
              >
                <Select
                  loading={getAllGroupBuyLoading}
                  showSearch
                  mode="multiple"
                  allowClear
                  placeholder="请选择团购单"
                  onChange={handleSearch}
                  onClear={handleSearch}
                  filterOption={(input, option) =>
                    String(option?.children || '')
                      .toLowerCase()
                      .includes(input.toLowerCase())
                  }
                  popupMatchSelectWidth={300}
                >
                  {allGroupBuy.map(item => (
                    <Select.Option
                      key={item.id}
                      value={item.id}
                    >
                      {item.name}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col
              xs={24}
              sm={12}
              md={8}
            >
              <Form.Item
                label="订单状态"
                name="statuses"
                className="!mb-1"
              >
                <Select
                  mode="multiple"
                  allowClear
                  placeholder="请选择订单状态"
                  onChange={handleSearch}
                  onClear={handleSearch}
                  popupMatchSelectWidth={300}
                >
                  {(ExtendedOrderStatusOptions || OrderStatusOptions).map(option => (
                    <Select.Option
                      key={option.value}
                      value={option.value}
                    >
                      <Tag color={option.color}>{option.label}</Tag>
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>
          {/* 工具栏区域 */}
          <SearchToolbar
            onSearch={handleSearch}
            onReset={resetSearch}
            searchLoading={listLoading}
            totalCount={listCount.totalCount}
            countLabel="个订单"
          />
        </Form>
      </Card>

      {/* 订单列表 */}
      <section className="box-border flex w-full items-center justify-between">
        <List
          className="w-full"
          itemLayout="horizontal"
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

            // 计算订单总金额
            const units = (item.groupBuy?.units as Array<{ id: string; price: number }>) || []
            const selectedUnit = units.find(unit => unit.id === item.unitId)
            const itemTotalAmount = selectedUnit ? selectedUnit.price * item.quantity : 0

            const actions = []

            if (canUpdate) {
              actions.push(
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
              )
              // 添加部分退款按钮
              actions.push(
                <PartialRefundButton
                  key="partial-refund"
                  orderId={item.id}
                  orderTotalAmount={itemTotalAmount}
                  currentRefundAmount={item.partialRefundAmount || 0}
                  orderStatus={item.status}
                  onSuccess={() => pageChange()}
                />
              )
            }

            return (
              <List.Item actions={actions}>
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
                        <div className="mb-1 font-medium text-gray-800">
                          团购单：
                          <NavLink
                            to={`/groupBuy/detail/${item.groupBuy.id}`}
                            className="text-blue-500 transition-colors hover:text-blue-600"
                          >
                            {item.groupBuy.name}
                          </NavLink>
                          {item.groupBuy.groupBuyStartDate && (
                            <span className="ml-2 text-sm text-gray-500">
                              ({'发起时间：' + formatDate(item.groupBuy.groupBuyStartDate)})
                            </span>
                          )}
                        </div>
                      )}
                      {item.quantity && (
                        <div className="mt-1 font-medium text-gray-800">
                          购买数量：<span className="text-blue-500">{item.quantity}</span>
                        </div>
                      )}
                      {item.partialRefundAmount > 0 && item.status !== 'REFUNDED' && (
                        <div className="mt-1 font-medium text-gray-800">
                          部分退款：
                          <span className="text-orange-600">
                            ¥{item.partialRefundAmount.toFixed(2)}
                          </span>
                          <span className="text-blue-500">/¥{itemTotalAmount.toFixed(2)}</span>
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
    </>
  )
}
