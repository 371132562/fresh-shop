import { Button, Card, Col, Form, Input, List, Popconfirm, Row } from 'antd'
import type { SupplierListItem } from 'fresh-shop-backend/types/dto.ts'
import { useEffect, useState } from 'react'

import SearchToolbar from '@/components/SearchToolbar'
import SupplierDetailModal from '@/pages/Analysis/components/SupplierOverview/components/SupplierDetailModal'
import useSupplierStore from '@/stores/supplierStore.ts'
import { validatePhoneNumber } from '@/utils'

import Modify from './Modify.tsx'

export const Component = () => {
  const [visible, setVisible] = useState(false)
  const [editVisible, setEditVisible] = useState(false)
  const [detailModalVisible, setDetailModalVisible] = useState(false)
  const [selectedSupplier, setSelectedSupplier] = useState<SupplierListItem | null>(null)
  const [editingSupplier, setEditingSupplier] = useState<SupplierListItem | null>(null)
  const [form] = Form.useForm()

  const listLoading = useSupplierStore(state => state.listLoading)
  const suppliersList = useSupplierStore(state => state.suppliersList)
  const listCount = useSupplierStore(state => state.listCount)
  const pageParams = useSupplierStore(state => state.pageParams)
  const setPageParams = useSupplierStore(state => state.setPageParams)
  const deleteSupplier = useSupplierStore(state => state.deleteSupplier)
  const deleteLoading = useSupplierStore(state => state.deleteLoading)
  const getSupplier = useSupplierStore(state => state.getSupplier)

  // 初始化：按当前分页参数请求列表，并将搜索表单回填为全局分页参数
  useEffect(() => {
    pageChange()
    form.setFieldsValue(pageParams)
  }, [])

  // 分页变更：仅更新页码，依赖 store 的统一副作用触发列表刷新
  const pageChange = (page: number = pageParams.page) => {
    setPageParams({
      page
    })
  }

  // 查看详情：记录当前选择的供货商并打开统计明细弹窗
  const handleViewDetail = (supplier: SupplierListItem) => {
    setSelectedSupplier(supplier)
    setDetailModalVisible(true)
  }

  // 编辑供货商：先缓存行数据，再请求完整详情，随后打开编辑弹窗
  const handleEdit = async (supplier: SupplierListItem) => {
    setEditingSupplier(supplier)
    // 获取完整的供货商详情数据
    await getSupplier({ id: supplier.id })
    setEditVisible(true)
  }

  // 删除供货商：成功后刷新当前页，保持用户所处上下文
  const handleDelete = async (supplier: SupplierListItem) => {
    const success = await deleteSupplier({ id: supplier.id })
    if (success) {
      // 删除成功后刷新列表
      pageChange()
    }
  }

  // 排序处理
  const handleSortChange = (value: string) => {
    const [field, order] = value.split('_') as [
      'orderCount' | 'orderTotalAmount' | 'groupBuyCount' | 'createdAt',
      'asc' | 'desc'
    ]
    setPageParams({ sortField: field, sortOrder: order })
  }

  // 搜索：校验表单后将参数写回全局分页参数，触发列表刷新
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

  // 重置：清空搜索项并回到第一页
  const resetSearch = () => {
    const resetValues = {
      name: '',
      phone: '',
      wechat: ''
    }
    form.setFieldsValue(resetValues)
    setPageParams({
      page: 1,
      ...resetValues
    })
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
                label="供货商名称"
                name="name"
                className="!mb-1"
              >
                <Input
                  placeholder="请输入供货商名称"
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
                label="手机号"
                name="phone"
                className="!mb-1"
                rules={[
                  {
                    required: false,
                    message: '请输入手机号！'
                  },
                  {
                    validator: validatePhoneNumber
                  }
                ]}
              >
                <Input
                  placeholder="请输入手机号"
                  maxLength={11}
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
                label="微信号"
                name="wechat"
                className="!mb-1"
              >
                <Input
                  placeholder="请输入微信号"
                  allowClear
                  onPressEnter={handleSearch}
                  onClear={handleSearch}
                />
              </Form.Item>
            </Col>
          </Row>
          {/* 工具栏区域 */}
          <SearchToolbar
            sortFieldOptions={[
              { label: '添加时间', value: 'createdAt' },
              { label: '订单量', value: 'orderCount' },
              { label: '订单总额', value: 'orderTotalAmount' },
              { label: '团购单量', value: 'groupBuyCount' }
            ]}
            sortFieldValue={pageParams.sortField || 'createdAt'}
            onSortFieldChange={field =>
              handleSortChange(`${field}_${pageParams.sortOrder || 'desc'}`)
            }
            sortOrderValue={(pageParams.sortOrder as 'asc' | 'desc') || 'desc'}
            onSortOrderChange={order =>
              handleSortChange(`${pageParams.sortField || 'createdAt'}_${order}`)
            }
            onSearch={handleSearch}
            onReset={resetSearch}
            searchLoading={listLoading}
            totalCount={listCount.totalCount}
            countLabel="家供货商"
            onAdd={() => setVisible(true)}
          />
        </Form>
      </Card>

      {/* 列表区域：自定义容器将标题/描述/操作按钮放入同一行内，统一响应式控制 */}
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
            pageSize: pageParams.pageSize,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50'],
            onChange: (page, pageSize) => {
              setPageParams({ page, pageSize })
            }
          }}
          dataSource={suppliersList}
          renderItem={(item: SupplierListItem) => (
            <List.Item>
              {/* 自定义容器：
                  - 小屏：上下堆叠（标题/描述在上，按钮在下，自动换行）
                  - 中/大屏：左右布局（文本区弹性填充，按钮区固定不收缩）
                  - 通过 min-w-0 + overflow-hidden 控制文本溢出不影响布局 */}
              <div className="flex w-full flex-col gap-3 md:flex-row md:items-start md:justify-between md:gap-4">
                {/* 左侧信息区（可伸展）：溢出隐藏；小屏单行省略，到 md 断点自动换行 */}
                <div className="min-w-0 flex-1 overflow-hidden pr-0 md:pr-4">
                  {/* 标题：点击进入编辑；小屏单行省略，md 起允许换行 */}
                  <div className="mb-1">
                    <Button
                      type="link"
                      style={{ padding: 0, height: 'auto' }}
                      onClick={() => handleEdit(item)}
                    >
                      <span className="block max-w-full overflow-hidden text-ellipsis whitespace-nowrap text-lg font-medium md:overflow-visible md:whitespace-normal md:break-all">
                        {item.name}
                      </span>
                    </Button>
                  </div>
                  {/* 描述信息：先显示聚合统计，其次显示描述；小屏单行省略，md 起自动换行 */}
                  <div className="space-y-1">
                    <div className="text-gray-800">
                      订单量：
                      <span className="text-blue-500">{item.orderCount}</span>
                    </div>
                    <div className="text-gray-800">
                      订单总额：
                      <span className="text-blue-500">
                        ¥{(item.orderTotalAmount || 0).toFixed(2)}
                      </span>
                    </div>
                    {item.groupBuyCount !== undefined && (
                      <div className="text-gray-800">
                        团购单量：
                        <span className="text-blue-500">{item.groupBuyCount}</span>
                      </div>
                    )}
                    {item.description && (
                      <div className="max-w-full overflow-hidden break-words text-gray-600 md:break-all">
                        <span className="block overflow-hidden text-ellipsis whitespace-nowrap md:whitespace-normal">
                          {item.description}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* 右侧操作区（不收缩）：按钮在窄屏自动换行，md 起与文本区左右分布 */}
                <div className="flex shrink-0 flex-row flex-wrap items-center justify-start gap-2 md:justify-end md:gap-3">
                  <Button
                    key="detail"
                    color="default"
                    variant="outlined"
                    onClick={() => handleViewDetail(item)}
                  >
                    查看数据
                  </Button>
                  <Button
                    key="edit"
                    color="primary"
                    variant="outlined"
                    onClick={() => handleEdit(item)}
                  >
                    编辑
                  </Button>
                  <Popconfirm
                    key="delete"
                    title="确定要删除这个供货商吗？"
                    description="删除后将无法恢复"
                    onConfirm={() => handleDelete(item)}
                    okText="确定"
                    cancelText="取消"
                  >
                    <Button
                      color="danger"
                      variant="solid"
                      danger
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
      {/* 新增弹窗：受控显隐 */}
      {visible && (
        <Modify
          visible={visible}
          setVisible={setVisible}
        />
      )}
      {/* 编辑弹窗：基于选中 id 加载详情后打开 */}
      {editVisible && editingSupplier && (
        <Modify
          visible={editVisible}
          setVisible={setEditVisible}
          id={editingSupplier.id}
        />
      )}
      {/* 统计明细弹窗：传递供货商 id 与可选日期范围 */}
      {detailModalVisible && selectedSupplier && (
        <SupplierDetailModal
          visible={detailModalVisible}
          onClose={() => {
            setDetailModalVisible(false)
            setSelectedSupplier(null)
          }}
          params={{
            supplierId: selectedSupplier.id,
            startDate: undefined,
            endDate: undefined
          }}
        />
      )}
    </>
  )
}
