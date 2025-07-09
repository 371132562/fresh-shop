import { Button, Form, Input, Modal, notification, Popconfirm } from 'antd'
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
  const [noti, contextHolder] = notification.useNotification()

  const createLoading = useCustomerAddressStore(state => state.createLoading)
  const createCustomerAddress = useCustomerAddressStore(state => state.createCustomerAddress)
  const updateCustomerAddress = useCustomerAddressStore(state => state.updateCustomerAddress)
  const customerAddress = useCustomerAddressStore(state => state.customerAddress)
  const getCustomerAddress = useCustomerAddressStore(state => state.getCustomerAddress)
  const setCustomerAddress = useCustomerAddressStore(state => state.setCustomerAddress)
  const deleteCustomerAddress = useCustomerAddressStore(state => state.deleteCustomerAddress)

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
          noti.success({
            message: '成功',
            description: id ? '编辑成功' : '添加成功'
          })
          handleCancel()
        }
      })
      .catch(err => {
        noti.warning({
          message: '警告',
          description: '表单未填写完整'
        })
        console.log(err)
      })
  }

  const handleCancel = () => {
    setVisible(false)
    setCustomerAddress(null)
    setCurrentId(null)
  }

  const handleDelete = async () => {
    const res = await deleteCustomerAddress({ id: id as string })
    if (res) {
      noti.success({
        message: '成功',
        description: '删除成功'
      })
      setVisible(false)
    }
  }

  return (
    <>
      {contextHolder}
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
          <Form.Item label="操作">
            <Popconfirm
              title={<div className="text-lg">确定要删除这个地址吗？</div>}
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
