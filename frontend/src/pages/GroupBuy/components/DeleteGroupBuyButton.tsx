import { ExclamationCircleOutlined } from '@ant-design/icons'
import { Button, Checkbox, message, Modal, Tag } from 'antd'
import type { MergedGroupBuyOverviewDetailParams, Order } from 'fresh-shop-backend/types/dto'
import { useMemo, useState } from 'react'

import MergedGroupBuyDetailModal from '@/pages/Analysis/components/GroupBuyOverview/components/MergedGroupBuyDetailModal'
import useGroupBuyStore from '@/stores/groupBuyStore'
import { OrderStatus, OrderStatusMap } from '@/stores/orderStore'

type Props = {
  id: string
  name?: string
  orders?: Order[]
  orderStats?: Record<string, number>
  size?: 'small' | 'middle' | 'large'
  onDeleted?: () => void
}

const DeleteGroupBuyButton = ({
  id,
  name,
  orders,
  orderStats,
  size = 'middle',
  onDeleted
}: Props) => {
  const deleteGroupBuy = useGroupBuyStore(state => state.deleteGroupBuy)
  const [visible, setVisible] = useState(false)
  const [ack, setAck] = useState(false)
  const [loading, setLoading] = useState(false)
  const [detailVisible, setDetailVisible] = useState(false)
  const [detailParams] = useState<MergedGroupBuyOverviewDetailParams | undefined>()

  const { countsByLabel, totalOrders } = useMemo(() => {
    // 优先使用 orders 精确统计；否则使用列表提供的 orderStats
    if (Array.isArray(orders) && orders.length) {
      const map: Record<string, number> = {}
      orders.forEach(order => {
        const label = OrderStatusMap[order.status].label
        map[label] = (map[label] || 0) + 1
      })
      return { countsByLabel: map, totalOrders: orders.length }
    }
    if (orderStats) {
      const map: Record<string, number> = {}
      Object.entries(orderStats).forEach(([statusKey, count]) => {
        if (statusKey === 'orderCount') return
        const statusInfo = OrderStatusMap[statusKey as OrderStatus]
        const numeric = Number(count || 0)
        if (statusInfo && numeric > 0) {
          map[statusInfo.label] = (map[statusInfo.label] || 0) + numeric
        }
      })
      const total = Number(orderStats.orderCount || 0)
      return { countsByLabel: map, totalOrders: total }
    }
    return { countsByLabel: {}, totalOrders: 0 }
  }, [orders, orderStats])

  const handleOpen = () => {
    setVisible(true)
  }

  const handleCancel = () => {
    setVisible(false)
    setAck(false)
  }

  const handleConfirm = async () => {
    setLoading(true)
    const ok = await deleteGroupBuy({ id })
    setLoading(false)
    if (ok) {
      message.success('团购单已删除')
      setVisible(false)
      setAck(false)
      onDeleted?.()
    }
  }

  const DeleteSummary = () => {
    if (!totalOrders) {
      return <div className="text-base">删除此团购单后将无法恢复。</div>
    }
    return (
      <div className="space-y-3">
        <div className="rounded-md border border-orange-200 bg-orange-50 p-3">
          <div className="mb-1 text-sm font-medium text-orange-800">
            删除 {name || '该团购单'} 将同时删除以下订单
          </div>
          <div className="space-y-2">
            {Object.entries(countsByLabel).map(([label, count]) => {
              const orderStatus = Object.entries(OrderStatusMap).find(
                ([, s]) => s.label === label
              )?.[0] as OrderStatus
              const color = orderStatus ? OrderStatusMap[orderStatus].color : '#666'
              return (
                <div
                  key={label}
                  className="flex items-center justify-between rounded border border-orange-100 bg-white px-3 py-2"
                >
                  <Tag
                    color={color}
                    className="text-xs"
                  >
                    {label}
                  </Tag>
                  <span className="text-sm font-semibold text-orange-700">{count} 个</span>
                </div>
              )
            })}
          </div>
          <div className="mt-2 text-xs text-orange-600">
            总计：<span className="font-semibold">{totalOrders}</span> 个订单将被删除
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <Button
        color="danger"
        variant="solid"
        size={size}
        onClick={handleOpen}
      >
        删除
      </Button>
      <Modal
        width={450}
        title={
          <div className="flex items-center gap-2">
            <ExclamationCircleOutlined className="text-xl text-red-500" />
            <span className="text-lg font-semibold">删除团购单</span>
          </div>
        }
        open={visible}
        onCancel={handleCancel}
        footer={
          <div className="flex w-full items-center justify-end gap-2">
            <Button
              onClick={handleCancel}
              size="large"
            >
              取消
            </Button>
            <Button
              color="danger"
              variant="solid"
              size="large"
              disabled={!ack}
              loading={loading}
              onClick={handleConfirm}
            >
              确认删除
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <div className="rounded-md bg-white">
            <DeleteSummary />
          </div>
          <div className="rounded-md bg-red-50 p-3">
            <Checkbox
              checked={ack}
              onChange={e => setAck(e.target.checked)}
            >
              <div className="text-sm text-red-700">
                此操作不可撤销，将永久删除团购单及其相关数据。
              </div>
              <div className="text-sm text-red-700">我已了解删除后果，确认继续。</div>
            </Checkbox>
          </div>
        </div>
      </Modal>

      <MergedGroupBuyDetailModal
        visible={detailVisible}
        onClose={() => setDetailVisible(false)}
        params={detailParams}
      />
    </>
  )
}

export default DeleteGroupBuyButton
