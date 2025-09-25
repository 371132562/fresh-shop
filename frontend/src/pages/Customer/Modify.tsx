import { Form, Input, message, Modal, Select } from 'antd'
import { useEffect } from 'react'

import useCustomerAddressStore from '@/stores/customerAddressStore.ts'
import useCustomerStore from '@/stores/customerStore.ts'
import { validatePhoneNumber } from '@/utils'

interface params {
  visible: boolean
  setVisible: (value: boolean) => void
  id: string | null //编辑时会提供此id
  setCurrentId: (value: string | null) => void
}

const Modify = (props: params) => {
  const { visible, setVisible, id, setCurrentId } = props
  const [form] = Form.useForm()

  const createLoading = useCustomerStore(state => state.createLoading)
  const createCustomer = useCustomerStore(state => state.createCustomer)
  const updateCustomer = useCustomerStore(state => state.updateCustomer)
  const customer = useCustomerStore(state => state.customer)
  const getCustomer = useCustomerStore(state => state.getCustomer)
  const setCustomer = useCustomerStore(state => state.setCustomer)

  const allCustomerAddress = useCustomerAddressStore(state => state.allCustomerAddress)
  const getAllCustomerAddressLoading = useCustomerAddressStore(
    state => state.getAllCustomerAddressLoading
  )

  useEffect(() => {
    if (id) {
      getCustomer({ id })
    }
  }, [])

  useEffect(() => {
    form.setFieldsValue(customer)
  }, [customer])

  const handleOk = () => {
    form
      .validateFields()
      .then(async val => {
        const res = id ? await updateCustomer({ ...val, id }) : await createCustomer(val)
        if (res) {
          message.success(id ? '编辑成功' : '添加成功')
          handleCancel()
        }
      })
      .catch(err => {
        message.warning('表单未填写完整')
        console.log(err)
      })
  }

  const handleCancel = () => {
    setVisible(false)
    setCustomer(null)
    setCurrentId(null)
  }

  return (
    <>
      <Modal
        open={visible}
        onOk={handleOk}
        onCancel={handleCancel}
        confirmLoading={createLoading}
        style={{ top: 20 }}
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
            label="名称"
            name="name"
            rules={[{ required: true, message: '请输入客户名称' }]}
          >
            <Input placeholder="请输入客户姓名" />
          </Form.Item>
          <Form.Item
            label="地址"
            name="customerAddressId"
          >
            <Select
              loading={getAllCustomerAddressLoading}
              showSearch
              allowClear
              placeholder="请选择客户地址"
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
            label="手机号"
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
            <Input
              placeholder="请输入联系电话"
              maxLength={11}
            />
          </Form.Item>
          <Form.Item
            label="微信号"
            name="wechat"
          >
            <Input placeholder="请输入微信账号" />
          </Form.Item>
          <Form.Item
            label="备注"
            name="description"
          >
            <Input placeholder="请输入客户备注" />
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}

export default Modify
