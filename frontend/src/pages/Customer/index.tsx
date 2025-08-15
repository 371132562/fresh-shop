import { PlusOutlined, SearchOutlined } from '@ant-design/icons'
import {
  Button,
  Descriptions,
  FloatButton,
  Form,
  Input,
  List,
  Modal,
  Select,
  Table,
  Tag
} from 'antd'
import { useEffect, useState } from 'react'

import useCustomerAddressStore from '@/stores/customerAddressStore.ts'
import useCustomerStore from '@/stores/customerStore.ts'
import { validatePhoneNumber } from '@/utils'

import Modify from './Modify.tsx'

export const Component = () => {
  const [visible, setVisible] = useState(false)
  const [currentId, setCurrentId] = useState<string | null>(null)
  const [searchVisible, setSearchVisible] = useState(false)
  const [consumptionDetailVisible, setConsumptionDetailVisible] = useState(false)
  const [form] = Form.useForm()

  const listLoading = useCustomerStore(state => state.listLoading)
  const customersList = useCustomerStore(state => state.customersList)
  const listCount = useCustomerStore(state => state.listCount)
  const pageParams = useCustomerStore(state => state.pageParams)
  const setPageParams = useCustomerStore(state => state.setPageParams)
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
      name: '',
      customerAddressIds: [],
      wechat: '',
      phone: ''
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

  const handleConsumptionDetail = (id: string) => {
    setCurrentId(id)
    getConsumptionDetail(id)
    setConsumptionDetailVisible(true)
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
                  搜索客户
                </Button>
              </div>
              <div className="flex items-center gap-4">
                <Select
                  value={`${pageParams.sortField}_${pageParams.sortOrder}`}
                  style={{ width: 180 }}
                  onChange={value => {
                    const [sortField, sortOrder] = value.split('_') as [string, string]
                    setPageParams({
                      sortField: sortField as any,
                      sortOrder: sortOrder as any,
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
          dataSource={customersList}
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
                    <Tag color="#55acee">{item.customerAddressName}</Tag>
                  </Button>
                }
                description={
                  <div className="flex items-start justify-between">
                    <div>
                      {item.orderCount !== undefined && (
                        <div className="mb-1 font-medium text-gray-800">
                          订单数量：<span className="text-blue-500">{item.orderCount}</span> 条
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
                      {item.description && <div className="text-gray-600">{item.description}</div>}
                    </div>
                    <Button
                      type="primary"
                      ghost
                      onClick={() => handleConsumptionDetail(item.id)}
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
      <Modal
        title="消费详情"
        open={consumptionDetailVisible}
        onCancel={() => {
          setConsumptionDetailVisible(false)
          resetConsumptionDetail()
          setCurrentId(null)
        }}
        width={800}
        footer={null}
      >
        {consumptionDetailLoading ? (
          <div className="flex h-60 items-center justify-center">
            <div className="text-lg">加载中...</div>
          </div>
        ) : consumptionDetail ? (
          <div className="!space-y-4">
            <Descriptions
              title="基础信息"
              bordered
              column={1}
              className="bg-white"
            >
              <Descriptions.Item label="订单数量">
                <span className="text-blue-500">{consumptionDetail.orderCount}</span> 条
              </Descriptions.Item>
              <Descriptions.Item label="订单总额">
                <span className="text-green-500">¥{consumptionDetail.totalAmount.toFixed(2)}</span>
              </Descriptions.Item>
              <Descriptions.Item label="每单平均价格">
                <span className="text-orange-500">
                  ¥{consumptionDetail.averagePricePerOrder.toFixed(2)}
                </span>
              </Descriptions.Item>
            </Descriptions>

            <div>
              <div className="mb-4 text-lg font-medium">购买的商品</div>
              <Table
                dataSource={consumptionDetail.topProducts}
                pagination={false}
                size="middle"
                className="bg-white"
              >
                <Table.Column
                  title="商品名称"
                  dataIndex="productName"
                  key="productName"
                />
                <Table.Column
                  title="购买次数"
                  dataIndex="count"
                  key="count"
                  render={count => <Tag color="blue">{count} 次</Tag>}
                />
              </Table>
            </div>

            <div>
              <div className="mb-4 text-lg font-medium">参与的团购</div>
              <Table
                dataSource={consumptionDetail.topGroupBuys}
                pagination={false}
                size="middle"
                className="bg-white"
              >
                <Table.Column
                  title="团购名称"
                  dataIndex="groupBuyName"
                  key="groupBuyName"
                />
                <Table.Column
                  title="参与次数"
                  dataIndex="count"
                  key="count"
                  render={count => <Tag color="green">{count} 次</Tag>}
                />
              </Table>
            </div>
          </div>
        ) : (
          <div className="flex h-60 items-center justify-center">
            <div className="text-lg text-gray-500">暂无消费记录</div>
          </div>
        )}
      </Modal>
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
          <Form.Item
            label="按地址搜索(可多选)"
            name="customerAddressIds"
          >
            <Select
              loading={getAllCustomerAddressLoading}
              showSearch
              mode="multiple"
              allowClear
            >
              {allCustomerAddress.map(item => {
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
            label="按手机号搜索"
            name="phone"
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
            <Input maxLength={11} />
          </Form.Item>
          <Form.Item
            label="按微信号搜索"
            name="wechat"
          >
            <Input />
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}
