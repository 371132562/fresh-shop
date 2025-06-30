import type { UploadFile } from 'antd'
import { Form, Input, message, Modal } from 'antd'
import { Supplier } from 'fresh-shop-backend/types/dto.ts'
import { useEffect, useState } from 'react'

import ImagesUpload from '@/components/ImagesUpload'
import useSupplierStore from '@/stores/supplierStore.ts'

interface params {
  visible: boolean
  setVisible: (value: boolean) => void
  id?: string //编辑时会提供此id
}

const Modify = (props: params) => {
  const { visible, setVisible, id } = props
  const [form] = Form.useForm()

  const [fileList, setFileList] = useState<UploadFile[] | Array<{ filename: string }>>([])

  const createLoading = useSupplierStore(state => state.createLoading)
  const createSupplier = useSupplierStore(state => state.createSupplier)
  const updateSupplier = useSupplierStore(state => state.updateSupplier)
  const supplier = useSupplierStore(state => state.supplier)

  useEffect(() => {
    if (id) {
      form.setFieldsValue(supplier)
      const { images } = supplier as Supplier
      const imagesArr = JSON.parse(images)
      if (imagesArr.length > 0) {
        setFileList(
          imagesArr.map((image: string) => ({
            url: import.meta.env.VITE_SERVER_URL + import.meta.env.VITE_IMAGES_BASE_URL + image,
            filename: image
          }))
        )
      }
    }
  }, [])

  const handleOk = () => {
    form
      .validateFields()
      .then(async val => {
        const params = {
          ...val,
          images: JSON.stringify(
            fileList.map(item => {
              if ('response' in item) {
                // 检查 item 是否包含 'response' 属性
                return (item as UploadFile).response.data.url
              } else {
                return (item as { filename: string }).filename
              }
            })
          )
        }
        const res = id ? await updateSupplier({ ...params, id }) : await createSupplier(params)
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
            rules={[{ required: true, message: '请输入供货商名称' }]}
          >
            <Input placeholder="必填" />
          </Form.Item>
          <Form.Item
            label="手机号"
            name="phone"
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
          <Form.Item
            label="评价"
            name="rating"
          >
            <Input placeholder="选填，如过往印象等" />
          </Form.Item>
          <ImagesUpload
            id={id || ''}
            fileList={fileList as UploadFile[]}
            setFileList={setFileList}
          />
        </Form>
      </Modal>
    </>
  )
}

export default Modify
