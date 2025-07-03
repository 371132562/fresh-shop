import { PopconfirmProps, Tag } from 'antd'
import { Button, Flex, message, Popconfirm, Spin } from 'antd'
import { OrderStatus, OrderStatusMap } from 'fresh-shop-backend/types/dto.ts'
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router'

import Modify from '@/pages/Order/Modify.tsx'
import useOrderStore from '@/stores/orderStore.ts'

export const Component = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [visible, setVisible] = useState(false)

  const order = useOrderStore(state => state.order)
  const getOrder = useOrderStore(state => state.getOrder)
  const getLoading = useOrderStore(state => state.getLoading)
  const deleteOrder = useOrderStore(state => state.deleteOrder)
  const deleteLoading = useOrderStore(state => state.deleteLoading)
  const setOrder = useOrderStore(state => state.setOrder)
  const refundOrder = useOrderStore(state => state.refundOrder)
  const refundLoading = useOrderStore(state => state.refundLoading)

  useEffect(() => {
    if (id) {
      getOrder({ id })
    }
    // 清除数据，避免在切换页面时显示旧数据
    return () => {
      setOrder(null)
    }
  }, [id])

  const confirm: PopconfirmProps['onConfirm'] = async () => {
    const res = await deleteOrder({ id: id as string })
    if (res) {
      message.success('删除成功')
      navigate('/order')
    }
  }

  const refund: PopconfirmProps['onConfirm'] = async () => {
    const res = await refundOrder({ id: id as string })
    if (res) {
      message.success('退款成功')
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
            <div className="mb-3">
              {order?.status ? (
                <div className="flex items-center">
                  <span className="mr-2">订单状态</span>
                  <Tag color={order.status === OrderStatus.COMPLETED ? '#87d068' : '#f50'}>
                    {OrderStatusMap[order.status]}
                  </Tag>
                </div>
              ) : (
                '加载中...'
              )}
            </div>
            <Flex
              gap="small"
              wrap
              justify="end"
            >
              {order?.status === OrderStatus.COMPLETED && (
                <Popconfirm
                  title={<div className="text-lg">确定要退款这个订单吗？</div>}
                  onConfirm={refund}
                  okText="是"
                  cancelText="否"
                  okButtonProps={{ size: 'large', color: 'danger', variant: 'solid' }}
                  cancelButtonProps={{ size: 'large', color: 'primary', variant: 'outlined' }}
                >
                  <Button
                    color="danger"
                    variant="outlined"
                    loading={refundLoading}
                  >
                    退款
                  </Button>
                </Popconfirm>
              )}
              <Button
                color="primary"
                variant="outlined"
                onClick={() => setVisible(true)}
              >
                编辑
              </Button>
              <Popconfirm
                title={<div className="text-lg">确定要删除这个订单吗？</div>}
                onConfirm={confirm}
                okText="是"
                cancelText="否"
                okButtonProps={{ size: 'large', color: 'danger', variant: 'solid' }}
                cancelButtonProps={{ size: 'large', color: 'primary', variant: 'outlined' }}
              >
                <Button
                  color="danger"
                  variant="solid"
                  loading={deleteLoading}
                >
                  删除
                </Button>
              </Popconfirm>
            </Flex>
          </h3>

          {/* 团购基础信息：改回单列模式 */}
          <div className="space-y-3">
            {/* 客户 */}
            <div className="flex items-start text-base">
              <span className="w-20 flex-shrink-0 font-medium text-gray-500">客户：</span>
              <span className="word-break-all flex-grow break-words text-gray-700">
                {order?.customer?.name || <span className="italic text-gray-400">无</span>}
              </span>
            </div>

            {/* 团购单 */}
            <div className="flex items-start text-base">
              <span className="w-20 flex-shrink-0 font-medium text-gray-500">团购单：</span>
              <span className="word-break-all flex-grow break-words text-gray-700">
                {order?.groupBuy?.name || <span className="italic text-gray-400">无</span>}
              </span>
            </div>

            {/* 数量 */}
            <div className="flex items-start text-base">
              <span className="w-20 flex-shrink-0 font-medium text-gray-500">数量：</span>
              <span className="word-break-all flex-grow break-words text-gray-700">
                {order?.quantity || <span className="italic text-gray-400">无</span>}
              </span>
            </div>

            {/* 备注 */}
            <div className="flex items-start text-base">
              <span className="w-20 flex-shrink-0 font-medium text-gray-500">备注：</span>
              <span className="word-break-all flex-grow break-words text-gray-700">
                {order?.description || <span className="italic text-gray-400">无</span>}
              </span>
            </div>
          </div>
        </div>

        {/* 如果没有数据，显示提示 */}
        {!getLoading && !order?.id && (
          <div className="py-8 text-center text-gray-500">
            {/* 保持 py-8 */}
            <p className="mb-2">暂无订单信息。</p>
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
    </div>
  )
}
