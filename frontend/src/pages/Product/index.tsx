import { PlusOutlined, SearchOutlined } from '@ant-design/icons'
import { Button, FloatButton, Form, Input, List, Modal, Select, Tag } from 'antd'
import { useEffect, useState } from 'react'

import useProductStore from '@/stores/productStore.ts'
import useProductTypeStore from '@/stores/productTypeStore.ts'

import Modify from './Modify.tsx'

export const Component = () => {
  const [visible, setVisible] = useState(false)
  const [currentId, setCurrentId] = useState<string | null>(null)
  const [searchVisible, setSearchVisible] = useState(false)
  const [form] = Form.useForm()

  const listLoading = useProductStore(state => state.listLoading)
  const productsList = useProductStore(state => state.productsList)
  const listCount = useProductStore(state => state.listCount)
  const pageParams = useProductStore(state => state.pageParams)
  const setPageParams = useProductStore(state => state.setPageParams)

  const getAllProductTypes = useProductTypeStore(state => state.getAllProductTypes)
  const getAllProductTypesLoading = useProductTypeStore(state => state.getAllProductTypesLoading)
  const allProductTypes = useProductTypeStore(state => state.allProductTypes)

  useEffect(() => {
    pageChange()
    form.setFieldsValue(pageParams)
    getAllProductTypes()
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
        setPageParams({
          page: 1,
          ...val
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
      productTypeIds: []
    }
    form.setFieldsValue(resetValues)
    setPageParams({
      ...resetValues
    })
    handleCancel()
  }

  const handleModify = (id: string) => {
    setCurrentId(id)
    setVisible(true)
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
                  搜索商品
                </Button>
              </div>
              <div>共 {listCount.totalCount} 个</div>
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
          dataSource={productsList}
          renderItem={item => (
            <List.Item>
              <List.Item.Meta
                title={
                  <Button
                    type="link"
                    style={{ padding: 0 }}
                    onClick={() => {
                      handleModify(item.id)
                    }}
                  >
                    <span className="text-lg">{item.name}</span>
                    <Tag color="#55acee">{item.productTypeName}</Tag>
                  </Button>
                }
                description={
                  item.description && <div className="text-gray-600">{item.description}</div>
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
          id={currentId}
          visible={visible}
          setVisible={setVisible}
          setCurrentId={setCurrentId}
        />
      )}
      <Modal
        open={searchVisible}
        onOk={handleOk}
        onCancel={handleCancel}
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
            <Input />
          </Form.Item>
          <Form.Item
            label="按商品类型搜索(可多选)"
            name="productTypeIds"
          >
            <Select
              loading={getAllProductTypesLoading}
              showSearch
              mode="multiple"
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
        </Form>
      </Modal>
    </>
  )
}
