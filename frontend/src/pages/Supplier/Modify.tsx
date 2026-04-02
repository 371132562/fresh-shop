import { Form, Input, message, Modal } from 'antd'
import { useEffect, useMemo, useState } from 'react'

import ImagesUpload, { type ManagedUploadFile } from '@/components/ImagesUpload'
import useSupplierStore from '@/stores/supplierStore.ts'
import { buildImageUrl, validatePhoneNumber } from '@/utils'
import { createManagedUploadFile } from '@/utils/uploadFiles'

interface params {
  visible: boolean
  setVisible: (value: boolean) => void
  id?: string //编辑时会提供此id
}

const Modify = (props: params) => {
  const { visible, setVisible, id } = props
  const [form] = Form.useForm()

  const [fileList, setFileList] = useState<ManagedUploadFile[] | null>(null)

  const createLoading = useSupplierStore(state => state.createLoading)
  const createSupplier = useSupplierStore(state => state.createSupplier)
  const updateSupplier = useSupplierStore(state => state.updateSupplier)
  const supplier = useSupplierStore(state => state.supplier)

  const initialFileList = useMemo<ManagedUploadFile[]>(() => {
    const sourceImages = supplier?.images
    if (!Array.isArray(sourceImages) || sourceImages.length === 0) {
      return []
    }

    return sourceImages
      .filter((image): image is string => typeof image === 'string')
      .map(image => createManagedUploadFile(image, buildImageUrl(image)))
  }, [supplier?.images])

  const resolvedFileList = fileList ?? initialFileList

  useEffect(() => {
    if (id && supplier) {
      form.setFieldsValue(supplier)
    }
  }, [form, id, supplier])

  const handleOk = () => {
    form
      .validateFields()
      .then(async val => {
        const params = {
          ...val,
          images: resolvedFileList.map(item => {
            if (item.response?.data?.filename) {
              return item.response.data.filename
            }
            return item.filename || ''
          })
        }
        const res = id ? await updateSupplier({ ...params, id }) : await createSupplier(params)
        if (res) {
          message.success(id ? '编辑成功' : '添加成功')
          setVisible(false)
        }
      })
      .catch(err => {
        message.warning('表单未填写完整')
        console.log(err)
      })
  }

  const handleCancel = () => {
    setVisible(false)
    setFileList(null)
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
            rules={[{ required: true, message: '请输入供货商名称' }]}
          >
            <Input placeholder="请输入供货商名称" />
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
            <Input placeholder="请输入供货商描述" />
          </Form.Item>
          <Form.Item
            label="评价"
            name="rating"
          >
            <Input placeholder="请输入供货商评价" />
          </Form.Item>
          <ImagesUpload
            id={id || ''}
            fileList={resolvedFileList}
            setFileList={setFileList}
            type="supplier"
          />
        </Form>
      </Modal>
    </>
  )
}

export default Modify
