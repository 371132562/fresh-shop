import {
  ArrowLeftOutlined,
  DollarCircleOutlined,
  LineChartOutlined,
  RollbackOutlined,
  ShoppingCartOutlined
} from '@ant-design/icons'
import { Button, Col, Flex, Image, List, Row, Spin, Tag } from 'antd'
import {
  GroupBuy,
  GroupBuyUnit,
  MergedGroupBuyOverviewDetailParams
} from 'fresh-shop-backend/types/dto.ts'
import { useEffect, useMemo, useState } from 'react'
import { NavLink, useNavigate, useParams } from 'react-router'

import MergedGroupBuyDetailModal from '@/pages/Analysis/components/GroupBuyOverview/components/MergedGroupBuyDetailModal'
import DeleteGroupBuyButton from '@/pages/GroupBuy/components/DeleteGroupBuyButton'
import GroupBuyUnitPricingAnalysis from '@/pages/GroupBuy/components/GroupBuyUnitPricingAnalysis'
import MultiAdd from '@/pages/GroupBuy/components/MultiAdd'
import Modify from '@/pages/GroupBuy/Modify.tsx'
import RefundButton from '@/pages/Order/components/RefundButton.tsx'
import UpdateOrderStatusButton from '@/pages/Order/components/UpdateOrderStatusButton.tsx'
import useGlobalSettingStore from '@/stores/globalSettingStore.ts'
import useGroupBuyStore from '@/stores/groupBuyStore.ts'
import { OrderStatusMap } from '@/stores/orderStore.ts'
import { buildImageUrl, formatDate } from '@/utils'
import { calculateProfitMarginPercent } from '@/utils/profitability'
import { getProfitColor, getProfitMarginColor } from '@/utils/profitColor'

export const Component = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [visible, setVisible] = useState(false)
  const [againVisible, setAgainVisible] = useState(false)
  const [againGroupBuy, setAgainGroupBuy] = useState<GroupBuy | null>(null)
  const [multiAddVisible, setMultiAddVisible] = useState(false)
  const [detailVisible, setDetailVisible] = useState(false)

  const groupBuy = useGroupBuyStore(state => state.groupBuy)
  const getGroupBuy = useGroupBuyStore(state => state.getGroupBuy)
  const getLoading = useGroupBuyStore(state => state.getLoading)
  const setGroupBuy = useGroupBuyStore(state => state.setGroupBuy)
  const globalSetting = useGlobalSettingStore(state => state.globalSetting)

  const images: string[] = useMemo(() => {
    return Array.isArray(groupBuy?.images)
      ? groupBuy.images
          .filter((image): image is string => typeof image === 'string')
          .map(image => buildImageUrl(image))
      : []
  }, [groupBuy])

  const totalProfitMargin = useMemo(() => {
    return calculateProfitMarginPercent(groupBuy?.totalSalesAmount || 0, groupBuy?.totalProfit || 0)
  }, [groupBuy?.totalProfit, groupBuy?.totalSalesAmount])

  useEffect(() => {
    if (id) {
      getGroupBuy({ id })
    }
    // 清除数据，避免在切换页面时显示旧数据
    return () => {
      setGroupBuy(null)
    }
  }, [id])

  // 删除交互由子组件负责

  const [detailParams, setDetailParams] = useState<MergedGroupBuyOverviewDetailParams | undefined>()

  // 处理查看详情
  const handleViewDetail = () => {
    if (groupBuy?.name && groupBuy?.supplierId) {
      setDetailParams({
        groupBuyName: groupBuy.name,
        supplierId: groupBuy.supplierId
      })
      setDetailVisible(true)
    }
  }

  // 关闭详情模态框
  const handleDetailCancel = () => {
    setDetailVisible(false)
    setDetailParams(undefined)
  }

  return (
    <div className="w-full">
      <Spin
        spinning={getLoading}
        delay={300}
      >
        <>
          {/* 主要信息卡片 */}
          <div className="mb-4 rounded-lg bg-white p-4 shadow-sm">
            {/* 卡片标题及操作按钮 */}
            <h3 className="mb-4 border-b border-gray-100 pb-3 text-xl font-bold text-gray-800">
              <div className="mb-3 flex items-center gap-3">
                <Button
                  type="text"
                  icon={<ArrowLeftOutlined />}
                  onClick={() => navigate(-1)}
                  className="flex items-center justify-center p-1"
                />
                {groupBuy?.name}
              </div>
              <div className="flex items-center justify-between">
                <Button
                  type="primary"
                  ghost
                  onClick={handleViewDetail}
                >
                  查看详细数据
                </Button>
                <Flex
                  gap="small"
                  wrap
                >
                  <Button
                    type="primary"
                    onClick={() => setMultiAddVisible(true)}
                  >
                    添加订单
                  </Button>
                  <Button
                    color="primary"
                    variant="solid"
                    onClick={() => {
                      setAgainVisible(true)
                      setAgainGroupBuy(groupBuy)
                    }}
                  >
                    再次发起
                  </Button>
                  <Button
                    color="primary"
                    variant="outlined"
                    onClick={() => setVisible(true)}
                  >
                    编辑
                  </Button>
                  {id && (
                    <DeleteGroupBuyButton
                      id={id}
                      name={groupBuy?.name}
                      orders={groupBuy?.order}
                      size="middle"
                      onDeleted={() => navigate(-1)}
                    />
                  )}
                </Flex>
              </div>
            </h3>

            {/* 团购基础信息 */}
            <div className="space-y-3">
              {/* 发起时间 */}
              <div className="flex items-start text-base">
                <span className="w-20 flex-shrink-0 font-medium text-gray-500">发起时间：</span>
                <span className="word-break-all flex-grow break-words text-gray-700">
                  {groupBuy?.groupBuyStartDate ? (
                    formatDate(groupBuy.groupBuyStartDate)
                  ) : (
                    <span className="text-gray-400 italic">无</span>
                  )}
                </span>
              </div>

              {/* 供货商 */}
              <div className="flex items-start text-base">
                <span className="w-20 flex-shrink-0 font-medium text-gray-500">供货商：</span>
                <span className="word-break-all flex-grow break-words text-gray-700">
                  {groupBuy?.supplier?.name || <span className="text-gray-400 italic">无</span>}
                </span>
              </div>

              {/* 商品 */}
              <div className="flex items-start text-base">
                <span className="w-20 flex-shrink-0 font-medium text-gray-500">商品：</span>
                <span className="word-break-all flex-grow break-words text-gray-700">
                  {groupBuy?.product?.name || <span className="text-gray-400 italic">无</span>}
                </span>
              </div>

              {/* 备注 */}
              {groupBuy?.description && (
                <div className="flex items-start text-base">
                  <span className="w-20 flex-shrink-0 font-medium text-gray-500">备注：</span>
                  <span className="word-break-all flex-grow break-words text-gray-700">
                    {groupBuy.description}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* 盈利概览卡片 */}
          <div className="mb-4 rounded-lg bg-white p-4 shadow-sm">
            <div className="mb-4 border-b border-gray-100 pb-3">
              <h3 className="text-base font-semibold text-gray-700">盈利概览</h3>
              <div className="mt-1 text-sm text-gray-500">
                销售额已扣除退款影响；利润已包含退款订单的负成本与部分退款冲减。
              </div>
            </div>

            <Row gutter={[12, 12]}>
              <Col
                xs={24}
                md={12}
                lg={6}
              >
                <div className="rounded-lg bg-blue-50 p-4 transition-all hover:shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm text-gray-600">销售额</div>
                      <div className="mt-1 text-xl font-bold text-blue-400">
                        ¥{(groupBuy?.totalSalesAmount || 0).toFixed(2)}
                      </div>
                    </div>
                    <DollarCircleOutlined className="text-2xl text-blue-500" />
                  </div>
                </div>
              </Col>

              {!globalSetting?.value?.sensitive && (
                <Col
                  xs={24}
                  md={12}
                  lg={6}
                >
                  <div className="rounded-lg bg-green-50 p-4 transition-all hover:shadow-sm">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm text-gray-600">利润</div>
                        <div
                          className={`mt-1 text-xl font-bold ${getProfitColor(groupBuy?.totalProfit || 0)}`}
                        >
                          ¥{(groupBuy?.totalProfit || 0).toFixed(2)}
                        </div>
                      </div>
                      <LineChartOutlined className="text-2xl text-green-600" />
                    </div>
                  </div>
                </Col>
              )}

              {!globalSetting?.value?.sensitive && (
                <Col
                  xs={24}
                  md={12}
                  lg={6}
                >
                  <div className="rounded-lg bg-indigo-50 p-4 transition-all hover:shadow-sm">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm text-gray-600">利润率</div>
                        <div
                          className={`mt-1 text-xl font-bold ${getProfitMarginColor(totalProfitMargin)}`}
                        >
                          {totalProfitMargin.toFixed(1)}%
                        </div>
                      </div>
                      <LineChartOutlined className="text-2xl text-indigo-500" />
                    </div>
                  </div>
                </Col>
              )}

              <Col
                xs={24}
                md={12}
                lg={6}
              >
                <div className="rounded-lg bg-orange-50 p-4 transition-all hover:shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm text-gray-600">退款金额</div>
                      <div className="mt-1 text-xl font-bold text-orange-600">
                        ¥{(groupBuy?.totalRefundAmount || 0).toFixed(2)}
                      </div>
                    </div>
                    <RollbackOutlined className="text-2xl text-orange-500" />
                  </div>
                </div>
              </Col>

              <Col
                xs={24}
                md={12}
                lg={6}
              >
                <div className="rounded-lg bg-slate-50 p-4 transition-all hover:shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm text-gray-600">有效订单量</div>
                      <div className="mt-1 text-xl font-bold text-blue-600">
                        {groupBuy?.totalOrderCount || 0} 单
                      </div>
                    </div>
                    <ShoppingCartOutlined className="text-2xl text-blue-500" />
                  </div>
                </div>
              </Col>
            </Row>
          </div>

          <GroupBuyUnitPricingAnalysis
            units={Array.isArray(groupBuy?.units) ? (groupBuy.units as GroupBuyUnit[]) : []}
            sensitive={globalSetting?.value?.sensitive}
          />

          {/* 订单信息卡片 */}
          <div className="mb-4 rounded-lg bg-white p-4 shadow-sm">
            <h3 className="mb-3 border-b border-gray-100 pb-2 text-base font-semibold text-gray-700">
              订单信息 共 {groupBuy?.order?.length || 0} 条
            </h3>
            <List
              itemLayout="horizontal"
              dataSource={groupBuy?.order}
              renderItem={order => {
                const unit = (groupBuy?.units as GroupBuyUnit[])?.find(
                  item => item.id === order.unitId
                )

                // 计算订单总金额
                const orderTotalAmount = unit ? unit.price * order.quantity : 0

                const actions = []

                actions.push(
                  <UpdateOrderStatusButton
                    key="update-status"
                    orderId={order.id}
                    status={order.status}
                    onSuccess={() => {
                      getGroupBuy({ id: id as string })
                    }}
                  />
                )
                actions.push(
                  <RefundButton
                    key="partial-refund"
                    orderId={order.id}
                    orderTotalAmount={orderTotalAmount}
                    currentRefundAmount={order.partialRefundAmount || 0}
                    orderStatus={order.status}
                    onSuccess={() => {
                      getGroupBuy({ id: id as string })
                    }}
                  />
                )

                return (
                  <List.Item actions={actions}>
                    <List.Item.Meta
                      title={
                        <span className="text-base font-medium text-gray-800">
                          {order?.customer?.name ? (
                            <NavLink
                              to={`/order/detail/${order.id}`}
                              className="text-base font-medium text-gray-800 hover:text-blue-500"
                            >
                              {order.customer.name}
                            </NavLink>
                          ) : (
                            '无客户信息'
                          )}
                        </span>
                      }
                      description={
                        <div className="space-y-2 py-2 text-sm text-gray-600">
                          <p className="flex items-center">
                            <span className="w-20 flex-shrink-0">手机号:</span>
                            <span className="flex-grow">{order?.customer?.phone || '无'}</span>
                          </p>
                          <p className="flex items-center">
                            <span className="w-20 flex-shrink-0">所选规格:</span>
                            <span className="flex-grow">{unit ? unit.unit : '无'}</span>
                          </p>
                          <p className="flex items-center">
                            <span className="w-20 flex-shrink-0">份数:</span>
                            <span className="flex-grow">{order.quantity}</span>
                          </p>
                          <p className="flex items-center">
                            <span className="w-20 flex-shrink-0">订单状态:</span>
                            <span className="flex-grow">
                              <Tag
                                variant="solid"
                                color={OrderStatusMap[order.status].color}
                              >
                                {OrderStatusMap[order.status].label}
                              </Tag>
                            </span>
                          </p>
                          {(order.partialRefundAmount || 0) > 0 && order.status !== 'REFUNDED' && (
                            <p className="flex items-center">
                              <span className="w-20 flex-shrink-0 text-gray-600">退款:</span>
                              <span className="flex-grow">
                                <span className="font-bold text-orange-600">
                                  ¥{order.partialRefundAmount.toFixed(2)}
                                </span>
                                /
                                <span className="font-bold text-cyan-600">
                                  ¥{orderTotalAmount.toFixed(2)}
                                </span>
                              </span>
                            </p>
                          )}
                        </div>
                      }
                    />
                  </List.Item>
                )
              }}
            />
            {!groupBuy?.order?.length && (
              <div className="py-2 text-base text-gray-700">
                <span className="text-gray-400 italic">无订单信息</span>
              </div>
            )}
          </div>

          {/* 如果没有数据，显示提示 */}
          {!getLoading && !groupBuy?.id && (
            <div className="py-8 text-center text-gray-500">
              {/* 保持 py-8 */}
              <p className="mb-2">暂无团购单信息。</p>
              <p className="text-sm">请检查ID或稍后重试。</p>
            </div>
          )}

          {/* 图片展示区卡片 */}
          {images.length > 0 && (
            <div className="mb-4 rounded-lg bg-white p-4 shadow-sm">
              <h3 className="mb-3 border-b border-gray-100 pb-2 text-base font-semibold text-gray-700">
                相关图片
              </h3>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <Image.PreviewGroup>
                  {images.map((image, index) => (
                    <div
                      key={index}
                      className="relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-md bg-gray-100"
                    >
                      <Image
                        src={image}
                        alt={`商品图片 ${index + 1}`}
                        className="h-full w-full object-cover"
                        fallback="/placeholder.svg"
                        placeholder={
                          <div className="flex h-full w-full items-center justify-center bg-gray-200">
                            <Spin size="small" />
                          </div>
                        }
                      />
                    </div>
                  ))}
                </Image.PreviewGroup>
              </div>
            </div>
          )}
        </>
      </Spin>
      {visible && (
        <Modify
          id={id}
          visible={visible}
          setVisible={setVisible}
        />
      )}
      {againVisible && (
        <Modify
          visible={againVisible}
          setVisible={setAgainVisible}
          againGroupBuy={againGroupBuy}
        />
      )}
      {multiAddVisible && (
        <MultiAdd
          visible={multiAddVisible}
          setVisible={setMultiAddVisible}
          groupBuy={groupBuy}
          onSuccess={() => {
            // 批量添加成功后刷新团购详情
            if (id) {
              getGroupBuy({ id: id as string })
            }
          }}
        />
      )}
      <MergedGroupBuyDetailModal
        visible={detailVisible}
        onClose={handleDetailCancel}
        params={detailParams}
      />
      {/* 删除交互已由 DeleteGroupBuyButton 负责 */}
    </div>
  )
}
