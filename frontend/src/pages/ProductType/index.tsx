import { Button, Card, Col, Form, Input, List, Popconfirm, Row } from 'antd'
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
  const deleteProductType = useProductTypeStore(state => state.deleteProductType)
  const deleteLoading = useProductTypeStore(state => state.deleteLoading)

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

  // 处理删除商品类型
  const handleDelete = async (id: string) => {
    const success = await deleteProductType({ id })
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
            onAdd={() => setVisible(true)}
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
              {/* 自定义容器：左侧信息 + 右侧操作，避免溢出导致响应式混乱 */}
              <div className="flex w-full flex-col gap-3 md:flex-row md:items-start md:justify-between md:gap-4">
                {/* 左侧信息区：可伸展，溢出隐藏，md起自动换行 */}
                <div className="min-w-0 flex-1 overflow-hidden pr-0 md:pr-4">
                  {/* 标题：小屏单行省略，md起允许换行 */}
                  <div className="mb-1">
                    <Button
                      type="link"
                      style={{ padding: 0, height: 'auto' }}
                      onClick={() => handleModify(item.id)}
                    >
                      <span className="block max-w-full overflow-hidden text-ellipsis whitespace-nowrap text-lg font-medium md:overflow-visible md:whitespace-normal md:break-all">
                        {item.name}
                      </span>
                    </Button>
                  </div>
                  {/* 描述：不撑坏布局，按断点换行 */}
                  {item.description && (
                    <div className="max-w-full overflow-hidden break-words text-gray-600 md:break-all">
                      <span className="block overflow-hidden text-ellipsis whitespace-nowrap md:whitespace-normal">
                        {item.description}
                      </span>
                    </div>
                  )}
                </div>

                {/* 右侧操作区：不收缩，允许换行；窄屏下按钮自然换行 */}
                <div className="flex shrink-0 flex-row flex-wrap items-center justify-start gap-2 md:justify-end md:gap-3">
                  <Button
                    key="edit"
                    color="primary"
                    variant="outlined"
                    onClick={() => handleModify(item.id)}
                  >
                    编辑
                  </Button>
                  <Popconfirm
                    key="delete"
                    title="确定要删除这个商品类型吗？"
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
                </div>
              </div>
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
