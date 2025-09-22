import { MinusCircleOutlined, PlusOutlined } from '@ant-design/icons'
import { Button, Card, Form, Input, InputNumber, message, Modal, Select, Typography } from 'antd'
import { BatchOrderItem, GroupBuyDetail, GroupBuyUnit } from 'fresh-shop-backend/types/dto.ts'
import { useEffect, useState } from 'react'

import useCustomerStore from '@/stores/customerStore.ts'
import useOrderStore from '@/stores/orderStore.ts'

const { Title, Text } = Typography

// 单个订单的表单数据类型
type OrderFormData = {
  customerId: string
  quantity: number
  description?: string
}

// 规格分组的表单数据类型
type UnitFormData = {
  unitId: string
  orders: OrderFormData[]
}

// 整个表单的数据类型
type MultiAddFormData = {
  units: UnitFormData[]
}

interface MultiAddProps {
  visible: boolean
  setVisible: (value: boolean) => void
  groupBuy: GroupBuyDetail | null
  onSuccess?: () => void
}

const MultiAdd = ({ visible, setVisible, groupBuy, onSuccess }: MultiAddProps) => {
  const [form] = Form.useForm<MultiAddFormData>()
  const [createLoading, setCreateLoading] = useState(false)
  const [formVersion, setFormVersion] = useState(0) // 用于强制重新渲染

  // 获取客户列表和创建订单的方法
  const allCustomer = useCustomerStore(state => state.allCustomer)
  const getAllCustomer = useCustomerStore(state => state.getAllCustomer)
  const getAllCustomerLoading = useCustomerStore(state => state.getAllCustomerLoading)
  const batchCreateOrders = useOrderStore(state => state.batchCreateOrders)

  // 初始化客户列表
  useEffect(() => {
    if (visible) {
      getAllCustomer()
    }
  }, [visible])

  // 初始化表单数据
  useEffect(() => {
    if (visible && groupBuy?.units) {
      // 为每个规格初始化空的订单表单（不包含默认订单）
      const initialUnits: UnitFormData[] = (groupBuy.units as GroupBuyUnit[]).map(unit => ({
        unitId: unit.id,
        orders: []
      }))

      form.setFieldsValue({
        units: initialUnits
      })
    }
  }, [visible, groupBuy])

  // 处理确认提交
  const handleOk = async () => {
    try {
      const values = await form.validateFields()
      setCreateLoading(true)

      // 收集所有订单数据
      const ordersToCreate: BatchOrderItem[] = []

      values.units.forEach(unitData => {
        unitData.orders.forEach(orderData => {
          if (orderData.customerId && orderData.quantity > 0) {
            ordersToCreate.push({
              groupBuyId: groupBuy!.id,
              unitId: unitData.unitId,
              customerId: orderData.customerId,
              quantity: orderData.quantity,
              description: orderData.description
            })
          }
        })
      })

      if (ordersToCreate.length === 0) {
        message.warning('请至少添加一个有效订单')
        return
      }

      // 批量创建订单
      const result = await batchCreateOrders({ orders: ordersToCreate })

      if (result) {
        // 显示结果通知
        if (result.successCount > 0) {
          message.success(
            `成功创建 ${result.successCount} 个订单${result.failCount > 0 ? `，失败 ${result.failCount} 个` : ''}`
          )

          // 如果有失败的订单，显示详细信息
          if (result.failCount > 0) {
            console.warn('创建失败的订单:', result.failedOrders)
          }

          // 调用成功回调
          onSuccess?.()
          handleCancel()
        } else {
          message.error('所有订单创建失败')
        }
      } else {
        message.error('批量创建订单时发生错误')
      }
    } catch (error) {
      console.error('表单验证失败:', error)
      message.error('请检查表单填写是否完整')
    } finally {
      setCreateLoading(false)
    }
  }

  // 处理取消
  const handleCancel = () => {
    setVisible(false)
    form.resetFields()
  }

  // 获取规格信息
  const getUnitInfo = (unitId: string) => {
    return (groupBuy?.units as GroupBuyUnit[])?.find(unit => unit.id === unitId)
  }

  // 计算全局订单序号
  const getGlobalOrderIndex = (unitIndex: number, orderIndex: number) => {
    // 使用formVersion确保实时更新
    const formValues = form.getFieldsValue()
    const units = formValues.units || []

    // 计算当前规格之前的所有订单数量
    let previousOrdersCount = 0
    for (let i = 0; i < unitIndex; i++) {
      previousOrdersCount += units[i]?.orders?.length || 0
    }

    return previousOrdersCount + orderIndex + 1
  }

  // 客户选择器的过滤函数
  const filterOption = (
    input: string,
    option: { label: string; phone?: string | null } | undefined
  ): boolean => {
    if (!option) return false
    return (
      (option.label?.toLowerCase().includes(input.toLowerCase()) ?? false) ||
      (option.phone ? option.phone.toLowerCase().includes(input.toLowerCase()) : false)
    )
  }

  return (
    <Modal
      title="批量添加订单"
      open={visible}
      onOk={handleOk}
      onCancel={handleCancel}
      width={800}
      confirmLoading={createLoading}
      okText="批量创建"
      cancelText="取消"
      style={{ top: 20 }}
    >
      <div className="!space-y-4">
        {/* 团购信息展示 */}
        <Card
          size="small"
          className="bg-blue-50"
        >
          <div className="space-y-1">
            <Title
              level={5}
              className="mb-2"
            >
              当前团购：{groupBuy?.name}
            </Title>
            <Text
              type="secondary"
              className="text-sm"
            >
              供货商：{groupBuy?.supplier?.name} | 商品：
              {groupBuy?.product?.name}
            </Text>
          </div>
        </Card>

        <Form
          form={form}
          layout="vertical"
          className="!space-y-4"
          onValuesChange={() => {
            // 表单值变化时更新版本号，强制重新渲染
            setFormVersion(prev => prev + 1)
          }}
        >
          <Form.List name="units">
            {unitFields => (
              <div className="!space-y-4">
                {unitFields.map(unitField => {
                  const unitInfo = getUnitInfo(
                    form.getFieldValue(['units', unitField.name, 'unitId'])
                  )

                  return (
                    <Card
                      key={unitField.key}
                      size="small"
                      title={
                        <div className="flex items-center justify-between">
                          <span className="text-base font-medium">
                            规格：{unitInfo?.unit} - ¥{unitInfo?.price}
                          </span>
                        </div>
                      }
                      className="border-l-4 border-l-blue-400"
                    >
                      <Form.List name={[unitField.name, 'orders']}>
                        {(orderFields, { add: addOrder, remove: removeOrder }) => {
                          return (
                            <div className="!space-y-3">
                              {orderFields.map(orderField => (
                                <Card
                                  key={orderField.key}
                                  size="small"
                                  className="bg-gray-50"
                                  title={
                                    <div className="flex items-center justify-between">
                                      <span className="text-sm font-medium">
                                        订单 {getGlobalOrderIndex(unitField.name, orderField.name)}
                                        {/* 使用formVersion确保实时更新 */}
                                        {formVersion && null}
                                      </span>
                                      <Button
                                        type="text"
                                        danger
                                        size="small"
                                        icon={<MinusCircleOutlined />}
                                        onClick={() => {
                                          removeOrder(orderField.name)
                                          setFormVersion(prev => prev + 1) // 强制重新渲染
                                        }}
                                      >
                                        删除
                                      </Button>
                                    </div>
                                  }
                                >
                                  <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                                    {/* 客户选择 */}
                                    <Form.Item
                                      name={[orderField.name, 'customerId']}
                                      label="客户"
                                      rules={[{ required: true, message: '请选择客户' }]}
                                    >
                                      <Select
                                        placeholder="选择客户"
                                        loading={getAllCustomerLoading}
                                        showSearch
                                        filterOption={filterOption}
                                        options={allCustomer.map(customer => ({
                                          value: customer.id,
                                          label: customer.name,
                                          phone: customer.phone || undefined
                                        }))}
                                        optionRender={option => (
                                          <div>
                                            <div className="font-medium">{option.label}</div>
                                            <div className="text-xs text-gray-500">
                                              {option.data.phone}
                                            </div>
                                          </div>
                                        )}
                                      />
                                    </Form.Item>

                                    {/* 购买数量 */}
                                    <Form.Item
                                      name={[orderField.name, 'quantity']}
                                      label="购买数量"
                                      rules={[
                                        { required: true, message: '请输入数量' },
                                        { type: 'number', min: 1, message: '数量必须大于0' }
                                      ]}
                                    >
                                      <InputNumber
                                        placeholder="数量"
                                        min={1}
                                        className="w-full"
                                      />
                                    </Form.Item>

                                    {/* 备注 */}
                                    <Form.Item
                                      name={[orderField.name, 'description']}
                                      label="备注"
                                    >
                                      <Input placeholder="选填" />
                                    </Form.Item>
                                  </div>
                                </Card>
                              ))}

                              {/* 添加订单按钮 */}
                              <Button
                                type="dashed"
                                onClick={() => {
                                  addOrder({ customerId: '', quantity: 1, description: '' })
                                  setFormVersion(prev => prev + 1) // 强制重新渲染
                                }}
                                block
                                icon={<PlusOutlined />}
                                className="mt-2"
                              >
                                添加订单
                              </Button>
                            </div>
                          )
                        }}
                      </Form.List>
                    </Card>
                  )
                })}
              </div>
            )}
          </Form.List>
        </Form>
      </div>
    </Modal>
  )
}

export default MultiAdd
