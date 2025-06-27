import { Image, Spin } from 'antd'
import { useEffect, useMemo } from 'react'
import { useParams } from 'react-router'

import useSupplierStore from '@/stores/supplierStore.ts'

export const Component = () => {
  const { id } = useParams()
  const supplier = useSupplierStore(state => state.supplier)
  const getSupplier = useSupplierStore(state => state.getSupplier)
  const getLoading = useSupplierStore(state => state.getLoading)

  const images: string[] = useMemo(() => {
    return supplier.images ? JSON.parse(supplier.images) : []
  }, [supplier.images])

  useEffect(() => {
    getSupplier({ id })
  }, [])

  return (
    <div className="w-full">
      <Spin spinning={getLoading}>
        <p className="border-b-1 h-18 flex items-center justify-center border-gray-200 text-2xl">
          {supplier.name}
        </p>
        <p className="border-b-1 h-13 flex items-center border-gray-100 text-lg last:border-b-0">
          联系电话：{supplier.phone || '无'}
        </p>
        <p className="border-b-1 h-13 flex items-center border-gray-100 text-lg last:border-b-0">
          微信：{supplier.wechat || '无'}
        </p>
        <p className="border-b-1 h-13 flex items-center border-gray-100 text-lg last:border-b-0">
          描述：{supplier.description || '无'}
        </p>
        <p className="border-b-1 h-13 flex items-center border-gray-100 text-lg last:border-b-0">
          评价：{supplier.rating || '无'}
        </p>
        {images.length > 0 && (
          <div className="mt-2 flex flex-wrap">
            {images.map(image => {
              return (
                <div className="w-1/2 p-1 sm:w-1/2 md:w-1/3 lg:w-1/4 xl:w-1/5">
                  <div className="flex aspect-square w-full items-center justify-center overflow-hidden border border-gray-200">
                    <Image
                      src={'//192.168.1.4:3000' + import.meta.env.VITE_IMAGES_BASE_URL + image}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Spin>
    </div>
  )
}
