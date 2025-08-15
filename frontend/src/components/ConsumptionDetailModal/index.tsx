import { Descriptions, Modal, Table, Tag } from 'antd'

import type { CustomerConsumptionDetailDto } from '../../../../backend/types/dto'

/**
 * 消费详情模态框组件的属性类型
 */
type ConsumptionDetailModalProps = {
  /** 模态框是否可见 */
  visible: boolean
  /** 关闭模态框的回调函数 */
  onClose: () => void
  /** 消费详情数据 */
  consumptionDetail: CustomerConsumptionDetailDto | null
  /** 是否正在加载数据 */
  loading: boolean
  /** 模态框标题，默认为"消费详情" */
  title?: string
  /** 模态框宽度，默认为800 */
  width?: number
}

/**
 * 消费详情模态框组件
 * 用于展示客户的消费详情信息，包括基础信息、购买商品排行和参与团购排行
 */
export const ConsumptionDetailModal = ({
  visible,
  onClose,
  consumptionDetail,
  loading,
  title = '消费详情',
  width = 800
}: ConsumptionDetailModalProps) => {
  return (
    <Modal
      title={title}
      open={visible}
      onCancel={onClose}
      width={width}
      footer={null}
      style={{ top: 20 }}
    >
      {loading ? (
        <div className="flex h-60 items-center justify-center">
          <div className="text-lg">加载中...</div>
        </div>
      ) : consumptionDetail ? (
        <div className="!space-y-4">
          {/* 基础信息区域 */}
          <Descriptions
            title="基础信息"
            bordered
            column={1}
            className="bg-white"
          >
            <Descriptions.Item label="客户名称">
              <span className="text-primary font-medium">{consumptionDetail.customerName}</span>
            </Descriptions.Item>
            <Descriptions.Item label="订单数量">
              <span className="text-blue-500">{consumptionDetail.orderCount}</span>
            </Descriptions.Item>
            <Descriptions.Item label="订单总额">
              <span className="text-green-500">¥{consumptionDetail.totalAmount.toFixed(2)}</span>
            </Descriptions.Item>
            <Descriptions.Item label="每单平均价格">
              <span className="text-orange-500">
                ¥{consumptionDetail.averagePricePerOrder.toFixed(2)}
              </span>
            </Descriptions.Item>
          </Descriptions>

          {/* 购买商品排行区域 */}
          <div>
            <div className="mb-4 text-lg font-medium">购买的商品（从高到低）</div>
            <Table
              dataSource={consumptionDetail.topProducts}
              pagination={false}
              size="middle"
              className="bg-white"
              rowKey={record => record.productId}
            >
              <Table.Column
                title="商品名称"
                dataIndex="productName"
                key="productName"
              />
              <Table.Column
                title="购买次数"
                dataIndex="count"
                key="count"
                render={count => <Tag color="blue">{count} 次</Tag>}
              />
            </Table>
          </div>

          {/* 参与团购排行区域 */}
          <div>
            <div className="mb-4 text-lg font-medium">参与的团购（从高到低）</div>
            <Table
              dataSource={consumptionDetail.topGroupBuys}
              pagination={false}
              size="middle"
              className="bg-white"
              rowKey={(record, index) => `${record.groupBuyName}-${record.unitName}-${index}`}
            >
              <Table.Column
                title="团购名称"
                dataIndex="groupBuyName"
                key="groupBuyName"
                render={(_, record: any) => `${record.groupBuyName}（${record.unitName}）`}
              />
              <Table.Column
                title="参与次数"
                dataIndex="count"
                key="count"
                render={count => <Tag color="green">{count} 次</Tag>}
              />
            </Table>
          </div>
        </div>
      ) : (
        <div className="flex h-60 items-center justify-center">
          <div className="text-lg text-gray-500">暂无消费数据</div>
        </div>
      )}
    </Modal>
  )
}

export default ConsumptionDetailModal
