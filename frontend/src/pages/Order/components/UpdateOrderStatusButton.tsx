import { Button, Popconfirm, Tag } from 'antd'
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

  if (!orderId) return null

  return (
    <Popconfirm
      title={
        <div className="!text-lg">
          确定要将订单状态变更为{' '}
          {(() => {
            const next = getNextOrderStatus(status)
            return next ? (
              <Tag
                variant="solid"
                className="!text-base"
                color={OrderStatusMap[next].color}
              >
                {OrderStatusMap[next].label}
              </Tag>
            ) : (
              <span className="text-gray-500">不可变更</span>
            )
          })()}
          吗？
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
          message.success({
            content: (
              <div>
                订单状态已更新为：
                <Tag
                  variant="solid"
                  color={OrderStatusMap[next].color}
                >
                  {OrderStatusMap[next].label}
                </Tag>
              </div>
            )
          })
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
