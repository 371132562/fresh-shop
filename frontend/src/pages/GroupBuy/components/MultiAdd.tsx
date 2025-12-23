import { MinusCircleOutlined, PlusOutlined } from '@ant-design/icons'
import { Button, Card, Form, Input, InputNumber, message, Modal, Typography } from 'antd'
import { BatchOrderItem, GroupBuyDetail, GroupBuyUnit } from 'fresh-shop-backend/types/dto.ts'
import { useEffect, useState } from 'react'

import CustomerSelector from '@/components/CustomerSelector'
import OrderStatusSelector from '@/components/OrderStatusSelector'
import useOrderStore from '@/stores/orderStore.ts'
import { OrderStatus } from '@/stores/orderStore.ts'
import { formatDate } from '@/utils/day.ts'

const { Title } = Typography

// 单个订单的表单数据类型
type OrderFormData = {
  customerId: string | undefined
  quantity: number
  description?: string
  status?: OrderStatus
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
  const [, setFormVersion] = useState(0) // 用于强制重新渲染

  // 获取创建订单的方法
  const batchCreateOrders = useOrderStore(state => state.batchCreateOrders)

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
      console.log('[MultiAdd] 表单原始数据 values:', JSON.stringify(values, null, 2))
      console.log('[MultiAdd] 当前团购信息 groupBuy:', JSON.stringify(groupBuy, null, 2))
      setCreateLoading(true)

      // 收集所有订单数据
      const ordersToCreate: BatchOrderItem[] = []

      values.units.forEach((unitData, unitIndex) => {
        console.log(`[MultiAdd] 处理规格[${unitIndex}]:`, JSON.stringify(unitData, null, 2))
        unitData.orders.forEach((orderData, orderIndex) => {
          console.log(
            `[MultiAdd] 处理订单[${unitIndex}][${orderIndex}]:`,
            JSON.stringify(orderData, null, 2)
          )
          if (orderData.customerId && orderData.quantity > 0) {
            const orderItem = {
              groupBuyId: groupBuy!.id,
              unitId: unitData.unitId,
              customerId: orderData.customerId,
              quantity: orderData.quantity,
              description: orderData.description,
              // 将前端选择的状态透传给后端；若未选择则由后端/DB默认
              ...(orderData.status ? { status: orderData.status } : {})
            }
            console.log(
              `[MultiAdd] 组装订单项[${unitIndex}][${orderIndex}]:`,
              JSON.stringify(orderItem, null, 2)
            )
            ordersToCreate.push(orderItem)
          }
        })
      })

      console.log(
        '[MultiAdd] 最终提交数据 ordersToCreate:',
        JSON.stringify(ordersToCreate, null, 2)
      )

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

  return (
    <Modal
      title="批量添加订单"
      open={visible}
      onOk={handleOk}
      onCancel={handleCancel}
      width={1000}
      confirmLoading={createLoading}
      style={{ top: 20 }}
      maskClosable={false}
    >
      <div className="!space-y-4">
        {/* 团购信息展示 */}
        <Card
          size="small"
          className="border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50"
        >
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-blue-500"></div>
              <Title
                level={5}
                className="!mb-0 text-blue-800"
              >
                当前团购：{groupBuy?.name}
              </Title>
            </div>
            <div className="flex flex-col gap-1 text-sm text-gray-600 md:flex-row md:gap-4">
              <span className="flex items-center gap-1">
                <span className="font-medium">供货商：</span>
                <span className="text-blue-600">{groupBuy?.supplier?.name}</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="font-medium">商品：</span>
                <span className="text-blue-600">{groupBuy?.product?.name}</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="font-medium">发起日期：</span>
                <span className="text-blue-600">
                  {groupBuy?.createdAt ? formatDate(groupBuy.createdAt) : '-'}
                </span>
              </span>
            </div>
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
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full bg-blue-500"></div>
                            <span className="text-base font-medium text-gray-800">
                              规格：{unitInfo?.unit} - ¥{unitInfo?.price}
                            </span>
                          </div>
                          <span className="text-sm text-gray-500">
                            {form.getFieldValue(['units', unitField.name, 'orders'])?.length || 0}{' '}
                            个订单
                          </span>
                        </div>
                      }
                      className="border-l-4 border-l-blue-400 shadow-sm"
                      styles={{
                        header: {
                          background: '#f8fafc',
                          borderBottom: '1px solid #e2e8f0'
                        }
                      }}
                    >
                      <Form.List name={[unitField.name, 'orders']}>
                        {(orderFields, { add: addOrder, remove: removeOrder }) => {
                          return (
                            <div className="!space-y-2">
                              {/* 订单列表 */}
                              {orderFields.map(orderField => (
                                <div
                                  key={orderField.key}
                                  className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm transition-all hover:shadow-md"
                                >
                                  <div className="grid grid-cols-1 gap-3 md:grid-cols-12 md:items-center md:gap-2">
                                    {/* 序号 - 移动端显示，桌面端隐藏 */}
                                    <div className="flex items-center justify-between md:hidden">
                                      <span className="text-sm font-medium text-gray-700">
                                        订单 {getGlobalOrderIndex(unitField.name, orderField.name)}
                                      </span>
                                      <Button
                                        type="text"
                                        danger
                                        size="large"
                                        icon={<MinusCircleOutlined />}
                                        onClick={() => {
                                          removeOrder(orderField.name)
                                          setFormVersion(prev => prev + 1)
                                        }}
                                      >
                                        删除
                                      </Button>
                                    </div>

                                    {/* 桌面端序号 */}
                                    <div className="hidden items-center justify-center md:flex">
                                      <span className="text-sm font-medium text-gray-600">
                                        {getGlobalOrderIndex(unitField.name, orderField.name)}
                                      </span>
                                    </div>

                                    {/* 客户选择 */}
                                    <div className="md:col-span-3">
                                      <Form.Item
                                        name={[orderField.name, 'customerId']}
                                        label="客户"
                                        className="!mb-0"
                                        rules={[{ required: true, message: '请选择客户' }]}
                                      >
                                        <CustomerSelector />
                                      </Form.Item>
                                    </div>

                                    {/* 购买数量 */}
                                    <div className="md:col-span-2">
                                      <Form.Item
                                        name={[orderField.name, 'quantity']}
                                        label="购买数量"
                                        className="!mb-0"
                                        rules={[
                                          { required: true, message: '请输入数量' },
                                          { type: 'number', min: 1, message: '数量必须大于0' }
                                        ]}
                                      >
                                        <InputNumber
                                          className="w-full"
                                          placeholder="请输入购买数量"
                                          min={1}
                                          precision={0}
                                        />
                                      </Form.Item>
                                    </div>

                                    {/* 订单状态（不包含部分退款） */}
                                    <div className="md:col-span-3">
                                      <Form.Item
                                        name={[orderField.name, 'status']}
                                        label="订单状态"
                                        className="!mb-0"
                                        rules={[{ required: true, message: '请选择订单状态' }]}
                                      >
                                        <OrderStatusSelector
                                          useExtended={false}
                                          allowClear={false}
                                        />
                                      </Form.Item>
                                    </div>

                                    {/* 备注 */}
                                    <div className="md:col-span-2">
                                      <Form.Item
                                        name={[orderField.name, 'description']}
                                        label="备注"
                                        className="!mb-0"
                                      >
                                        <Input placeholder="请输入订单备注" />
                                      </Form.Item>
                                    </div>

                                    {/* 桌面端删除按钮 */}
                                    <div className="hidden items-center justify-center md:flex">
                                      <Button
                                        type="text"
                                        danger
                                        size="large"
                                        icon={<MinusCircleOutlined />}
                                        onClick={() => {
                                          removeOrder(orderField.name)
                                          setFormVersion(prev => prev + 1)
                                        }}
                                      />
                                    </div>
                                  </div>
                                </div>
                              ))}

                              {/* 添加订单按钮 */}
                              <Button
                                type="dashed"
                                onClick={() => {
                                  addOrder({
                                    customerId: undefined,
                                    quantity: 1,
                                    description: '',
                                    status: OrderStatus.NOTPAID
                                  })
                                  setFormVersion(prev => prev + 1)
                                }}
                                block
                                icon={<PlusOutlined />}
                                className="mt-3 border-dashed border-blue-300 text-blue-600 hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700"
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
