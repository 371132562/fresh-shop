import { Button, Card, Col, Form, Input, List, Popconfirm, Row, Select, Tag } from 'antd'
import { useEffect, useState } from 'react'

import SearchToolbar from '@/components/SearchToolbar'
import useProductStore from '@/stores/productStore.ts'
import useProductTypeStore from '@/stores/productTypeStore.ts'

import Modify from './Modify.tsx'

export const Component = () => {
  const [visible, setVisible] = useState(false)
  const [currentId, setCurrentId] = useState<string | null>(null)
  const [form] = Form.useForm()

  const listLoading = useProductStore(state => state.listLoading)
  const productsList = useProductStore(state => state.productsList)
  const listCount = useProductStore(state => state.listCount)
  const pageParams = useProductStore(state => state.pageParams)
  const setPageParams = useProductStore(state => state.setPageParams)
  const deleteProduct = useProductStore(state => state.deleteProduct)
  const deleteLoading = useProductStore(state => state.deleteLoading)

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

  // 搜索功能
  const handleSearch = () => {
    form
      .validateFields()
      .then(async val => {
        setPageParams({
          page: 1,
          ...val
        })
      })
      .catch(err => {
        console.log(err)
      })
  }

  // 重置搜索
  const resetSearch = () => {
    const resetValues = {
      name: '',
      productTypeIds: []
    }
    form.setFieldsValue(resetValues)
    setPageParams({
      page: 1,
      ...resetValues
    })
  }

  const handleModify = (id: string) => {
    setCurrentId(id)
    setVisible(true)
  }

  // 处理删除商品
  const handleDelete = async (id: string) => {
    const success = await deleteProduct({ id })
    if (success) {
      // 删除成功后刷新列表
      pageChange()
    }
  }

  return (
    <>
      {/* 搜索表单区域 */}
      <Card
        className="mb-4 w-full"
        size="small"
      >
        <Form
          form={form}
          layout="vertical"
          name="searchForm"
          autoComplete="off"
        >
          <Row gutter={[16, 8]}>
            <Col
              xs={24}
              md={12}
              lg={8}
            >
              <Form.Item
                label="商品名称"
                name="name"
                className="!mb-1"
              >
                <Input
                  placeholder="请输入商品名称"
                  allowClear
                  onPressEnter={handleSearch}
                  onClear={handleSearch}
                />
              </Form.Item>
            </Col>
            <Col
              xs={24}
              md={12}
              lg={8}
            >
              <Form.Item
                label="商品类型"
                name="productTypeIds"
                className="!mb-1"
              >
                <Select
                  placeholder="请选择商品类型"
                  loading={getAllProductTypesLoading}
                  showSearch
                  mode="multiple"
                  allowClear
                  onChange={handleSearch}
                  onClear={handleSearch}
                  filterOption={(input, option) =>
                    String(option?.children || '')
                      .toLowerCase()
                      .includes(input.toLowerCase())
                  }
                  popupMatchSelectWidth={300}
                >
                  {allProductTypes.map(item => (
                    <Select.Option
                      key={item.id}
                      value={item.id}
                    >
                      {item.name}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>
          {/* 工具栏区域 */}
          <SearchToolbar
            onSearch={handleSearch}
            onReset={resetSearch}
            searchLoading={listLoading}
            totalCount={listCount.totalCount}
            countLabel="个商品"
            onAdd={() => setVisible(true)}
          />
        </Form>
      </Card>

      {/* 商品列表 */}
      <section className="box-border flex w-full items-center justify-between">
        <List
          className="w-full"
          itemLayout="horizontal"
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
            <List.Item
              actions={[
                <Button
                  key="edit"
                  color="primary"
                  variant="outlined"
                  onClick={() => handleModify(item.id)}
                >
                  编辑
                </Button>,
                <Popconfirm
                  key="delete"
                  title="确定要删除这个商品吗？"
                  description="删除后将无法恢复"
                  onConfirm={() => handleDelete(item.id)}
                  okText="确定"
                  cancelText="取消"
                >
                  <Button
                    color="danger"
                    variant="solid"
                    loading={deleteLoading}
                  >
                    删除
                  </Button>
                </Popconfirm>
              ]}
            >
              <List.Item.Meta
                title={
                  <Button
                    type="link"
                    style={{ padding: 0, height: 'auto' }}
                    onClick={() => handleModify(item.id)}
                  >
                    <span className="text-lg font-medium">{item.name}</span>
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
      {visible && (
        <Modify
          id={currentId}
          visible={visible}
          setVisible={setVisible}
          setCurrentId={setCurrentId}
        />
      )}
    </>
  )
}
