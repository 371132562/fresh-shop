import { Button, Divider, InputNumber, message, Modal, Popconfirm } from 'antd'
import { Decimal } from 'decimal.js'
import type { PartialRefundParams } from 'fresh-shop-backend/types/dto.ts'
import { useState } from 'react'

import useOrderStore from '@/stores/orderStore.ts'

type RefundModalProps = {
  visible: boolean
  onClose: () => void
  onSuccess?: (refundAmount: number) => void
  orderId: string
  orderTotalAmount: number
  currentRefundAmount?: number
  orderStatus: string
}

type RefundButtonProps = {
  orderId: string
  orderTotalAmount: number
  currentRefundAmount?: number
  orderStatus: string
  onSuccess?: (refundAmount: number) => void
}

const RefundModal = ({
  visible,
  onClose,
  onSuccess,
  orderId,
  orderTotalAmount,
  currentRefundAmount = 0
}: RefundModalProps) => {
  const [refundAmount, setRefundAmount] = useState<number | null>(null)
  const [error, setError] = useState<string>('')

  const partialRefundOrder = useOrderStore(state => state.partialRefundOrder)
  const partialRefundLoading = useOrderStore(state => state.partialRefundLoading)
  const refundOrder = useOrderStore(state => state.refundOrder)
  const refundLoading = useOrderStore(state => state.refundLoading)

  // 使用 decimal.js 计算剩余可退款金额
  const maxRefundAmount = new Decimal(orderTotalAmount).minus(currentRefundAmount).toNumber()

  // 校验退款金额
  const validateAmount = (value: number | null): string => {
    if (value === null || value === undefined) {
      return '请输入退款金额'
    }
    const valDecimal = new Decimal(value)
    if (valDecimal.lte(0)) {
      return '退款金额必须大于0'
    }
    if (valDecimal.gt(maxRefundAmount)) {
      return `退款金额不能超过剩余可退款金额 ￥${maxRefundAmount.toFixed(2)}`
    }
    return ''
  }

  const handleAmountChange = (value: number | null) => {
    setRefundAmount(value)
    setError(validateAmount(value))
  }

  const handlePartialRefund = async () => {
    const errorMsg = validateAmount(refundAmount)
    if (errorMsg) {
      setError(errorMsg)
      return
    }

    const params: PartialRefundParams = {
      orderId,
      refundAmount: Number(refundAmount!.toFixed(2))
    }

    const success = await partialRefundOrder(params)

    if (success) {
      const isFullAfterThis = new Decimal(refundAmount!).gte(maxRefundAmount)
      if (isFullAfterThis) {
        message.success({
          content: (
            <div>
              已达到全额退款金额，本单已全额退款，金额：
              <span className="font-semibold text-orange-600">￥{orderTotalAmount.toFixed(2)}</span>
            </div>
          )
        })
      } else {
        message.success({
          content: (
            <div>
              已部分退款，金额：
              <span className="font-semibold text-orange-600">￥{refundAmount!.toFixed(2)}</span>
              ，剩余可退：
              <span className="font-semibold text-blue-600">
                ￥{new Decimal(maxRefundAmount).minus(refundAmount!).toFixed(2)}
              </span>
            </div>
          )
        })
      }
      handleClose()
      onSuccess?.(refundAmount!)
    } else {
      message.error('部分退款操作失败')
    }
  }

  const handleFullRefund = async () => {
    const ok = await refundOrder({ id: orderId })
    if (ok) {
      message.success({
        content: (
          <div>
            已全额退款，金额：
            <span className="font-semibold text-orange-600">￥{orderTotalAmount.toFixed(2)}</span>
          </div>
        )
      })
      handleClose()
      onSuccess?.(maxRefundAmount)
    } else {
      message.error('退款失败')
    }
  }

  const handleClose = () => {
    setRefundAmount(null)
    setError('')
    onClose()
  }

  return (
    <Modal
      title="退款"
      open={visible}
      onCancel={handleClose}
      footer={null}
      width={500}
    >
      {/* 订单金额信息 */}
      <div className="mb-4 rounded-lg bg-gray-50 p-3">
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">订单总金额</span>
          <span className="font-medium text-blue-600">￥{orderTotalAmount.toFixed(2)}</span>
        </div>
        <div className="mt-2 flex justify-between text-sm">
          <span className="text-gray-500">已退款金额</span>
          <span className="font-medium text-orange-600">￥{currentRefundAmount.toFixed(2)}</span>
        </div>
        <div className="mt-2 flex justify-between text-sm">
          <span className="text-gray-500">剩余可退款</span>
          <span className="font-medium text-green-600">￥{maxRefundAmount.toFixed(2)}</span>
        </div>
      </div>

      {/* 部分退款区域 */}
      <div className="rounded-lg border border-gray-200 p-4">
        <div className="mb-3 text-sm font-medium text-gray-700">部分退款</div>
        <div className="flex items-center gap-2">
          <span className="text-gray-500">￥</span>
          <InputNumber
            className="flex-1"
            placeholder="请输入退款金额"
            min={0.01}
            max={maxRefundAmount}
            step={0.01}
            precision={2}
            value={refundAmount}
            onChange={handleAmountChange}
            status={error ? 'error' : undefined}
          />
          <Button
            type="primary"
            loading={partialRefundLoading}
            disabled={!refundAmount || !!error}
            onClick={handlePartialRefund}
          >
            确认退款
          </Button>
        </div>
        {error && <div className="mt-2 text-xs text-red-500">{error}</div>}
      </div>

      <Divider className="!my-4">
        <span className="text-xs text-gray-400">或</span>
      </Divider>

      {/* 全额退款区域 */}
      <Popconfirm
        title={<div className="text-base">确定对该订单进行全额退款吗？</div>}
        description={
          <div className="text-sm text-gray-500">
            将退还剩余可退金额 ￥{maxRefundAmount.toFixed(2)}
          </div>
        }
        onConfirm={handleFullRefund}
        okText="确定"
        cancelText="取消"
        okButtonProps={{ danger: true }}
      >
        <Button
          block
          color="danger"
          variant="outlined"
          loading={refundLoading}
        >
          全额退款（￥{maxRefundAmount.toFixed(2)}）
        </Button>
      </Popconfirm>
    </Modal>
  )
}

const RefundButton = ({
  orderId,
  orderTotalAmount,
  currentRefundAmount = 0,
  orderStatus,
  onSuccess
}: RefundButtonProps) => {
  const [modalVisible, setModalVisible] = useState(false)

  const handleClick = () => {
    setModalVisible(true)
  }

  const handleModalClose = () => {
    setModalVisible(false)
  }

  const handleSuccess = (refundAmount: number) => {
    setModalVisible(false)
    onSuccess?.(refundAmount)
  }

  return (
    <>
      <Button
        color="danger"
        variant="outlined"
        onClick={handleClick}
        disabled={!(orderStatus === 'PAID' || orderStatus === 'COMPLETED')}
      >
        退款
      </Button>

      <RefundModal
        visible={modalVisible}
        onClose={handleModalClose}
        onSuccess={handleSuccess}
        orderId={orderId}
        orderTotalAmount={orderTotalAmount}
        currentRefundAmount={currentRefundAmount}
        orderStatus={orderStatus}
      />
    </>
  )
}

export default RefundButton
