import type { PopconfirmProps } from 'antd'
import { Button, Flex, Image, message, Popconfirm, Spin } from 'antd'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router'

import Modify from '@/pages/GroupBuy/Modify.tsx'
import useGroupBuyStore from '@/stores/groupBuyStore.ts'
import { formatDate } from '@/utils'

export const Component = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [visible, setVisible] = useState(false)

  const groupBuy = useGroupBuyStore(state => state.groupBuy)
  const getGroupBuy = useGroupBuyStore(state => state.getGroupBuy)
  const getLoading = useGroupBuyStore(state => state.getLoading)
  const deleteGroupBuy = useGroupBuyStore(state => state.deleteGroupBuy)
  const setGroupBuy = useGroupBuyStore(state => state.setGroupBuy)

  const images: string[] = useMemo(() => {
    return groupBuy?.images
      ? JSON.parse(groupBuy.images).map((image: string) => {
          return (
            '//' +
            location.hostname +
            (location.port ? import.meta.env.VITE_IMAGES_PORT : '') +
            import.meta.env.VITE_IMAGES_BASE_URL +
            image
          )
        })
      : []
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

  const confirm: PopconfirmProps['onConfirm'] = async () => {
    const res = await deleteGroupBuy({ id: id as string })
    if (res) {
      message.success('删除成功')
      navigate('/groupBuy')
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
                color="primary"
                variant="outlined"
                onClick={() => setVisible(true)}
              >
                编辑
              </Button>
              <Popconfirm
                title={<div className="text-lg">确定要删除这个供应商吗？</div>}
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
            {groupBuy?.units ? (
              JSON.parse(groupBuy.units).map((item: any, index: number) => (
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
                  <div className="flex items-center">
                    <span className="w-20 flex-shrink-0 text-gray-500">成本价：</span>
                    <span className="font-medium text-blue-500">￥{item.costPrice}</span>
                  </div>
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
          <div className="rounded-lg bg-white p-4 shadow-sm">
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
    </div>
  )
}
