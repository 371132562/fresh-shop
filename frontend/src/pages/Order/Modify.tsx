import { Form, Input, InputNumber, message, Modal, Select } from 'antd'
import { useEffect, useState } from 'react'

import useCustomerStore from '@/stores/customerStore.ts'
import useGroupBuyStore, { GroupBuyUnit } from '@/stores/groupBuyStore.ts'
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
  const allCustomer = useCustomerStore(state => state.allCustomer)
  const getAllCustomer = useCustomerStore(state => state.getAllCustomer)
  const getAllCustomerLoading = useCustomerStore(state => state.getAllCustomerLoading)
  const allGroupBuy = useGroupBuyStore(state => state.allGroupBuy)
  const getAllGroupBuy = useGroupBuyStore(state => state.getAllGroupBuy)
  const getAllGroupBuyLoading = useGroupBuyStore(state => state.getAllGroupBuyLoading)

  useEffect(() => {
    getAllGroupBuy()
    getAllCustomer()
    if (id && order) {
      form.setFieldsValue(order)
    }
  }, [])

  useEffect(() => {
    if (id && order) {
      groupBuyChange(order.groupBuyId)
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
        console.log(err)
      })
  }

  const handleCancel = () => {
    setVisible(false)
  }

  const filterOption = (input: string, option: any) => {
    return (option?.children ?? '').toLowerCase().includes(input.toLowerCase())
  }

  const groupBuyChange = (val: string) => {
    const groupBuy = allGroupBuy.find(item => item.id === val)
    setUnits((groupBuy?.units as GroupBuyUnit[]) || [])
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
            label="客户"
            name="customerId"
            rules={[{ required: true, message: '请选择客户' }]}
          >
            <Select
              loading={getAllCustomerLoading}
              showSearch
              allowClear
              placeholder="请选择客户"
              filterOption={filterOption}
            >
              {allCustomer.map(item => {
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
            label="团购单"
            name="groupBuyId"
            rules={[{ required: true, message: '请选择团购单' }]}
          >
            <Select
              loading={getAllGroupBuyLoading}
              showSearch
              allowClear
              placeholder="请选择团购单"
              filterOption={filterOption}
              onChange={groupBuyChange}
            >
              {allGroupBuy.map(item => {
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
            label="选择规格"
            name="unitId"
            rules={[{ required: true, message: '请选择规格' }]}
          >
            <Select
              loading={getAllGroupBuyLoading}
              showSearch
              allowClear
              placeholder="请选择团购单后选择一个规格"
              filterOption={filterOption}
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
              placeholder="数量"
              min={1}
            />
          </Form.Item>
          <Form.Item
            label="备注"
            name="description"
          >
            <Input placeholder="选填" />
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}

export default Modify
