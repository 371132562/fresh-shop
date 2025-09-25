import { Form, Input, InputNumber, message, Modal, Select } from 'antd'
import { GroupBuyUnit } from 'fresh-shop-backend/types/dto.ts'
import { useEffect, useState } from 'react'

import CustomerSelector from '@/components/CustomerSelector'
import GroupBuySelector from '@/components/GroupBuySelector'
import useGroupBuyStore from '@/stores/groupBuyStore.ts'
import useOrderStore from '@/stores/orderStore.ts'

interface params {
  visible: boolean
  setVisible: (value: boolean) => void
  id?: string //编辑时会提供此id
}

const Modify = (props: params) => {
  const { visible, setVisible, id } = props
  const [form] = Form.useForm()

  const [units, setUnits] = useState<GroupBuyUnit[]>([])

  const createLoading = useOrderStore(state => state.createLoading)
  const createOrder = useOrderStore(state => state.createOrder)
  const updateOrder = useOrderStore(state => state.updateOrder)
  const order = useOrderStore(state => state.order)
  const allGroupBuy = useGroupBuyStore(state => state.allGroupBuy)

  useEffect(() => {
    if (id && order) {
      form.setFieldsValue(order)
    }
  }, [])

  useEffect(() => {
    if (id && order) {
      groupBuyChange(order.groupBuyId)
      form.setFieldsValue({ unitId: order.unitId })
    }
  }, [allGroupBuy])

  const handleOk = () => {
    form
      .validateFields()
      .then(async val => {
        const res = id ? await updateOrder({ ...val, id }) : await createOrder(val)
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
    form.resetFields()
    setUnits([])
  }

  const groupBuyChange = (val: string | string[] | undefined) => {
    if (typeof val === 'string') {
      const groupBuy = allGroupBuy.find(item => item.id === val)
      const newUnits = (groupBuy?.units as GroupBuyUnit[]) || []
      setUnits(newUnits)
      if (newUnits.length === 1) {
        form.setFieldsValue({ unitId: newUnits[0].id })
      } else {
        form.setFieldsValue({ unitId: undefined })
      }
    }
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
            label="客户"
            name="customerId"
            rules={[{ required: true, message: '请选择客户' }]}
          >
            <CustomerSelector />
          </Form.Item>
          <Form.Item
            label="团购单"
            name="groupBuyId"
            rules={[{ required: true, message: '请选择团购单' }]}
          >
            <GroupBuySelector onChange={groupBuyChange} />
          </Form.Item>
          <Form.Item
            label="选择规格"
            name="unitId"
            rules={[{ required: true, message: '请选择规格' }]}
          >
            <Select
              allowClear
              placeholder="请选择团购单后选择一个规格"
            >
              {units.map(item => {
                return (
                  <Select.Option
                    key={item.id}
                    value={item.id}
                  >
                    <span>
                      计量单位：{item.unit} 售价：{item.price} 成本价: {item.costPrice}
                    </span>
                  </Select.Option>
                )
              })}
            </Select>
          </Form.Item>
          <Form.Item
            label="购买数量"
            name="quantity"
            rules={[{ required: true, message: '请输入数量' }]}
          >
            <InputNumber
              style={{ width: '100%' }}
              placeholder="请输入购买数量"
              min={1}
            />
          </Form.Item>
          <Form.Item
            label="备注"
            name="description"
          >
            <Input placeholder="请输入订单备注" />
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}

export default Modify
