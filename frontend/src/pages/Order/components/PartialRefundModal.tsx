import { Button, Form, InputNumber, Modal, notification } from 'antd'
import { PartialRefundParams } from 'fresh-shop-backend/types/dto.ts'
import { useState } from 'react'

import useOrderStore from '@/stores/orderStore.ts'

type PartialRefundModalProps = {
  visible: boolean
  onClose: () => void
  onSuccess?: () => void
  orderId: string
  orderTotalAmount: number
  currentRefundAmount?: number
  orderStatus: string
}

type PartialRefundButtonProps = {
  orderId: string
  orderTotalAmount: number
  currentRefundAmount?: number
  orderStatus: string
  onSuccess?: () => void
  children?: React.ReactNode
}

const PartialRefundModal = ({
  visible,
  onClose,
  onSuccess,
  orderId,
  orderTotalAmount,
  currentRefundAmount = 0,
  orderStatus
}: PartialRefundModalProps) => {
  const [form] = Form.useForm()

  const partialRefundOrder = useOrderStore(state => state.partialRefundOrder)
  const partialRefundLoading = useOrderStore(state => state.partialRefundLoading)

  // 只有已付款或已完成的订单才能进行部分退款
  const canPartialRefund = orderStatus === 'PAID' || orderStatus === 'COMPLETED'

  const maxRefundAmount = orderTotalAmount - currentRefundAmount

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()

      const params: PartialRefundParams = {
        orderId,
        refundAmount: values.refundAmount
      }

      const success = await partialRefundOrder(params)

      if (success) {
        notification.success({
          message: '成功',
          description: '部分退款操作成功'
        })
        form.resetFields()
        onClose()
        onSuccess?.()
      } else {
        notification.error({
          message: '失败',
          description: '部分退款操作失败'
        })
      }
    } catch (error: unknown) {
      console.error('部分退款失败:', error)
      notification.error({
        message: '失败',
        description: '部分退款操作失败'
      })
    }
  }

  const handleCancel = () => {
    form.resetFields()
    onClose()
  }

  return (
    <Modal
      title="部分退款"
      open={visible}
      onCancel={handleCancel}
      footer={[
        <Button
          key="cancel"
          onClick={handleCancel}
        >
          取消
        </Button>,
        <Button
          key="submit"
          type="primary"
          loading={partialRefundLoading}
          onClick={handleSubmit}
          disabled={!canPartialRefund}
        >
          确认退款
        </Button>
      ]}
      width={500}
    >
      {!canPartialRefund ? (
        <div className="py-4 text-center text-gray-500">
          <p>只有已付款或已完成的订单才能进行部分退款</p>
          <p className="mt-2 text-sm">当前订单状态：{orderStatus}</p>
        </div>
      ) : (
        <Form
          form={form}
          layout="vertical"
          className="mt-4"
        >
          <div className="mb-4 rounded-lg bg-gray-50 p-3">
            <div className="text-sm text-gray-600">
              <p>
                订单总金额：
                <span className="font-semibold text-blue-600">￥{orderTotalAmount.toFixed(2)}</span>
              </p>
              <p>
                已退款金额：
                <span className="font-semibold text-orange-600">
                  ￥{currentRefundAmount.toFixed(2)}
                </span>
              </p>
              <p>
                剩余可退款：
                <span className="font-semibold text-green-600">￥{maxRefundAmount.toFixed(2)}</span>
              </p>
            </div>
          </div>

          <Form.Item
            label="退款金额"
            name="refundAmount"
            rules={[
              { required: true, message: '请输入退款金额' },
              { type: 'number', min: 0.01, message: '退款金额必须大于0' },
              {
                validator: (_, value) => {
                  if (value && value <= 0) {
                    return Promise.reject(new Error('退款金额必须大于0'))
                  }
                  if (value && value > maxRefundAmount) {
                    return Promise.reject(
                      new Error(`退款金额不能超过剩余可退款金额 ￥${maxRefundAmount.toFixed(2)}`)
                    )
                  }
                  if (value && value > orderTotalAmount) {
                    return Promise.reject(
                      new Error(`退款金额不能超过订单总金额 ￥${orderTotalAmount.toFixed(2)}`)
                    )
                  }
                  return Promise.resolve()
                }
              }
            ]}
          >
            <InputNumber
              placeholder="请输入退款金额"
              min={0.01}
              max={maxRefundAmount}
              step={0.01}
              precision={2}
              className="w-full"
              addonBefore="￥"
            />
          </Form.Item>
        </Form>
      )}
    </Modal>
  )
}

const PartialRefundButton = ({
  orderId,
  orderTotalAmount,
  currentRefundAmount = 0,
  orderStatus,
  onSuccess,
  children
}: PartialRefundButtonProps) => {
  const [modalVisible, setModalVisible] = useState(false)

  // 只有已付款或已完成的订单才能进行部分退款
  const canPartialRefund = orderStatus === 'PAID' || orderStatus === 'COMPLETED'

  const handleClick = () => {
    setModalVisible(true)
  }

  const handleModalClose = () => {
    setModalVisible(false)
  }

  const handleSuccess = () => {
    setModalVisible(false)
    onSuccess?.()
  }

  return (
    <>
      <Button
        color="danger"
        variant="outlined"
        onClick={handleClick}
        disabled={!canPartialRefund}
      >
        {children || '部分退款'}
      </Button>

      <PartialRefundModal
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

export default PartialRefundModal
export { PartialRefundButton }
