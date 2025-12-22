import { List, message, Modal, Select, Spin } from 'antd'
import dayjs from 'dayjs'
import type { ProductMigratePreviewResult } from 'fresh-shop-backend/types/dto'
import { useEffect, useState } from 'react'

import useProductStore from '@/stores/productStore'

interface MigrateModalProps {
  visible: boolean
  setVisible: (value: boolean) => void
  sourceId: string
  sourceName: string
  onSuccess?: () => void
}

/**
 * 商品迁移弹窗
 * 将源商品下的所有团购单迁移到目标商品，并删除源商品
 */
const MigrateModal = (props: MigrateModalProps) => {
  const { visible, setVisible, sourceId, sourceName, onSuccess } = props

  const [targetId, setTargetId] = useState<string | null>(null)
  const [previewData, setPreviewData] = useState<ProductMigratePreviewResult | null>(null)

  const allProductsList = useProductStore(state => state.allProductsList)
  const getAllProducts = useProductStore(state => state.getAllProducts)
  const getAllProductsListLoading = useProductStore(state => state.getAllProductsListLoading)
  const migratePreview = useProductStore(state => state.migratePreview)
  const migratePreviewLoading = useProductStore(state => state.migratePreviewLoading)
  const migrate = useProductStore(state => state.migrate)
  const migrateLoading = useProductStore(state => state.migrateLoading)

  // 加载预览数据和商品列表
  useEffect(() => {
    if (visible && sourceId) {
      migratePreview({ sourceId }).then(data => {
        setPreviewData(data)
      })
      getAllProducts()
    }
  }, [visible, sourceId])

  const handleOk = async () => {
    if (!targetId) {
      message.warning('请选择目标商品')
      return
    }

    const result = await migrate({ sourceId, targetId })
    if (result) {
      message.success(`迁移成功，共迁移 ${result.migratedCount} 个团购单`)
      handleCancel()
      onSuccess?.()
    }
  }

  const handleCancel = () => {
    setVisible(false)
    setTargetId(null)
    setPreviewData(null)
  }

  // 过滤掉源商品
  const targetOptions = allProductsList.filter(item => item.id !== sourceId)

  return (
    <Modal
      title="迁移商品"
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
          {/* 源商品 */}
          <div>
            <div className="mb-1 text-gray-600">源商品</div>
            <div className="text-lg font-medium">{sourceName}</div>
          </div>

          {/* 目标商品选择 */}
          <div>
            <div className="mb-1 text-gray-600">目标商品</div>
            <Select
              className="w-full"
              placeholder="请选择目标商品"
              value={targetId}
              onChange={setTargetId}
              loading={getAllProductsListLoading}
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
                将迁移以下 {previewData.groupBuys.length} 个团购单到目标商品，并删除当前商品：
              </div>
              {previewData.groupBuys.length > 0 ? (
                <List
                  size="small"
                  bordered
                  dataSource={previewData.groupBuys}
                  style={{ maxHeight: 200, overflow: 'auto' }}
                  renderItem={item => (
                    <List.Item>
                      <span>{item.name}</span>
                      <span className="ml-2 text-gray-400">
                        ({dayjs(item.groupBuyStartDate).format('YYYY-MM-DD')})
                      </span>
                    </List.Item>
                  )}
                />
              ) : (
                <div className="text-gray-400">（无团购单）</div>
              )}
            </div>
          )}
        </div>
      </Spin>
    </Modal>
  )
}

export default MigrateModal
