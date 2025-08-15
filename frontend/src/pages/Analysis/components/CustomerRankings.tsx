import { Button, Collapse, List } from 'antd'
import type {
  CustomerRankByAverageOrderAmountItem,
  CustomerRankByOrderCountItem,
  CustomerRankByTotalAmountItem
} from 'fresh-shop-backend/types/dto'
import { useMemo, useState } from 'react'

import ConsumptionDetailModal from '@/components/ConsumptionDetailModal'
import useAnalysisStore from '@/stores/analysisStore'
import useCustomerStore from '@/stores/customerStore'

/**
 * 客户排行组件
 */
export const CustomerRankings = () => {
  // 消费详情模态框状态
  const [consumptionDetailVisible, setConsumptionDetailVisible] = useState(false)

  // 从 Zustand store 中获取数据和加载状态
  const getCustomerRankLoading = useAnalysisStore(state => state.getCustomerRankLoading)
  const customerRank = useAnalysisStore(state => state.customerRank)

  // 消费详情相关状态和方法
  const getConsumptionDetail = useCustomerStore(state => state.getConsumptionDetail)
  const consumptionDetail = useCustomerStore(state => state.consumptionDetail)
  const consumptionDetailLoading = useCustomerStore(state => state.consumptionDetailLoading)
  const resetConsumptionDetail = useCustomerStore(state => state.resetConsumptionDetail)

  // 处理查看消费详情
  const handleConsumptionDetail = (customerId: string) => {
    getConsumptionDetail(customerId)
    setConsumptionDetailVisible(true)
  }

  // 关闭消费详情模态框
  const handleCloseConsumptionDetail = () => {
    setConsumptionDetailVisible(false)
    resetConsumptionDetail()
  }

  // 使用 useMemo 优化性能，只有当 customerRank 数据变化时才重新计算
  const {
    customerRankByOrderCount = [],
    customerRankByTotalAmount = [],
    customerRankByAverageOrderAmount = []
  } = useMemo(() => customerRank, [customerRank])

  // 定义 Collapse 的 items 配置
  const collapseItems = [
    {
      key: '1',
      label: '客户订单量排名',
      children: (
        <List
          loading={getCustomerRankLoading}
          dataSource={customerRankByOrderCount}
          renderItem={(item: CustomerRankByOrderCountItem, index) => (
            <List.Item>
              <List.Item.Meta
                title={
                  <div className="text-gray-800">
                    <div className="mb-1 font-bold">
                      {index + 1}. {item.name}
                    </div>
                  </div>
                }
                description={
                  <div className="flex items-center justify-between">
                    <div>
                      订单量: <span className="text-blue-500">{item.orderCount}</span>
                    </div>
                    <Button
                      size="small"
                      type="primary"
                      ghost
                      onClick={() => handleConsumptionDetail(item.id)}
                    >
                      查看消费详情
                    </Button>
                  </div>
                }
              />
            </List.Item>
          )}
        />
      )
    },
    {
      key: '2',
      label: '客户消费总额排名',
      children: (
        <List
          loading={getCustomerRankLoading}
          dataSource={customerRankByTotalAmount}
          renderItem={(item: CustomerRankByTotalAmountItem, index) => (
            <List.Item>
              <List.Item.Meta
                title={
                  <div className="text-gray-800">
                    <div className="mb-1 font-bold">
                      {index + 1}. {item.name}
                    </div>
                  </div>
                }
                description={
                  <div className="flex items-center justify-between">
                    <div>
                      消费总额:{' '}
                      <span className="text-blue-500">¥{item.totalAmount.toFixed(2)}</span>
                    </div>
                    <Button
                      size="small"
                      type="primary"
                      ghost
                      onClick={() => handleConsumptionDetail(item.id)}
                    >
                      查看消费详情
                    </Button>
                  </div>
                }
              />
            </List.Item>
          )}
        />
      )
    },
    {
      key: '3',
      label: '客户平均单价排名',
      children: (
        <List
          loading={getCustomerRankLoading}
          dataSource={customerRankByAverageOrderAmount}
          renderItem={(item: CustomerRankByAverageOrderAmountItem, index) => (
            <List.Item>
              <List.Item.Meta
                title={
                  <div className="text-gray-800">
                    <div className="mb-1 font-bold">
                      {index + 1}. {item.name}
                    </div>
                  </div>
                }
                description={
                  <div className="flex items-center justify-between">
                    <div>
                      平均单价:{' '}
                      <span className="text-blue-500">¥{item.averageOrderAmount.toFixed(2)}</span>
                    </div>
                    <Button
                      size="small"
                      type="primary"
                      ghost
                      onClick={() => handleConsumptionDetail(item.id)}
                    >
                      查看消费详情
                    </Button>
                  </div>
                }
              />
            </List.Item>
          )}
        />
      )
    }
  ]

  return (
    <>
      <Collapse
        items={collapseItems}
        defaultActiveKey={['1']}
      />

      {/* 消费详情模态框 */}
      <ConsumptionDetailModal
        visible={consumptionDetailVisible}
        onClose={handleCloseConsumptionDetail}
        consumptionDetail={consumptionDetail}
        loading={consumptionDetailLoading}
      />
    </>
  )
}
