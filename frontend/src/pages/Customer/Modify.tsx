import { Button, Form, Input, message, Modal, Popconfirm, Select } from 'antd'
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
  const deleteCustomer = useCustomerStore(state => state.deleteCustomer)

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
          setVisible(false)
        }
      })
      .catch(err => {
        console.log(err)
      })
  }

  const handleCancel = () => {
    setVisible(false)
    setCustomer(null)
    setCurrentId(null)
  }

  const handleDelete = async () => {
    const res = await deleteCustomer({ id: id as string })
    if (res) {
      message.success('删除成功')
      setVisible(false)
    }
  }

  return (
    <>
      <Modal
        open={visible}
        onOk={handleOk}
        onCancel={handleCancel}
        loading={createLoading}
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
            <Input placeholder="必填" />
          </Form.Item>
          <Form.Item
            label="地址"
            name="customerAddressId"
          >
            <Select
              loading={getAllCustomerAddressLoading}
              showSearch
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
            <Input placeholder="选填" />
          </Form.Item>
          <Form.Item
            label="微信号"
            name="wechat"
          >
            <Input placeholder="选填" />
          </Form.Item>
          <Form.Item
            label="描述"
            name="description"
          >
            <Input placeholder="选填，如供货商品类等" />
          </Form.Item>
          <Form.Item label="操作">
            <Popconfirm
              title={<div className="text-lg">确定要删除这个客户吗？</div>}
              onConfirm={handleDelete}
              okText="是"
              cancelText="否"
              okButtonProps={{ size: 'large', color: 'danger', variant: 'solid' }}
              cancelButtonProps={{ size: 'large', color: 'primary', variant: 'outlined' }}
            >
              <Button
                color="danger"
                variant="solid"
              >
                删除
              </Button>
            </Popconfirm>
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}

export default Modify
