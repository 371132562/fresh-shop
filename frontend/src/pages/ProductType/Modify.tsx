import { Form, Input, message, Modal } from 'antd'
import { useEffect } from 'react'

import useProductTypeStore from '@/stores/productTypeStore.ts'

interface params {
  visible: boolean
  setVisible: (value: boolean) => void
  id: string | null //编辑时会提供此id
  setCurrentId: (value: string | null) => void
}

const Modify = (props: params) => {
  const { visible, setVisible, id, setCurrentId } = props
  const [form] = Form.useForm()

  const createLoading = useProductTypeStore(state => state.createLoading)
  const createProductType = useProductTypeStore(state => state.createProductType)
  const updateProductType = useProductTypeStore(state => state.updateProductType)
  const productType = useProductTypeStore(state => state.productType)
  const getProductType = useProductTypeStore(state => state.getProductType)
  const setProductType = useProductTypeStore(state => state.setProductType)

  useEffect(() => {
    if (id) {
      getProductType({ id })
    }
  }, [])

  useEffect(() => {
    form.setFieldsValue(productType)
  }, [productType])

  const handleOk = () => {
    form
      .validateFields()
      .then(async val => {
        const res = id ? await updateProductType({ ...val, id }) : await createProductType(val)
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
    setProductType(null)
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
            label="名称"
            name="name"
            rules={[{ required: true, message: '请输入商品类型名称' }]}
          >
            <Input placeholder="请输入商品类型名称" />
          </Form.Item>
          <Form.Item
            label="备注"
            name="description"
          >
            <Input placeholder="请输入商品类型描述" />
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}

export default Modify
