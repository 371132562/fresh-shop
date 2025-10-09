import { Button, Card, Col, Form, List, Popconfirm, Row, Tag } from 'antd'
import { useEffect, useState } from 'react'
import { NavLink } from 'react-router'

import CustomerSelector from '@/components/CustomerSelector'
import GroupBuySelector from '@/components/GroupBuySelector'
import OrderStatusSelector from '@/components/OrderStatusSelector'
import SearchToolbar from '@/components/SearchToolbar'
import UpdateOrderStatusButton from '@/pages/Order/components/UpdateOrderStatusButton.tsx'
import useOrderStore, { OrderStatusMap } from '@/stores/orderStore.ts'
import { formatDate } from '@/utils'

import RefundButton from './components/RefundButton.tsx'
import Modify from './Modify.tsx'

export const Component = () => {
  const [visible, setVisible] = useState(false)
  const [currentId, setCurrentId] = useState<string | null>(null)
  const [form] = Form.useForm()

  const listLoading = useOrderStore(state => state.listLoading)
  const ordersList = useOrderStore(state => state.orderList)
  const listCount = useOrderStore(state => state.listCount)
  const pageParams = useOrderStore(state => state.pageParams)
  const setPageParams = useOrderStore(state => state.setPageParams)
  const getOrder = useOrderStore(state => state.getOrder)
  const deleteOrder = useOrderStore(state => state.deleteOrder)
  const deleteLoading = useOrderStore(state => state.deleteLoading)

  useEffect(() => {
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

  const handleModify = async (id: string) => {
    await getOrder({ id })
    setCurrentId(id)
    setVisible(true)
  }

  const handleDelete = async (id: string) => {
    const ok = await deleteOrder({ id })
    if (ok) {
      pageChange()
    }
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
              md={12}
              lg={8}
            >
              <Form.Item
                label="客户"
                name="customerIds"
                className="!mb-1"
              >
                <CustomerSelector
                  mode="multiple"
                  onChange={handleSearch}
                  onClear={handleSearch}
                />
              </Form.Item>
            </Col>
            <Col
              xs={24}
              md={12}
              lg={8}
            >
              <Form.Item
                label="团购单"
                name="groupBuyIds"
                className="!mb-1"
              >
                <GroupBuySelector
                  mode="multiple"
                  onChange={handleSearch}
                  onClear={handleSearch}
                  popupMatchSelectWidth={300}
                />
              </Form.Item>
            </Col>
            <Col
              xs={24}
              md={12}
              lg={8}
            >
              <Form.Item
                label="订单状态"
                name="statuses"
                className="!mb-1"
              >
                <OrderStatusSelector
                  mode="multiple"
                  onChange={handleSearch}
                  onClear={handleSearch}
                  popupMatchSelectWidth={300}
                  useExtended={true}
                />
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
            onAdd={() => setVisible(true)}
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
            // 计算订单总金额
            const units =
              (item.groupBuy?.units as Array<{ id: string; unit: string; price: number }>) || []
            const selectedUnit = units.find(unit => unit.id === item.unitId)
            const itemTotalAmount = selectedUnit ? selectedUnit.price * item.quantity : 0

            return (
              <List.Item>
                {/* 自定义容器：左侧信息 + 右侧操作，保证响应式 */}
                <div className="flex w-full flex-col gap-3 md:flex-row md:items-start md:justify-between md:gap-4">
                  {/* 左侧信息区：标题、团购信息、数量、退款、描述 */}
                  <div className="min-w-0 flex-1 overflow-hidden pr-0 md:pr-4">
                    {/* 标题：进入订单详情 */}
                    <div className="mb-1">
                      <NavLink to={`/order/detail/${item.id}`}>
                        <Button
                          type="link"
                          style={{ padding: 0, height: 'auto' }}
                        >
                          <div className="flex min-w-0 flex-row flex-wrap items-center gap-2">
                            <span className="block max-w-full overflow-hidden text-ellipsis whitespace-nowrap text-lg font-medium md:overflow-visible md:whitespace-normal md:break-all">
                              {item.customer.name}
                            </span>
                            <span className="shrink-0">
                              <Tag color={OrderStatusMap[item.status].color}>
                                {OrderStatusMap[item.status].label}
                              </Tag>
                            </span>
                          </div>
                        </Button>
                      </NavLink>
                    </div>
                    <div className="space-y-1">
                      {item.groupBuy?.name && (
                        <div className="max-w-full overflow-hidden break-words text-gray-800 md:break-all">
                          <span>团购单：</span>
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
                      {selectedUnit?.unit && (
                        <div className="text-gray-800">
                          规格：<span className="text-blue-500">{selectedUnit.unit}</span>
                        </div>
                      )}
                      {item.quantity && (
                        <div className="text-gray-800">
                          购买数量：<span className="text-blue-500">{item.quantity}</span>
                        </div>
                      )}
                      {item.partialRefundAmount > 0 && item.status !== 'REFUNDED' && (
                        <div className="text-gray-800">
                          <span>退款：</span>
                          <span className="text-orange-600">
                            ¥{item.partialRefundAmount.toFixed(2)}
                          </span>
                          /<span className="text-blue-500">¥{itemTotalAmount.toFixed(2)}</span>
                        </div>
                      )}
                      {item.description && (
                        <div className="max-w-full overflow-hidden break-words text-gray-600 md:break-all">
                          <span className="block overflow-hidden text-ellipsis whitespace-nowrap md:whitespace-normal">
                            {item.description}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 右侧操作区：更新状态、部分退款、编辑、删除 */}
                  <div className="flex shrink-0 flex-row flex-wrap items-center justify-start gap-2 md:justify-end md:gap-3">
                    <UpdateOrderStatusButton
                      orderId={item.id}
                      status={item.status}
                      onSuccess={() => pageChange()}
                    />
                    <Button
                      key="edit"
                      color="primary"
                      variant="outlined"
                      onClick={() => handleModify(item.id)}
                    >
                      编辑
                    </Button>
                    <RefundButton
                      key="partial-refund"
                      orderId={item.id}
                      orderTotalAmount={itemTotalAmount}
                      currentRefundAmount={item.partialRefundAmount || 0}
                      orderStatus={item.status}
                      onSuccess={() => pageChange()}
                    />
                    <Popconfirm
                      key="delete"
                      title="确定要删除这个订单吗？"
                      description="删除后将无法恢复"
                      onConfirm={() => handleDelete(item.id)}
                      okText="确定"
                      cancelText="取消"
                    >
                      <Button
                        color="danger"
                        variant="solid"
                        loading={deleteLoading}
                      >
                        删除
                      </Button>
                    </Popconfirm>
                  </div>
                </div>
              </List.Item>
            )
          }}
        />
      </section>
      {visible && (
        <Modify
          id={currentId || undefined}
          visible={visible}
          setVisible={setVisible}
        />
      )}
    </>
  )
}
