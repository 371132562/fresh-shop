import type { PopconfirmProps } from 'antd'
import { Button, Flex, Image, List, notification, Popconfirm, Spin, Tag } from 'antd'
import { GroupBuy, Order } from 'fresh-shop-backend/types/dto.ts'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router'

import Modify from '@/pages/GroupBuy/Modify.tsx'
import OrderModify from '@/pages/Order/Modify.tsx'
import useGlobalSettingStore from '@/stores/globalSettingStore.ts'
import useGroupBuyStore, { GroupBuyUnit } from '@/stores/groupBuyStore.ts'
import useOrderStore, { OrderStatus, OrderStatusMap } from '@/stores/orderStore.ts'
import { formatDate } from '@/utils'

export const Component = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [visible, setVisible] = useState(false)
  const [againVisible, setAgainVisible] = useState(false)
  const [againGroupBuy, setAgainGroupBuy] = useState<GroupBuy | null>(null)
  const [orderModifyVisible, setOrderModifyVisible] = useState(false)

  const groupBuy = useGroupBuyStore(state => state.groupBuy)
  const getGroupBuy = useGroupBuyStore(state => state.getGroupBuy)
  const getLoading = useGroupBuyStore(state => state.getLoading)
  const deleteGroupBuy = useGroupBuyStore(state => state.deleteGroupBuy)
  const setGroupBuy = useGroupBuyStore(state => state.setGroupBuy)
  const globalSetting = useGlobalSettingStore(state => state.globalSetting)
  const updateOrder = useOrderStore(state => state.updateOrder)

  const images: string[] = useMemo(() => {
    return Array.isArray(groupBuy?.images)
      ? groupBuy.images
          .filter((image): image is string => typeof image === 'string')
          .map(
            image =>
              '//' +
              location.hostname +
              (location.port ? import.meta.env.VITE_IMAGES_PORT : '') +
              import.meta.env.VITE_IMAGES_BASE_URL +
              image
          )
      : []
  }, [groupBuy])

  const unitStatistics = useMemo(() => {
    // 如果没有订单或规格信息，则返回空数组
    if (
      !groupBuy?.order?.length ||
      !groupBuy.units ||
      !Array.isArray(groupBuy.units) ||
      !groupBuy.units.length
    ) {
      return []
    }

    const stats: Record<string, { name: string; quantity: number }> = {}

    // 使用团购中所有可用规格初始化统计对象
    ;(groupBuy.units as GroupBuyUnit[]).forEach(unit => {
      stats[unit.id] = { name: unit.unit, quantity: 0 }
    })

    // 汇总每个订单的数量
    ;(groupBuy.order as Order[]).forEach(order => {
      if (order.unitId && stats[order.unitId]) {
        stats[order.unitId].quantity += order.quantity
      }
    })

    // 过滤掉未被订购的规格
    return Object.values(stats).filter(item => item.quantity > 0)
  }, [groupBuy])

  useEffect(() => {
    if (id) {
      getGroupBuy({ id })
    }
    // 清除数据，避免在切换页面时显示旧数据
    return () => {
      setGroupBuy(null)
    }
  }, [id])

  useEffect(() => {
    if (id) {
      getGroupBuy({ id })
    }
  }, [orderModifyVisible])

  const confirm: PopconfirmProps['onConfirm'] = async () => {
    const res = await deleteGroupBuy({ id: id as string })
    if (res) {
      notification.success({
        message: '成功',
        description: '删除成功'
      })
      navigate('/groupBuy')
    }
  }

  const handleUpdateOrderStatus = async (order: Order) => {
    if (!order.id) return
    // 统一使用前端 OrderStatus 类型，避免类型不兼容
    const orderStatusValues = Object.values(OrderStatus) as OrderStatus[]
    const currentIndex = orderStatusValues.findIndex(status => status === order.status)
    if (currentIndex < orderStatusValues.length - 1) {
      const nextStatus = orderStatusValues[currentIndex + 1]
      const res = await updateOrder({
        id: order.id,
        status: nextStatus
      })
      if (res) {
        notification.success({
          message: '成功',
          description: `订单状态已更新为：${OrderStatusMap[nextStatus].label}`
        })
        if (id) {
          getGroupBuy({ id })
        }
      } else {
        notification.error({
          message: '失败',
          description: '更新订单状态失败'
        })
      }
    } else {
      notification.info({
        message: '提示',
        description: '订单已是最终状态，无法继续修改'
      })
    }
  }

  return (
    <div className="w-full">
      <Spin
        spinning={getLoading}
        size="large"
        tip="加载中..."
        className="w-full"
      >
        {/* 主要信息卡片 */}
        <div className="mb-4 rounded-lg bg-white p-4 shadow-sm">
          {/* 卡片标题及操作按钮：保持你原有的设计不变 */}
          <h3 className="mb-4 flex flex-col justify-between border-b border-gray-100 pb-3 text-xl font-bold text-gray-800">
            <div className="mb-3">{groupBuy?.name || '加载中...'}</div>
            <Flex
              gap="small"
              wrap
              justify="end"
            >
              <Button
                type="primary"
                onClick={() => setOrderModifyVisible(true)}
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
              <Popconfirm
                title={<div className="text-lg">确定要删除这个团购单吗？</div>}
                placement="left"
                onConfirm={confirm}
                okText="是"
                cancelText="否"
                okButtonProps={{ size: 'large', color: 'danger', variant: 'solid' }}
                cancelButtonProps={{ size: 'large', color: 'primary', variant: 'outlined' }}
              >
                <Button
                  color="danger"
                  variant="solid"
                >
                  删除
                </Button>
              </Popconfirm>
            </Flex>
          </h3>

          {/* 团购基础信息：改回单列模式 */}
          <div className="space-y-3">
            {/* 发起时间 */}
            <div className="flex items-start text-base">
              <span className="w-20 flex-shrink-0 font-medium text-gray-500">发起时间：</span>
              <span className="word-break-all flex-grow break-words text-gray-700">
                {groupBuy?.groupBuyStartDate ? (
                  formatDate(groupBuy.groupBuyStartDate)
                ) : (
                  <span className="italic text-gray-400">无</span>
                )}
              </span>
            </div>

            {/* 供应商 */}
            <div className="flex items-start text-base">
              <span className="w-20 flex-shrink-0 font-medium text-gray-500">供应商：</span>
              <span className="word-break-all flex-grow break-words text-gray-700">
                {groupBuy?.supplier?.name || <span className="italic text-gray-400">无</span>}
              </span>
            </div>

            {/* 商品 */}
            <div className="flex items-start text-base">
              <span className="w-20 flex-shrink-0 font-medium text-gray-500">商品：</span>
              <span className="word-break-all flex-grow break-words text-gray-700">
                {groupBuy?.product?.name || <span className="italic text-gray-400">无</span>}
              </span>
            </div>

            {/* 备注 */}
            <div className="flex items-start text-base">
              <span className="w-20 flex-shrink-0 font-medium text-gray-500">备注：</span>
              <span className="word-break-all flex-grow break-words text-gray-700">
                {groupBuy?.description || <span className="italic text-gray-400">无</span>}
              </span>
            </div>
          </div>
        </div>

        {/* 规格信息卡片 - 优化显示方式 */}
        <div className="mb-4 rounded-lg bg-white p-4 shadow-sm">
          <h3 className="mb-3 border-b border-gray-100 pb-2 text-base font-semibold text-gray-700">
            商品规格
          </h3>
          <div className="space-y-4">
            {/* 增加每项规格之间的垂直间距 */}
            {groupBuy && Array.isArray(groupBuy?.units) ? (
              (groupBuy.units as GroupBuyUnit[]).map((item, index: number) => (
                <div
                  key={index}
                  className="rounded-md bg-gray-50 p-3"
                >
                  {/* 为每项规格添加背景和内边距，形成独立区块 */}
                  <div className="mb-3 flex items-center">
                    {/* 规格名称单独一行，更醒目 */}
                    <span className="w-20 flex-shrink-0 text-gray-500">计量单位：</span>
                    <span className="font-bold text-blue-500">{item.unit}</span>
                    {/* 规格值加粗并使用蓝色强调 */}
                  </div>
                  <div className="mb-3 flex items-center">
                    <span className="w-20 flex-shrink-0 text-gray-500">售价：</span>
                    <span className="mr-2 font-medium text-blue-500">￥{item.price}</span>
                  </div>
                  {!globalSetting?.value?.sensitive && (
                    <div className="flex items-center">
                      <span className="w-20 flex-shrink-0 text-gray-500">成本价：</span>
                      <span className="font-medium text-blue-500">￥{item.costPrice}</span>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="py-2 text-base text-gray-700">
                <span className="italic text-gray-400">无规格信息</span>
              </div>
            )}
          </div>
        </div>

        {/* 图片展示区卡片 */}
        {images.length > 0 && (
          <div className="mb-4 rounded-lg bg-white p-4 shadow-sm">
            {/* 保持 p-4 */}
            <h3 className="mb-3 border-b border-gray-100 pb-2 text-base font-semibold text-gray-700">
              相关图片
            </h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {/* 保持原有的图片网格布局 */}
              <Image.PreviewGroup>
                {images.map((image, index) => (
                  <div
                    key={index}
                    className="relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-md bg-gray-100" // 保持圆角 md
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

        {/* 订单信息卡片 */}
        <div className="mb-4 rounded-lg bg-white p-4 shadow-sm">
          <h3 className="mb-3 border-b border-gray-100 pb-2 text-base font-semibold text-gray-700">
            订单信息 共 {groupBuy?.order?.length || 0} 条
          </h3>
          {unitStatistics.length > 0 && (
            <div className="mb-4 rounded-md bg-gray-50 p-4">
              <h4 className="mb-3 text-base font-semibold text-gray-600">各规格售卖统计</h4>
              <ul className="space-y-2">
                {unitStatistics.map(stat => (
                  <li
                    key={stat.name}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="text-gray-700">{stat.name}</span>
                    <span className="font-bold text-blue-600">{stat.quantity} 份</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <List
            itemLayout="horizontal"
            dataSource={groupBuy?.order}
            renderItem={order => {
              const unit = (groupBuy?.units as GroupBuyUnit[])?.find(
                item => item.id === order.unitId
              )
              const orderStatusValues = Object.values(OrderStatus) as OrderStatus[]
              const currentIndex = orderStatusValues.findIndex(status => status === order.status)
              const nextStatusLabel =
                currentIndex < orderStatusValues.length - 1
                  ? OrderStatusMap[orderStatusValues[currentIndex + 1]].label
                  : '无'

              return (
                <List.Item
                  actions={[
                    <Popconfirm
                      key="update-status"
                      title={
                        <div className="text-lg">
                          确定要将订单状态变更为{' '}
                          <span className="text-blue-500">{nextStatusLabel}</span> 吗？
                        </div>
                      }
                      placement="left"
                      onConfirm={() => handleUpdateOrderStatus(order)}
                      okText="确定"
                      cancelText="取消"
                      disabled={currentIndex === orderStatusValues.length - 1}
                      okButtonProps={{ size: 'large', color: 'primary', variant: 'solid' }}
                      cancelButtonProps={{ size: 'large', color: 'primary', variant: 'outlined' }}
                    >
                      <Button
                        type="primary"
                        disabled={currentIndex === orderStatusValues.length - 1}
                      >
                        更新状态
                      </Button>
                    </Popconfirm>
                  ]}
                >
                  <List.Item.Meta
                    title={
                      <span className="text-base font-medium text-gray-800">
                        {order?.customer?.name || '无客户信息'}
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
                            <Tag color={OrderStatusMap[order.status].color}>
                              {OrderStatusMap[order.status].label}
                            </Tag>
                          </span>
                        </p>
                      </div>
                    }
                  />
                </List.Item>
              )
            }}
          />
          {!groupBuy?.order?.length && (
            <div className="py-2 text-base text-gray-700">
              <span className="italic text-gray-400">无订单信息</span>
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
      {orderModifyVisible && (
        <OrderModify
          visible={orderModifyVisible}
          setVisible={setOrderModifyVisible}
          groupBuyId={id}
        />
      )}
    </div>
  )
}
