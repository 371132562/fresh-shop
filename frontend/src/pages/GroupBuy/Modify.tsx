import { MinusCircleOutlined, PlusOutlined } from '@ant-design/icons'
import type { UploadFile } from 'antd'
import { Button, DatePicker, Form, Input, InputNumber, message, Modal, Select, Space } from 'antd'
import dayjs from 'dayjs'
import { GroupBuy } from 'fresh-shop-backend/types/dto.ts'
import { useEffect, useState } from 'react'
import { v4 as uuidv4 } from 'uuid' // 用于生成单位ID

import ImagesUpload from '@/components/ImagesUpload'
import useGroupBuyStore from '@/stores/groupBuyStore.ts'
import useProductStore from '@/stores/productStore.ts'
import useSupplierStore from '@/stores/supplierStore.ts'

interface params {
  visible: boolean
  setVisible: (value: boolean) => void
  id?: string //编辑时会提供此id
  againGroupBuy?: GroupBuy | null
}

const Modify = (props: params) => {
  const { visible, setVisible, id, againGroupBuy } = props
  const [form] = Form.useForm()

  const [fileList, setFileList] = useState<UploadFile[] | Array<{ filename: string }>>([])

  const createLoading = useGroupBuyStore(state => state.createLoading)
  const createGroupBuy = useGroupBuyStore(state => state.createGroupBuy)
  const updateGroupBuy = useGroupBuyStore(state => state.updateGroupBuy)
  const groupBuy = useGroupBuyStore(state => state.groupBuy)
  const allSupplierList = useSupplierStore(state => state.allSupplierList)
  const getAllSuppliers = useSupplierStore(state => state.getAllSuppliers)
  const getAllSuppliersLoading = useSupplierStore(state => state.getAllSuppliersLoading)
  const allProductsList = useProductStore(state => state.allProductsList)
  const getAllProducts = useProductStore(state => state.getAllProducts)
  const getAllProductsListLoading = useProductStore(state => state.getAllProductsListLoading)

  useEffect(() => {
    getAllSuppliers()
    getAllProducts()
    if (id && groupBuy) {
      const formVal = {
        ...groupBuy,
        groupBuyStartDate: dayjs(groupBuy.groupBuyStartDate)
      }
      form.setFieldsValue(formVal)
      const { images } = groupBuy as GroupBuy
      const imagesArr = images
      if (Array.isArray(imagesArr) && imagesArr.length > 0) {
        setFileList(
          imagesArr
            .filter((image): image is string => typeof image === 'string')
            .map(image => ({
              url:
                '//' +
                location.hostname +
                (location.port ? import.meta.env.VITE_IMAGES_PORT : '') +
                import.meta.env.VITE_IMAGES_BASE_URL +
                image,
              filename: image
            }))
        )
      }
    }
    if (againGroupBuy) {
      const formVal = {
        ...groupBuy,
        groupBuyStartDate: null
      }
      form.setFieldsValue(formVal)
      const { images } = groupBuy as GroupBuy
      const imagesArr = images
      if (Array.isArray(imagesArr) && imagesArr.length > 0) {
        setFileList(
          imagesArr
            .filter((image): image is string => typeof image === 'string')
            .map(image => ({
              url:
                '//' +
                location.hostname +
                (location.port ? import.meta.env.VITE_IMAGES_PORT : '') +
                import.meta.env.VITE_IMAGES_BASE_URL +
                image,
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
          units: val.units.map((item: any) => {
            if (!item.id) {
              return {
                id: uuidv4(),
                ...item
              }
            }
            return item
          }),
          images: fileList.map(item => {
            if ('response' in item) {
              // 检查 item 是否包含 'response' 属性
              return (item as UploadFile).response.data.url
            } else {
              return (item as { filename: string }).filename
            }
          })
        }
        const res = id ? await updateGroupBuy({ ...params, id }) : await createGroupBuy(params)
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
  }

  const filterOption = (input: string, option: any) => {
    return (option?.children ?? '').toLowerCase().includes(input.toLowerCase())
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
            rules={[{ required: true, message: '请输入团购名称' }]}
          >
            <Input placeholder="必填" />
          </Form.Item>
          <Form.Item
            label="发起时间"
            name="groupBuyStartDate"
            rules={[{ required: true, message: '请选择发起时间' }]}
          >
            <DatePicker
              inputReadOnly
              style={{ width: '100%' }}
            />
          </Form.Item>
          <Form.Item
            label="供应商"
            name="supplierId"
            rules={[{ required: true, message: '请选择供货商' }]}
          >
            <Select
              loading={getAllSuppliersLoading}
              showSearch
              allowClear
              placeholder="请选择供应商"
              filterOption={filterOption}
            >
              {allSupplierList.map(item => {
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
            label="商品"
            name="productId"
            rules={[{ required: true, message: '请选择商品' }]}
          >
            <Select
              loading={getAllProductsListLoading}
              showSearch
              allowClear
              placeholder="请选择商品"
              filterOption={filterOption}
            >
              {allProductsList.map(item => {
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
          <Form.List name="units">
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name, ...restField }) => (
                  <Space
                    key={key}
                    style={{ display: 'flex', marginBottom: 8 }}
                    align="baseline"
                  >
                    <Form.Item
                      {...restField}
                      name={[name, 'unit']}
                      rules={[{ required: true, message: '请输入计量单位' }]}
                    >
                      <Input placeholder="计量单位" />
                    </Form.Item>
                    <Form.Item
                      {...restField}
                      name={[name, 'price']}
                      rules={[{ required: true, message: '请输入售价' }]}
                    >
                      <InputNumber
                        prefix="￥"
                        placeholder="售价"
                        precision={2}
                      />
                    </Form.Item>
                    <Form.Item
                      {...restField}
                      name={[name, 'costPrice']}
                      rules={[{ required: true, message: '请输入成本价' }]}
                    >
                      <InputNumber
                        prefix="￥"
                        placeholder="成本价"
                        precision={2}
                      />
                    </Form.Item>
                    <MinusCircleOutlined onClick={() => remove(name)} />
                  </Space>
                ))}
                <Form.Item>
                  <Button
                    type="dashed"
                    onClick={() => add()}
                    block
                    icon={<PlusOutlined />}
                  >
                    添加一个规格
                  </Button>
                </Form.Item>
              </>
            )}
          </Form.List>
          <Form.Item
            label="备注"
            name="description"
          >
            <Input placeholder="选填" />
          </Form.Item>
          <ImagesUpload
            id={id || ''}
            fileList={fileList as UploadFile[]}
            setFileList={setFileList}
            type="groupBuy"
          />
        </Form>
      </Modal>
    </>
  )
}

export default Modify
