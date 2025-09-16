import { PlusOutlined } from '@ant-design/icons'
import { Button, Card, Col, FloatButton, Form, Input, List, Row } from 'antd'
import { useEffect, useState } from 'react'

import SearchToolbar from '@/components/SearchToolbar'
import useProductTypeStore from '@/stores/productTypeStore.ts'

import Modify from './Modify.tsx'

export const Component = () => {
  const [visible, setVisible] = useState(false)
  const [currentId, setCurrentId] = useState<string | null>(null)
  const [form] = Form.useForm()

  const listLoading = useProductTypeStore(state => state.listLoading)
  const productTypesList = useProductTypeStore(state => state.productTypesList)
  const listCount = useProductTypeStore(state => state.listCount)
  const pageParams = useProductTypeStore(state => state.pageParams)
  const setPageParams = useProductTypeStore(state => state.setPageParams)

  useEffect(() => {
    pageChange()
    form.setFieldsValue(pageParams)
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
      name: ''
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
              sm={12}
              md={8}
            >
              <Form.Item
                label="商品类型名称"
                name="name"
                className="!mb-1"
              >
                <Input
                  placeholder="请输入商品类型名称"
                  allowClear
                  onPressEnter={handleSearch}
                  onClear={handleSearch}
                />
              </Form.Item>
            </Col>
          </Row>
          {/* 工具栏区域 */}
          <SearchToolbar
            onSearch={handleSearch}
            onReset={resetSearch}
            searchLoading={listLoading}
            totalCount={listCount.totalCount}
            countLabel="个类型"
          />
        </Form>
      </Card>

      {/* 商品类型列表 */}
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
          dataSource={productTypesList}
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
    </>
  )
}
