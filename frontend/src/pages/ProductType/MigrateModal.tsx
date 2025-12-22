import { List, message, Modal, Select, Spin } from 'antd'
import type { ProductTypeMigratePreviewResult } from 'fresh-shop-backend/types/dto'
import { useEffect, useState } from 'react'

import useProductTypeStore from '@/stores/productTypeStore'

interface MigrateModalProps {
  visible: boolean
  setVisible: (value: boolean) => void
  sourceId: string
  sourceName: string
  onSuccess?: () => void
}

/**
 * 商品类型迁移弹窗
 * 将源商品类型下的所有商品迁移到目标商品类型，并删除源商品类型
 */
const MigrateModal = (props: MigrateModalProps) => {
  const { visible, setVisible, sourceId, sourceName, onSuccess } = props

  const [targetId, setTargetId] = useState<string | null>(null)
  const [previewData, setPreviewData] = useState<ProductTypeMigratePreviewResult | null>(null)

  const allProductTypes = useProductTypeStore(state => state.allProductTypes)
  const getAllProductTypes = useProductTypeStore(state => state.getAllProductTypes)
  const getAllProductTypesLoading = useProductTypeStore(state => state.getAllProductTypesLoading)
  const migratePreview = useProductTypeStore(state => state.migratePreview)
  const migratePreviewLoading = useProductTypeStore(state => state.migratePreviewLoading)
  const migrate = useProductTypeStore(state => state.migrate)
  const migrateLoading = useProductTypeStore(state => state.migrateLoading)

  // 加载预览数据和商品类型列表
  useEffect(() => {
    if (visible && sourceId) {
      migratePreview({ sourceId }).then(data => {
        setPreviewData(data)
      })
      getAllProductTypes()
    }
  }, [visible, sourceId])

  const handleOk = async () => {
    if (!targetId) {
      message.warning('请选择目标商品类型')
      return
    }

    const result = await migrate({ sourceId, targetId })
    if (result) {
      message.success(`迁移成功，共迁移 ${result.migratedCount} 个商品`)
      handleCancel()
      onSuccess?.()
    }
  }

  const handleCancel = () => {
    setVisible(false)
    setTargetId(null)
    setPreviewData(null)
  }

  // 过滤掉源商品类型
  const targetOptions = allProductTypes.filter(item => item.id !== sourceId)

  return (
    <Modal
      title="迁移商品类型"
      open={visible}
      onOk={handleOk}
      onCancel={handleCancel}
      confirmLoading={migrateLoading}
      okText="确认迁移"
      okButtonProps={{ danger: true }}
      width={500}
    >
      <Spin spinning={migratePreviewLoading}>
        <div className="space-y-4">
          {/* 源商品类型 */}
          <div>
            <div className="mb-1 text-gray-600">源商品类型</div>
            <div className="text-lg font-medium">{sourceName}</div>
          </div>

          {/* 目标商品类型选择 */}
          <div>
            <div className="mb-1 text-gray-600">目标商品类型</div>
            <Select
              className="w-full"
              placeholder="请选择目标商品类型"
              value={targetId}
              onChange={setTargetId}
              loading={getAllProductTypesLoading}
              showSearch
              filterOption={(input, option) =>
                String(option?.children || '')
                  .toLowerCase()
                  .includes(input.toLowerCase())
              }
            >
              {targetOptions.map(item => (
                <Select.Option
                  key={item.id}
                  value={item.id}
                >
                  {item.name}
                </Select.Option>
              ))}
            </Select>
          </div>

          {/* 迁移影响说明 */}
          {previewData && (
            <div>
              <div className="mb-2 text-gray-600">
                将迁移以下 {previewData.products.length} 个商品到目标类型，并删除当前类型：
              </div>
              {previewData.products.length > 0 ? (
                <List
                  size="small"
                  bordered
                  dataSource={previewData.products}
                  style={{ maxHeight: 200, overflow: 'auto' }}
                  renderItem={item => <List.Item>{item.name}</List.Item>}
                />
              ) : (
                <div className="text-gray-400">（无商品）</div>
              )}
            </div>
          )}
        </div>
      </Spin>
    </Modal>
  )
}

export default MigrateModal
