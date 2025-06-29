import { Form, Input, Modal } from 'antd'
import { useEffect } from 'react'

import useProductTypeStore from '@/stores/productTypeStore.ts'

interface params {
  visible: boolean
  setVisible: (value: boolean) => void
  id: string | null //编辑时会提供此id
}

const Modify = (props: params) => {
  const { visible, setVisible, id } = props
  const [form] = Form.useForm()

  const createLoading = useProductTypeStore(state => state.createLoading)
  const createProductType = useProductTypeStore(state => state.createProductType)
  const updateProductType = useProductTypeStore(state => state.updateProductType)
  const productType = useProductTypeStore(state => state.productType)

  useEffect(() => {
    if (id) {
      form.setFieldsValue(productType)
    }
  }, [])

  const handleOk = () => {
    form
      .validateFields()
      .then(async val => {
        const res = id ? await updateProductType({ ...val, id }) : await createProductType(val)
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
        open={visible}
        onOk={handleOk}
        onCancel={handleCancel}
        loading={createLoading}
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
            rules={[{ required: true, message: '请输入商品类型名称' }]}
          >
            <Input placeholder="必填" />
          </Form.Item>
          <Form.Item
            label="描述"
            name="description"
          >
            <Input placeholder="选填" />
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}

export default Modify
