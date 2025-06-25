import { Form, Input, Modal } from 'antd'

import useSupplierStore from '@/stores/supplierStore.ts'

interface params {
  visible: boolean
  setVisible: (value: boolean) => void
}

const CreateAndUpdate = (props: params) => {
  const { visible, setVisible } = props
  const [form] = Form.useForm()

  const createLoading = useSupplierStore(state => state.createLoading)
  const create = useSupplierStore(state => state.createSupplier)

  const handleOk = () => {
    form
      .validateFields()
      .then(async val => {
        const res = await create(val)
        if (res) {
          setVisible(false)
        }
      })
      .catch(err => {
        console.log(err)
      })
  }
  const handleCancel = () => {
    setVisible(false)
  }

  return (
    <>
      <Modal
        closable={{ 'aria-label': 'Custom Close Button' }}
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
          labelCol={{ span: 8 }}
          wrapperCol={{ span: 24 }}
          style={{ maxWidth: 600 }}
          autoComplete="off"
        >
          <Form.Item
            label="名称"
            name="name"
            rules={[{ required: true, message: 'Please input your username!' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            label="手机号"
            name="phone"
          >
            <Input />
          </Form.Item>
          <Form.Item
            label="微信号"
            name="wechat"
          >
            <Input />
          </Form.Item>
          <Form.Item
            label="描述"
            name="description"
          >
            <Input />
          </Form.Item>
          <Form.Item
            label="评价"
            name="rating"
          >
            <Input />
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}

export default CreateAndUpdate
