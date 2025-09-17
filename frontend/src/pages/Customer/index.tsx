import { Button, Card, Col, Form, Input, List, Popconfirm, Row, Select, Tag } from 'antd'
import type { CustomerSortField, SortOrder } from 'fresh-shop-backend/types/dto'
import { useEffect, useState } from 'react'

import SearchToolbar from '@/components/SearchToolbar'
import ConsumptionDetailStatsModal from '@/pages/Analysis/components/ConsumptionDetailStatsModal'
import useCustomerAddressStore from '@/stores/customerAddressStore.ts'
import useCustomerStore from '@/stores/customerStore.ts'
import { validatePhoneNumber } from '@/utils'

import Modify from './Modify.tsx'

export const Component = () => {
  const [visible, setVisible] = useState(false)
  const [currentId, setCurrentId] = useState<string | null>(null)
  const [consumptionDetailVisible, setConsumptionDetailVisible] = useState(false)
  const [form] = Form.useForm()

  const listLoading = useCustomerStore(state => state.listLoading)
  const customersList = useCustomerStore(state => state.customersList)
  const listCount = useCustomerStore(state => state.listCount)
  const pageParams = useCustomerStore(state => state.pageParams)
  const setPageParams = useCustomerStore(state => state.setPageParams)
  const deleteCustomer = useCustomerStore(state => state.deleteCustomer)
  const deleteLoading = useCustomerStore(state => state.deleteLoading)
  const getConsumptionDetail = useCustomerStore(state => state.getConsumptionDetail)
  const consumptionDetail = useCustomerStore(state => state.consumptionDetail)
  const consumptionDetailLoading = useCustomerStore(state => state.consumptionDetailLoading)
  const resetConsumptionDetail = useCustomerStore(state => state.resetConsumptionDetail)

  const getAllCustomerAddress = useCustomerAddressStore(state => state.getAllCustomerAddress)
  const getAllCustomerAddressLoading = useCustomerAddressStore(
    state => state.getAllCustomerAddressLoading
  )
  const allCustomerAddress = useCustomerAddressStore(state => state.allCustomerAddress)

  useEffect(() => {
    pageChange()
    form.setFieldsValue(pageParams)
    getAllCustomerAddress()
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
      name: '',
      customerAddressIds: [],
      wechat: '',
      phone: ''
    }
    form.setFieldsValue(resetValues)
    setPageParams({
      page: 1,
      ...resetValues
    })
  }

  const handleModify = (id: string) => {
    setCurrentId(id)
    setVisible(true)
  }

  const handleConsumptionDetail = (id: string) => {
    setCurrentId(id)
    getConsumptionDetail({ id })
    setConsumptionDetailVisible(true)
  }

  // 删除客户
  const handleDelete = async (id: string) => {
    const success = await deleteCustomer({ id })
    if (success) {
      // 删除成功后刷新列表
      pageChange()
    }
  }

  // 关闭消费详情模态框（包含额外的currentId重置逻辑）
  const handleCloseConsumptionDetail = () => {
    setConsumptionDetailVisible(false)
    resetConsumptionDetail()
    setCurrentId(null)
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
                label="客户名称"
                name="name"
                className="!mb-1"
              >
                <Input
                  placeholder="请输入客户名称"
                  allowClear
                  onPressEnter={handleSearch}
                  onClear={handleSearch}
                />
              </Form.Item>
            </Col>
            <Col
              xs={24}
              sm={12}
              md={8}
            >
              <Form.Item
                label="客户地址"
                name="customerAddressIds"
                className="!mb-1"
              >
                <Select
                  placeholder="请选择客户地址"
                  loading={getAllCustomerAddressLoading}
                  showSearch
                  mode="multiple"
                  allowClear
                  onChange={handleSearch}
                  onClear={handleSearch}
                  filterOption={(input, option) =>
                    String(option?.children || '')
                      .toLowerCase()
                      .includes(input.toLowerCase())
                  }
                  popupMatchSelectWidth={300}
                >
                  {allCustomerAddress.map(item => (
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
                label="手机号"
                name="phone"
                className="!mb-1"
                rules={[
                  {
                    required: false,
                    message: '请输入手机号！'
                  },
                  {
                    validator: validatePhoneNumber
                  }
                ]}
              >
                <Input
                  placeholder="请输入手机号"
                  maxLength={11}
                  allowClear
                  onPressEnter={handleSearch}
                  onClear={handleSearch}
                />
              </Form.Item>
            </Col>
            <Col
              xs={24}
              sm={12}
              md={8}
            >
              <Form.Item
                label="微信号"
                name="wechat"
                className="!mb-1"
              >
                <Input
                  placeholder="请输入微信号"
                  allowClear
                  onPressEnter={handleSearch}
                  onClear={handleSearch}
                />
              </Form.Item>
            </Col>
          </Row>
          {/* 工具栏区域 */}
          <SearchToolbar
            sortOptions={[
              { label: '按添加时间倒序', value: 'createdAt_desc' },
              { label: '按添加时间正序', value: 'createdAt_asc' },
              { label: '按订单数量倒序', value: 'orderCount_desc' },
              { label: '按订单数量正序', value: 'orderCount_asc' },
              { label: '按订单总额倒序', value: 'orderTotalAmount_desc' },
              { label: '按订单总额正序', value: 'orderTotalAmount_asc' }
            ]}
            sortValue={`${pageParams.sortField}_${pageParams.sortOrder}`}
            onSortChange={value => {
              const [sortField, sortOrder] = value.split('_') as [string, string]
              setPageParams({
                sortField: sortField as CustomerSortField,
                sortOrder: sortOrder as SortOrder,
                page: 1
              })
            }}
            onSearch={handleSearch}
            onReset={resetSearch}
            searchLoading={listLoading}
            totalCount={listCount.totalCount}
            countLabel="个客户"
            onAdd={() => setVisible(true)}
          />
        </Form>
      </Card>

      {/* 客户列表 */}
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
          dataSource={customersList}
          renderItem={item => (
            <List.Item
              actions={[
                <Button
                  key="consumption"
                  color="default"
                  variant="outlined"
                  onClick={() => handleConsumptionDetail(item.id)}
                >
                  查看消费详情
                </Button>,
                <Button
                  key="edit"
                  color="primary"
                  variant="outlined"
                  onClick={() => handleModify(item.id)}
                >
                  编辑
                </Button>,
                <Popconfirm
                  key="delete"
                  title="确定要删除这个客户吗？"
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
              ]}
            >
              <List.Item.Meta
                title={
                  <Button
                    type="link"
                    style={{ padding: 0, height: 'auto' }}
                    onClick={() => {
                      handleModify(item.id)
                    }}
                  >
                    <span className="text-lg font-medium">{item.name}</span>
                    <Tag color="#55acee">{item.customerAddressName}</Tag>
                  </Button>
                }
                description={
                  <div>
                    {item.orderCount !== undefined && (
                      <div className="mb-1 font-medium text-gray-800">
                        订单数量：<span className="text-blue-500">{item.orderCount}</span>
                      </div>
                    )}
                    {item.orderTotalAmount !== undefined && (
                      <div className="mb-1 font-medium text-gray-800">
                        <span>订单总额：</span>
                        <span className="text-green-500">¥{item.orderTotalAmount.toFixed(2)}</span>
                      </div>
                    )}
                    {item.description && <div className="text-gray-600">{item.description}</div>}
                  </div>
                }
              />
            </List.Item>
          )}
        />
      </section>
      {visible && (
        <Modify
          id={currentId}
          visible={visible}
          setVisible={setVisible}
          setCurrentId={setCurrentId}
        />
      )}
      {/* 消费详情模态框 */}
      <ConsumptionDetailStatsModal
        visible={consumptionDetailVisible}
        onClose={handleCloseConsumptionDetail}
        consumptionDetail={consumptionDetail}
        loading={consumptionDetailLoading}
      />
    </>
  )
}
