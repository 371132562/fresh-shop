import { Button, Collapse, List, Modal, Table, Tag } from 'antd'
import type {
  MergedGroupBuyRankByOrderCountItem,
  MergedGroupBuyRankByTotalProfitItem,
  MergedGroupBuyRankByTotalSalesItem
} from 'fresh-shop-backend/types/dto'
import { useMemo, useState } from 'react'

import ConsumptionDetailModal from '@/components/ConsumptionDetailModal'
import useAnalysisStore from '@/stores/analysisStore'
import useCustomerStore from '@/stores/customerStore'

type MergedGroupBuyRankingsProps = {
  startDate: Date
  endDate: Date
}

export const MergedGroupBuyRankings = ({ startDate, endDate }: MergedGroupBuyRankingsProps) => {
  const [customerRankVisible, setCustomerRankVisible] = useState(false)
  const [selectedGroupBuyName, setSelectedGroupBuyName] = useState<string>('')
  const [consumptionDetailVisible, setConsumptionDetailVisible] = useState(false)

  const getMergedGroupBuyRankLoading = useAnalysisStore(state => state.getMergedGroupBuyRankLoading)
  const mergedGroupBuyRank = useAnalysisStore(state => state.mergedGroupBuyRank)
  const getMergedGroupBuyCustomerRank = useAnalysisStore(
    state => state.getMergedGroupBuyCustomerRank
  )
  const mergedGroupBuyCustomerRank = useAnalysisStore(state => state.mergedGroupBuyCustomerRank)
  const getMergedGroupBuyCustomerRankLoading = useAnalysisStore(
    state => state.getMergedGroupBuyCustomerRankLoading
  )
  const resetMergedGroupBuyCustomerRank = useAnalysisStore(
    state => state.resetMergedGroupBuyCustomerRank
  )

  // 消费详情相关状态和方法
  const getConsumptionDetail = useCustomerStore(state => state.getConsumptionDetail)
  const consumptionDetail = useCustomerStore(state => state.consumptionDetail)
  const consumptionDetailLoading = useCustomerStore(state => state.consumptionDetailLoading)
  const resetConsumptionDetail = useCustomerStore(state => state.resetConsumptionDetail)

  const {
    mergedGroupBuyRankByOrderCount = [],
    mergedGroupBuyRankByTotalSales = [],
    mergedGroupBuyRankByTotalProfit = []
  } = useMemo(() => mergedGroupBuyRank, [mergedGroupBuyRank])

  // 处理查看客户排行
  const handleViewCustomerRank = (groupBuyName: string) => {
    setSelectedGroupBuyName(groupBuyName)
    getMergedGroupBuyCustomerRank({
      groupBuyName,
      startDate,
      endDate
    })
    setCustomerRankVisible(true)
  }

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

  // 定义Collapse的items配置
  const collapseItems = [
    {
      key: '1',
      label: '团购单（合并）订单量排名',
      children: (
        <List
          loading={getMergedGroupBuyRankLoading}
          dataSource={mergedGroupBuyRankByOrderCount}
          renderItem={(item: MergedGroupBuyRankByOrderCountItem, index) => (
            <List.Item>
              <List.Item.Meta
                title={
                  <div className="text-gray-800">
                    <div className="mb-1 font-bold">
                      {index + 1}.{item.name}
                    </div>
                  </div>
                }
                description={
                  <div className="flex items-start justify-between">
                    <div>
                      订单量: <span className="text-blue-500">{item.orderCount}</span>
                    </div>
                    <Button
                      type="primary"
                      ghost
                      onClick={() => handleViewCustomerRank(item.name)}
                    >
                      查看客户排行
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
      label: '团购单（合并）销售额排名',
      children: (
        <List
          loading={getMergedGroupBuyRankLoading}
          dataSource={mergedGroupBuyRankByTotalSales}
          renderItem={(item: MergedGroupBuyRankByTotalSalesItem, index) => (
            <List.Item>
              <List.Item.Meta
                title={
                  <div className="text-gray-800">
                    <div className="mb-1 font-bold">
                      {index + 1}.{item.name}
                    </div>
                  </div>
                }
                description={
                  <div>
                    销售额: <span className="text-blue-500">¥{item.totalSales.toFixed(2)}</span>
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
      label: '团购单（合并）利润排名',
      children: (
        <List
          loading={getMergedGroupBuyRankLoading}
          dataSource={mergedGroupBuyRankByTotalProfit}
          renderItem={(item: MergedGroupBuyRankByTotalProfitItem, index) => (
            <List.Item>
              <List.Item.Meta
                title={
                  <div className="text-gray-800">
                    <div className="mb-1 font-bold">
                      {index + 1}.{item.name}
                    </div>
                  </div>
                }
                description={
                  <div>
                    利润: <span className="text-blue-500">¥{item.totalProfit.toFixed(2)}</span>
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
      <div className="mb-4 text-center text-sm text-gray-500">此处统计为合并同名团购单的数据。</div>
      <Collapse
        items={collapseItems}
        defaultActiveKey={['1']}
      />

      {/* 客户排行模态框 */}
      <Modal
        title={`${selectedGroupBuyName} - 客户订单排行（从高到低）`}
        open={customerRankVisible}
        onCancel={() => {
          setCustomerRankVisible(false)
          resetMergedGroupBuyCustomerRank()
        }}
        width={600}
        footer={null}
        style={{ top: 20 }}
      >
        {getMergedGroupBuyCustomerRankLoading ? (
          <div className="flex h-60 items-center justify-center">
            <div className="text-lg">加载中...</div>
          </div>
        ) : mergedGroupBuyCustomerRank ? (
          <div className="!space-y-4">
            <Table
              dataSource={mergedGroupBuyCustomerRank.customerRank}
              pagination={false}
              size="middle"
              className="bg-white"
              rowKey="customerId"
            >
              <Table.Column
                title="客户名称"
                dataIndex="customerName"
                key="customerName"
              />
              <Table.Column
                title="订单次数"
                dataIndex="orderCount"
                key="orderCount"
                render={count => <Tag color="blue">{count} 次</Tag>}
              />
              <Table.Column
                title="操作"
                key="action"
                render={(_, record: any) => (
                  <Button
                    size="small"
                    type="primary"
                    ghost
                    onClick={() => handleConsumptionDetail(record.customerId)}
                  >
                    查看消费详情
                  </Button>
                )}
              />
            </Table>
          </div>
        ) : (
          <div className="flex h-60 items-center justify-center">
            <div className="text-lg text-gray-500">暂无客户订单数据</div>
          </div>
        )}
      </Modal>

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
