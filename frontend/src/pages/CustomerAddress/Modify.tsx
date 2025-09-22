import { Form, Input, message, Modal } from 'antd'
import { useEffect } from 'react'

import useCustomerAddressStore from '@/stores/customerAddressStore.ts'

interface params {
  visible: boolean
  setVisible: (value: boolean) => void
  id: string | null //编辑时会提供此id
  setCurrentId: (value: string | null) => void
}

const Modify = (props: params) => {
  const { visible, setVisible, id, setCurrentId } = props
  const [form] = Form.useForm()

  const createLoading = useCustomerAddressStore(state => state.createLoading)
  const createCustomerAddress = useCustomerAddressStore(state => state.createCustomerAddress)
  const updateCustomerAddress = useCustomerAddressStore(state => state.updateCustomerAddress)
  const customerAddress = useCustomerAddressStore(state => state.customerAddress)
  const getCustomerAddress = useCustomerAddressStore(state => state.getCustomerAddress)
  const setCustomerAddress = useCustomerAddressStore(state => state.setCustomerAddress)

  useEffect(() => {
    if (id) {
      getCustomerAddress({ id })
    }
  }, [])

  useEffect(() => {
    form.setFieldsValue(customerAddress)
  }, [customerAddress])

  const handleOk = () => {
    form
      .validateFields()
      .then(async val => {
        const res = id
          ? await updateCustomerAddress({ ...val, id })
          : await createCustomerAddress(val)
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
    setCustomerAddress(null)
    setCurrentId(null)
  }

  return (
    <>
      <Modal
        open={visible}
        onOk={handleOk}
        onCancel={handleCancel}
        confirmLoading={createLoading}
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
            label="地址"
            name="name"
            rules={[{ required: true, message: '请输入地址' }]}
          >
            <Input placeholder="必填" />
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}

export default Modify
