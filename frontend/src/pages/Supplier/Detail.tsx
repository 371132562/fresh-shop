import { EditOutlined } from '@ant-design/icons'
import { FloatButton, Image, Spin } from 'antd'
import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router'

import Modify from '@/pages/Supplier/Modify.tsx'
import useSupplierStore from '@/stores/supplierStore.ts'

export const Component = () => {
  const { id } = useParams()
  const [visible, setVisible] = useState(false)

  const supplier = useSupplierStore(state => state.supplier)
  const getSupplier = useSupplierStore(state => state.getSupplier)
  const getLoading = useSupplierStore(state => state.getLoading)

  const images: string[] = useMemo(() => {
    return supplier.images
      ? JSON.parse(supplier.images).map((image: string) => {
          return import.meta.env.VITE_SERVER_URL + import.meta.env.VITE_IMAGES_BASE_URL + image
        })
      : []
  }, [supplier.images])

  useEffect(() => {
    getSupplier({ id })
  }, [])

  return (
    <div className="w-full">
      <Spin
        spinning={getLoading}
        size="large"
        tip="加载中..."
        className="w-full"
      >
        {/* Spin 调整大小和提示 */}
        {/* 主要信息卡片 */}
        <div className="mb-4 rounded-lg bg-white p-4 shadow-sm">
          <h3 className="mb-4 border-b border-gray-100 pb-3 text-xl font-bold text-gray-800">
            {supplier?.name || '加载中...'} {/* 供应商名称作为卡片标题 */}
          </h3>

          {/* 信息列表 */}
          <div className="space-y-3">
            {/* 联系电话 */}
            <div className="flex items-start text-base">
              <span className="w-20 flex-shrink-0 font-medium text-gray-500">联系电话：</span>
              <span className="word-break-all flex-grow break-words text-gray-700">
                {supplier?.phone || <span className="italic text-gray-400">无</span>}
              </span>
            </div>

            {/* 微信 */}
            <div className="flex items-start text-base">
              <span className="w-20 flex-shrink-0 font-medium text-gray-500">微信：</span>
              <span className="word-break-all flex-grow break-words text-gray-700">
                {supplier?.wechat || <span className="italic text-gray-400">无</span>}
              </span>
            </div>

            {/* 描述 */}
            <div className="flex items-start text-base">
              <span className="w-20 flex-shrink-0 font-medium text-gray-500">描述：</span>
              <span className="word-break-all flex-grow break-words text-gray-700">
                {supplier?.description || <span className="italic text-gray-400">无</span>}
              </span>
            </div>

            {/* 评价 */}
            <div className="flex items-start text-base">
              <span className="w-20 flex-shrink-0 font-medium text-gray-500">评价：</span>
              <span className="word-break-all flex-grow break-words text-gray-700">
                {supplier?.rating || <span className="italic text-gray-400">无</span>}
              </span>
            </div>
          </div>
        </div>
        {/* 图片展示区卡片 */}
        {images.length > 0 && (
          <div className="rounded-lg bg-white p-4 shadow-sm">
            <h3 className="mb-3 border-b border-gray-100 pb-2 text-base font-semibold text-gray-700">
              相关图片
            </h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {/* 更灵活的响应式网格布局 */}
              <Image.PreviewGroup>
                {/* 使用 PreviewGroup 允许图片预览 */}
                {images.map((image, index) => (
                  <div
                    key={index}
                    className="relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-md bg-gray-100"
                  >
                    <Image
                      src={image}
                      alt={`供应商图片 ${index + 1}`}
                      className="h-full w-full object-cover" // 图片覆盖整个区域
                      fallback="/placeholder.svg" // 自定义加载失败的占位符
                      placeholder={
                        <div className="flex h-full w-full items-center justify-center bg-gray-200">
                          <Spin size="small" /> {/* 图片加载时的菊花图 */}
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
        {!getLoading && !supplier?.id && (
          <div className="py-8 text-center text-gray-500">
            <p className="mb-2">暂无供应商信息。</p>
            <p className="text-sm">请检查ID或稍后重试。</p>
          </div>
        )}
      </Spin>
      <FloatButton
        style={{ position: 'absolute', left: 24 }}
        icon={<EditOutlined />}
        type="primary"
        shape="circle"
        onClick={() => setVisible(true)}
      />
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
