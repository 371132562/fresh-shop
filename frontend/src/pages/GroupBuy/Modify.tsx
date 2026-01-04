import { MinusCircleOutlined, PlusOutlined } from '@ant-design/icons'
import type { UploadFile } from 'antd'
import { Button, DatePicker, Form, Input, InputNumber, message, Modal, Space } from 'antd'
import { GroupBuy, GroupBuyUnit } from 'fresh-shop-backend/types/dto.ts'
import { useEffect, useState } from 'react'
import { v4 as uuidv4 } from 'uuid' // 用于生成单位ID

import ImagesUpload from '@/components/ImagesUpload'
import ProductSelector from '@/components/ProductSelector'
import SupplierSelector from '@/components/SupplierSelector'
import useGroupBuyStore, { GroupBuyCreate, GroupBuyId } from '@/stores/groupBuyStore.ts'
import useProductStore from '@/stores/productStore.ts'
// import useSupplierStore from '@/stores/supplierStore.ts'
import { buildImageUrl } from '@/utils'
import dayjs from '@/utils/day'

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
  const [showPriceConfirm, setShowPriceConfirm] = useState(false)
  const [pendingFormData, setPendingFormData] = useState<GroupBuyCreate | null>(null)
  const [problematicUnits, setProblematicUnits] = useState<
    Array<{ unit: string; price: number; costPrice: number }>
  >([])

  const createLoading = useGroupBuyStore(state => state.createLoading)
  const createGroupBuy = useGroupBuyStore(state => state.createGroupBuy)
  const updateGroupBuy = useGroupBuyStore(state => state.updateGroupBuy)
  const groupBuy = useGroupBuyStore(state => state.groupBuy)
  const checkUnitUsage = useGroupBuyStore(state => state.checkUnitUsage)
  const getAllProducts = useProductStore(state => state.getAllProducts)

  useEffect(() => {
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
              url: buildImageUrl(image),
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
              url: buildImageUrl(image),
              filename: image
            }))
        )
      }
    }
  }, [])

  // 检查是否有售价低于成本价的情况，并收集有问题的规格信息
  const checkPriceValidation = (units: GroupBuyUnit[]) => {
    const problematicUnits: Array<{ unit: string; price: number; costPrice: number }> = []

    units.forEach((unit: GroupBuyUnit) => {
      const price = parseFloat(String(unit.price)) || 0
      const costPrice = parseFloat(String(unit.costPrice)) || 0
      if (price < costPrice) {
        problematicUnits.push({
          unit: unit.unit,
          price,
          costPrice
        })
      }
    })

    return {
      hasProblems: problematicUnits.length > 0,
      problematicUnits
    }
  }

  // 执行实际的保存操作
  const executeSave = async (formData: GroupBuyCreate) => {
    const params: GroupBuyCreate = {
      name: formData.name,
      description: formData.description,
      groupBuyStartDate: formData.groupBuyStartDate,
      supplierId: formData.supplierId,
      productId: formData.productId,
      units: (formData.units as GroupBuyUnit[]).map((item: GroupBuyUnit & { id?: string }) => {
        if (!item.id) {
          return {
            id: uuidv4(),
            unit: item.unit,
            price: item.price,
            costPrice: item.costPrice
          }
        }
        return item
      }),
      images: fileList.map(item => {
        if ('response' in item) {
          // 检查 item 是否包含 'response' 属性
          return (item as UploadFile).response.data.filename
        } else {
          return (item as { filename: string }).filename
        }
      })
    }
    const res = id
      ? await updateGroupBuy({ ...params, id } as GroupBuyId & Partial<GroupBuyCreate>)
      : await createGroupBuy(params)
    if (res) {
      message.success(id ? '编辑成功' : '添加成功')
      handleCancel()
    }
  }

  const handleOk = () => {
    form
      .validateFields()
      .then(async val => {
        // 检查是否有售价低于成本价的情况
        const validationResult = checkPriceValidation(val.units)
        if (validationResult.hasProblems) {
          // 保存待提交的数据和问题规格信息，并显示确认弹框
          setPendingFormData(val)
          setProblematicUnits(validationResult.problematicUnits)
          setShowPriceConfirm(true)
        } else {
          // 直接保存
          await executeSave(val)
        }
      })
      .catch(err => {
        message.warning('表单未填写完整')
        console.log(err)
      })
  }

  // 确认继续保存（忽略价格警告）
  const handleConfirmSave = async () => {
    setShowPriceConfirm(false)
    if (pendingFormData) {
      await executeSave(pendingFormData)
      setPendingFormData(null)
    }
  }

  // 取消保存
  const handleCancelSave = () => {
    setShowPriceConfirm(false)
    setPendingFormData(null)
    setProblematicUnits([])
  }

  const handleCancel = () => {
    setVisible(false)
  }

  /**
   * 删除规格处理函数
   * 编辑模式下会先校验规格是否被订单使用，若被使用则阻止删除
   */
  const handleRemoveUnit = async (remove: (index: number) => void, name: number) => {
    // 获取当前规格的 ID（仅编辑模式下已有规格才有 ID）
    const units = form.getFieldValue('units') as Array<{ id?: string }> | undefined
    const currentUnit = units?.[name]

    // 如果是编辑模式且规格有 ID，需要校验是否被使用
    if (id && currentUnit?.id) {
      const isUsed = await checkUnitUsage({ groupBuyId: id, unitId: currentUnit.id })
      if (isUsed) {
        message.error('该规格已被订单使用，无法删除')
        return
      }
    }

    // 未使用或新增的规格，直接删除
    remove(name)
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
            <Input placeholder="请输入团购名称" />
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
            label="供货商"
            name="supplierId"
            rules={[{ required: true, message: '请选择供货商' }]}
          >
            <SupplierSelector />
          </Form.Item>
          <Form.Item
            label="商品"
            name="productId"
            rules={[{ required: true, message: '请选择商品' }]}
          >
            <ProductSelector />
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
                      <Input placeholder="请输入计量单位" />
                    </Form.Item>
                    <Form.Item
                      {...restField}
                      name={[name, 'price']}
                      rules={[{ required: true, message: '请输入售价' }]}
                    >
                      <InputNumber
                        prefix="￥"
                        placeholder="请输入售价"
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
                        placeholder="请输入成本价"
                        precision={2}
                      />
                    </Form.Item>
                    <MinusCircleOutlined onClick={() => handleRemoveUnit(remove, name)} />
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
            <Input placeholder="请输入团购描述" />
          </Form.Item>
          <ImagesUpload
            id={id || ''}
            fileList={fileList as UploadFile[]}
            setFileList={setFileList}
            type="groupBuy"
          />
        </Form>
      </Modal>

      {/* 价格确认弹框 */}
      <Modal
        title="价格确认"
        open={showPriceConfirm}
        onOk={handleConfirmSave}
        onCancel={handleCancelSave}
        okText="确认继续"
        cancelText="取消"
        confirmLoading={createLoading}
        width={500}
      >
        <div className="py-4">
          <div className="mb-4 text-center">
            <div className="mb-2 text-lg text-orange-500">⚠️ 警告</div>
            <div className="text-gray-600">检测到以下规格的售价低于成本价，这会导致亏损：</div>
          </div>

          {/* 显示有问题的规格详情 */}
          <div className="mb-4">
            {problematicUnits.map((unit, index) => (
              <div
                key={index}
                className="mb-3 rounded-lg border border-orange-200 bg-orange-50 p-3"
              >
                <div className="flex items-center justify-between">
                  <div className="font-medium text-gray-800">{unit.unit}</div>
                  <div className="text-sm text-gray-600">
                    <span className="text-blue-600">售价: ￥{unit.price.toFixed(2)}</span>
                    <span className="mx-2">vs</span>
                    <span className="text-blue-600">成本: ￥{unit.costPrice.toFixed(2)}</span>
                  </div>
                </div>
                <div className="mt-1 text-xs text-orange-600">
                  亏损: ￥{(unit.costPrice - unit.price).toFixed(2)} / 单位
                </div>
              </div>
            ))}
          </div>

          <div className="text-center text-sm text-gray-500">确定要继续保存吗？</div>
        </div>
      </Modal>
    </>
  )
}

export default Modify
