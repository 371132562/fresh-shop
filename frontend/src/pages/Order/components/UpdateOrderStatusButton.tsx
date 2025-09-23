import { Button, Popconfirm } from 'antd'
import { message } from 'antd'
import React from 'react'

import useOrderStore, { OrderStatusMap } from '@/stores/orderStore.ts'

type Props = {
  orderId: string
  status: 'NOTPAID' | 'PAID' | 'COMPLETED' | 'REFUNDED'
  onSuccess?: () => void
}

const UpdateOrderStatusButton: React.FC<Props> = ({ orderId, status, onSuccess }) => {
  const updateOrder = useOrderStore(state => state.updateOrder)
  const canUpdateOrderStatus = useOrderStore(state => state.canUpdateOrderStatus)
  const getNextOrderStatus = useOrderStore(state => state.getNextOrderStatus)
  const getNextOrderStatusLabel = useOrderStore(state => state.getNextOrderStatusLabel)

  if (!orderId) return null

  return (
    <Popconfirm
      title={
        <div className="text-lg">
          确定要将订单状态变更为{' '}
          <span className="text-blue-500">{getNextOrderStatusLabel(status)}</span> 吗？
        </div>
      }
      placement="left"
      onConfirm={async () => {
        const next = getNextOrderStatus(status)
        if (!next) {
          message.info('订单已是最终状态，无法继续修改')
          return
        }
        const ok = await updateOrder({ id: orderId, status: next })
        if (ok) {
          message.success(`订单状态已更新为：${OrderStatusMap[next].label}`)
          onSuccess?.()
        } else {
          message.error('更新订单状态失败')
        }
      }}
      okText="确定"
      cancelText="取消"
      okButtonProps={{ size: 'large', color: 'primary', variant: 'solid' }}
      cancelButtonProps={{ size: 'large', color: 'primary', variant: 'outlined' }}
    >
      <Button
        color="primary"
        variant="outlined"
        disabled={!canUpdateOrderStatus(status)}
      >
        更新状态
      </Button>
    </Popconfirm>
  )
}

export default UpdateOrderStatusButton
