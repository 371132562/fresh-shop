import { PlusOutlined, SearchOutlined } from '@ant-design/icons'
import { Button, DatePicker, FloatButton, Form, Input, List, Modal, Select } from 'antd'
import dayjs from 'dayjs'
import { useEffect, useState } from 'react'
import { NavLink } from 'react-router'

import useGroupBuyStore from '@/stores/groupBuyStore.ts'
import useProductStore from '@/stores/productStore.ts'
import useSupplierStore from '@/stores/supplierStore.ts'

import Modify from './Modify.tsx'
const { RangePicker } = DatePicker

export const Component = () => {
  const [visible, setVisible] = useState(false)
  const [searchVisible, setSearchVisible] = useState(false)
  const [form] = Form.useForm()

  const listLoading = useGroupBuyStore(state => state.listLoading)
  const groupBuysList = useGroupBuyStore(state => state.groupBuyList)
  const listCount = useGroupBuyStore(state => state.listCount)
  const pageParams = useGroupBuyStore(state => state.pageParams)
  const setPageParams = useGroupBuyStore(state => state.setPageParams)
  const allSupplierList = useSupplierStore(state => state.allSupplierList)
  const getAllSuppliers = useSupplierStore(state => state.getAllSuppliers)
  const getAllSuppliersLoading = useSupplierStore(state => state.getAllSuppliersLoading)
  const allProductsList = useProductStore(state => state.allProductsList)
  const getAllProducts = useProductStore(state => state.getAllProducts)
  const getAllProductsListLoading = useProductStore(state => state.getAllProductsListLoading)

  useEffect(() => {
    getAllSuppliers()
    getAllProducts()
    pageChange()
    const { name, supplierIds, productIds, startDate, endDate } = pageParams

    form.setFieldsValue({
      name,
      supplierIds,
      productIds,
      groupBuySearchDate: startDate && endDate ? [dayjs(startDate), dayjs(endDate)] : []
    })
  }, [])

  const pageChange = (page: number = pageParams.page) => {
    setPageParams({
      page
    })
  }

  //搜索
  const handleOk = () => {
    form
      .validateFields()
      .then(async val => {
        const { name, groupBuySearchDate, supplierIds, productIds } = val
        setPageParams({
          page: 1,
          name,
          supplierIds,
          productIds,
          startDate: groupBuySearchDate?.[0]?.toDate() ?? null,
          endDate: groupBuySearchDate?.[1]?.toDate() ?? null
        })
        setSearchVisible(false)
      })
      .catch(err => {
        console.log(err)
      })
  }

  const handleCancel = () => {
    setSearchVisible(false)
  }

  const resetSearch = () => {
    const resetValues = {
      name: '',
      startDate: null,
      endDate: null,
      supplierIds: [],
      productIds: []
    }
    form.setFieldsValue(resetValues)
    setPageParams({
      ...resetValues
    })
    handleCancel()
  }

  const filterOption = (input: string, option: any) => {
    return (option?.children ?? '').toLowerCase().includes(input.toLowerCase())
  }

  return (
    <>
      <section className="box-border flex w-full items-center justify-between">
        <List
          className="w-full"
          itemLayout="horizontal"
          header={
            <div className="box-border flex w-full flex-row items-center justify-between">
              <div>
                <Button
                  type="primary"
                  size="large"
                  icon={<SearchOutlined />}
                  iconPosition="end"
                  onClick={() => setSearchVisible(true)}
                >
                  搜索团购单
                </Button>
              </div>
              <div>共 {listCount.totalCount} 条</div>
            </div>
          }
          loading={listLoading}
          pagination={{
            position: 'bottom',
            align: 'end',
            total: listCount.totalCount,
            current: pageParams.page,
            onChange: page => {
              pageChange(page)
            }
          }}
          dataSource={groupBuysList}
          renderItem={item => (
            <List.Item>
              <List.Item.Meta
                title={
                  <NavLink
                    to={`/groupBuy/detail/${item.id}`}
                    className="underline"
                  >
                    <Button
                      type="link"
                      style={{ padding: 0 }}
                    >
                      <span className="text-lg">{item.name}</span>
                    </Button>
                  </NavLink>
                }
                description={
                  <div className="mt-1 text-sm text-gray-700">
                    {item.product?.name && ( // 只有当 product.name 存在时才显示
                      <div className="mb-1 font-medium text-gray-800">
                        商品：<span className="text-blue-500">{item.product.name}</span>
                      </div>
                    )}
                    {item.description && ( // 只有当 description 存在时才显示
                      <div className="overflow-hidden text-ellipsis whitespace-nowrap text-gray-600">
                        {item.description}
                      </div>
                    )}
                  </div>
                }
              />
            </List.Item>
          )}
        />
      </section>
      <FloatButton
        style={{ position: 'absolute', left: 24 }}
        icon={<PlusOutlined />}
        type="primary"
        description="添加"
        shape="square"
        onClick={() => setVisible(true)}
      />
      {visible && (
        <Modify
          visible={visible}
          setVisible={setVisible}
        />
      )}
      <Modal
        open={searchVisible}
        onOk={handleOk}
        onCancel={handleCancel}
        loading={listLoading}
        footer={[
          <Button onClick={resetSearch}>清空</Button>,
          <Button onClick={handleCancel}>取消</Button>,
          <Button
            type="primary"
            loading={listLoading}
            onClick={handleOk}
          >
            确定
          </Button>
        ]}
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
            label="按名称搜索"
            name="name"
          >
            <Input placeholder="请输入团购单名称" />
          </Form.Item>
          <Form.Item
            label="按照发起时间搜索"
            name="groupBuySearchDate"
          >
            <RangePicker
              inputReadOnly
              style={{ width: '100%' }}
            />
          </Form.Item>
          <Form.Item
            label="按供应商搜索(可多选)"
            name="supplierIds"
          >
            <Select
              loading={getAllSuppliersLoading}
              showSearch
              mode="multiple"
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
            label="按商品搜索(可多选)"
            name="productIds"
          >
            <Select
              loading={getAllProductsListLoading}
              showSearch
              mode="multiple"
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
        </Form>
      </Modal>
    </>
  )
}
