import { PlusOutlined, SearchOutlined } from '@ant-design/icons'
import { Button, FloatButton, Form, Input, List, Modal, Select, Tag } from 'antd'
import { useEffect, useState } from 'react'

import useCustomerAddressStore from '@/stores/customerAddressStore.ts'
import useCustomerStore from '@/stores/customerStore.ts'
import { validatePhoneNumber } from '@/utils'

import Modify from './Modify.tsx'

export const Component = () => {
  const [visible, setVisible] = useState(false)
  const [currentId, setCurrentId] = useState<string | null>(null)
  const [searchVisible, setSearchVisible] = useState(false)
  const [form] = Form.useForm()

  const listLoading = useCustomerStore(state => state.listLoading)
  const customersList = useCustomerStore(state => state.customersList)
  const listCount = useCustomerStore(state => state.listCount)
  const pageParams = useCustomerStore(state => state.pageParams)
  const setPageParams = useCustomerStore(state => state.setPageParams)

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
              <div>共 {listCount.totalCount} 个</div>
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
                  <>
                    {item.orderCount !== undefined && (
                      <div>
                        订单数量：
                        <span className="text-blue-500">{item.orderCount}</span> 条
                      </div>
                    )}
                    <span>{item.description || ''}</span>
                  </>
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
        open={searchVisible}
        onOk={handleOk}
        onCancel={handleCancel}
        loading={listLoading}
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
