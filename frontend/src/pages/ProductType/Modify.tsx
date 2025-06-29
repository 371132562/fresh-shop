import { Button, Form, Input, message, Modal, Popconfirm } from 'antd'
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
  const getProductType = useProductTypeStore(state => state.getProductType)
  const setProductType = useProductTypeStore(state => state.setProductType)
  const deleteProductType = useProductTypeStore(state => state.deleteProductType)

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
          setVisible(false)
        }
      })
      .catch(err => {
        console.log(err)
      })
  }

  const handleCancel = () => {
    setVisible(false)
    setProductType(null)
  }

  const handleDelete = async () => {
    const res = await deleteProductType({ id: id as string })
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
          <Form.Item label="操作">
            <Popconfirm
              title={<div className="text-lg">确定要删除这个商品分类吗？</div>}
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
