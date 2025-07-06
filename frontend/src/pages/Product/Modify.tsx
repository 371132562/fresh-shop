import { Button, Form, Input, message, Modal, Popconfirm, Select } from 'antd'
import { useEffect } from 'react'

import useProductStore from '@/stores/productStore.ts'
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

  const createLoading = useProductStore(state => state.createLoading)
  const createProduct = useProductStore(state => state.createProduct)
  const updateProduct = useProductStore(state => state.updateProduct)
  const product = useProductStore(state => state.product)
  const getProduct = useProductStore(state => state.getProduct)
  const setProduct = useProductStore(state => state.setProduct)
  const deleteProduct = useProductStore(state => state.deleteProduct)

  const allProductTypes = useProductTypeStore(state => state.allProductTypes)
  const getAllProductTypesLoading = useProductTypeStore(state => state.getAllProductTypesLoading)

  useEffect(() => {
    if (id) {
      getProduct({ id })
    }
  }, [])

  useEffect(() => {
    form.setFieldsValue(product)
  }, [product])

  const handleOk = () => {
    form
      .validateFields()
      .then(async val => {
        const res = id ? await updateProduct({ ...val, id }) : await createProduct(val)
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
    setProduct(null)
    setCurrentId(null)
  }

  const handleDelete = async () => {
    const res = await deleteProduct({ id: id as string })
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
          labelCol={{ span: 24 }}
          wrapperCol={{ span: 24 }}
          style={{ maxWidth: 600 }}
          autoComplete="off"
        >
          <Form.Item
            label="名称"
            name="name"
            rules={[{ required: true, message: '请输入商品名称' }]}
          >
            <Input placeholder="必填" />
          </Form.Item>
          <Form.Item
            label="商品类型"
            name="productTypeId"
            rules={[{ required: true, message: '请选择商品类型' }]}
          >
            <Select
              loading={getAllProductTypesLoading}
              showSearch
              allowClear
            >
              {allProductTypes.map(item => {
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
            label="备注"
            name="description"
          >
            <Input placeholder="选填" />
          </Form.Item>
          <Form.Item label="操作">
            <Popconfirm
              title={<div className="text-lg">确定要删除这个商品吗？</div>}
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
