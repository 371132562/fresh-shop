import { InfoCircleOutlined } from '@ant-design/icons'
import { Card, Modal, Tag } from 'antd'
import React from 'react'

type StatisticsGuideModalProps = {
  visible: boolean
  onClose: () => void
}

/**
 * 统计字段说明组件
 * 为平台客户提供详细的统计字段说明和计算逻辑
 */
const StatisticsGuideModal: React.FC<StatisticsGuideModalProps> = ({ visible, onClose }) => {
  return (
    <Modal
      title={
        <div className="flex items-center gap-2">
          <InfoCircleOutlined className="text-blue-500" />
          <span className="text-lg font-medium">统计指标说明</span>
        </div>
      }
      open={visible}
      onCancel={onClose}
      footer={null}
      width={1200}
      style={{ top: 20 }}
      destroyOnHidden
    >
      <div className="!space-y-6">
        {/* 核心业务指标 */}
        <Card
          title={
            <div className="flex items-center gap-2">
              <span className="text-base font-medium">核心业务指标</span>
            </div>
          }
          size="small"
          styles={{ header: { background: '#f0f5ff' } }}
        >
          <div className="grid grid-cols-2 gap-4">
            <div className="flex h-full flex-col rounded-lg bg-blue-50 p-4">
              <div className="mb-2 flex items-center gap-2">
                <Tag
                  variant="solid"
                  color="blue"
                  className="!text-base font-medium"
                >
                  团购单量
                </Tag>
              </div>
              <p className="mb-2 text-base text-gray-600">统计期间内发起的团购活动总数</p>
              <p className="flex-1 text-sm text-gray-500">包含所有状态的团购单，按发起时间统计。</p>
            </div>
            <div className="flex h-full flex-col rounded-lg bg-blue-50 p-4">
              <div className="mb-2 flex items-center gap-2">
                <Tag
                  variant="solid"
                  color="blue"
                  className="!text-base font-medium"
                >
                  订单量
                </Tag>
              </div>
              <p className="mb-2 text-base text-gray-600">统计期间内的有效订单总数</p>
              <p className="flex-1 text-sm text-gray-500">
                只统计已支付和已完成的订单，未支付订单不计入。已退款的订单不计入订单量，但会影响利润计算
              </p>
            </div>
            <div className="flex h-full flex-col rounded-lg bg-green-50 p-4">
              <div className="mb-2 flex items-center gap-2">
                <Tag
                  variant="solid"
                  color="green"
                  className="!text-base font-medium"
                >
                  销售额
                </Tag>
              </div>
              <p className="mb-2 text-base text-gray-600">统计期间内的总销售收入</p>
              <p className="flex-1 text-sm text-gray-500">
                已支付和已完成订单的销售金额，自动扣除部分退款。全额退款的订单不计入销售额，按团购发起时间进行统计
              </p>
            </div>
            <div className="flex h-full flex-col rounded-lg bg-red-50 p-4">
              <div className="mb-2 flex items-center gap-2">
                <Tag
                  variant="solid"
                  color="red"
                  className="!text-base font-medium"
                >
                  利润
                </Tag>
              </div>
              <p className="mb-2 text-base text-gray-600">统计期间内的总利润</p>
              <p className="flex-1 text-sm text-gray-500">
                销售额减去成本，退款订单会减少利润。正常订单：利润=(单价-成本价)×数量-部分退款金额；全额退款订单利润为负成本
              </p>
            </div>
            <div className="flex h-full flex-col rounded-lg bg-orange-50 p-4">
              <div className="mb-2 flex items-center gap-2">
                <Tag
                  variant="solid"
                  color="orange"
                  className="!text-base font-medium"
                >
                  退款金额
                </Tag>
              </div>
              <p className="mb-2 text-base text-gray-600">统计期间内的总退款金额</p>
              <p className="flex-1 text-sm text-gray-500">
                包含部分退款和全额退款的金额总和，反映客户退款情况和业务风险
              </p>
            </div>
            <div className="flex h-full flex-col rounded-lg bg-purple-50 p-4">
              <div className="mb-2 flex items-center gap-2">
                <Tag
                  variant="solid"
                  color="purple"
                  className="!text-base font-medium"
                >
                  参与客户数
                </Tag>
              </div>
              <p className="mb-2 text-base text-gray-600">统计期间内参与购买的唯一客户数量</p>
              <p className="flex-1 text-sm text-gray-500">
                同一客户多次购买只计算一次，按客户去重统计。只有包含有效订单的客户才计入参与客户数
              </p>
            </div>
          </div>
        </Card>

        {/* 平均值指标 */}
        <Card
          title={
            <div className="flex items-center gap-2">
              <span className="text-base font-medium">平均值指标</span>
            </div>
          }
          size="small"
          styles={{ header: { background: '#f6ffed' } }}
        >
          <div className="grid grid-cols-2 gap-4">
            <div className="flex h-full flex-col rounded-lg bg-blue-50 p-4">
              <div className="mb-2 flex items-center gap-2">
                <Tag
                  variant="solid"
                  color="blue"
                  className="!text-base font-medium"
                >
                  平均客单价
                </Tag>
              </div>
              <p className="mb-2 text-base text-gray-600">每个客户的平均消费金额</p>
              <p className="flex-1 text-sm text-gray-500">
                总销售额 ÷ 参与客户数，反映客户消费水平和购买力
              </p>
            </div>
            <div className="flex h-full flex-col rounded-lg bg-green-50 p-4">
              <div className="mb-2 flex items-center gap-2">
                <Tag
                  variant="solid"
                  color="green"
                  className="!text-base font-medium"
                >
                  平均团购销售额
                </Tag>
              </div>
              <p className="mb-2 text-base text-gray-600">每个团购活动的平均销售额</p>
              <p className="flex-1 text-sm text-gray-500">
                总销售额 ÷ 团购单量，反映团购活动的平均表现
              </p>
            </div>
            <div className="flex h-full flex-col rounded-lg bg-yellow-50 p-4">
              <div className="mb-2 flex items-center gap-2">
                <Tag
                  variant="solid"
                  color="gold"
                  className="!text-base font-medium"
                >
                  平均团购利润
                </Tag>
              </div>
              <p className="mb-2 text-base text-gray-600">每个团购活动的平均利润</p>
              <p className="flex-1 text-sm text-gray-500">
                总利润 ÷ 团购单量，反映团购活动的平均盈利能力
              </p>
            </div>
            <div className="flex h-full flex-col rounded-lg bg-indigo-50 p-4">
              <div className="mb-2 flex items-center gap-2">
                <Tag
                  variant="solid"
                  color="geekblue"
                  className="!text-base font-medium"
                >
                  平均团购订单量
                </Tag>
              </div>
              <p className="mb-2 text-base text-gray-600">每个团购活动的平均订单数量</p>
              <p className="flex-1 text-sm text-gray-500">
                总订单量 ÷ 团购单量，反映团购活动的平均参与度
              </p>
            </div>
          </div>
        </Card>

        {/* 比率指标 */}
        <Card
          title={
            <div className="flex items-center gap-2">
              <span className="text-base font-medium">比率指标</span>
            </div>
          }
          size="small"
          styles={{ header: { background: '#fff2e8' } }}
        >
          <div className="grid grid-cols-2 gap-4">
            <div className="flex h-full flex-col rounded-lg bg-red-50 p-4">
              <div className="mb-2 flex items-center gap-2">
                <Tag
                  variant="solid"
                  color="red"
                  className="!text-base font-medium"
                >
                  利润率
                </Tag>
              </div>
              <p className="mb-2 text-base text-gray-600">利润占销售额的百分比</p>
              <p className="flex-1 text-sm text-gray-500">
                (利润 ÷ 销售额) × 100%，反映业务盈利能力
              </p>
            </div>
            <div className="flex h-full flex-col rounded-lg bg-cyan-50 p-4">
              <div className="mb-2 flex items-center gap-2">
                <Tag
                  variant="solid"
                  color="cyan"
                  className="!text-base font-medium"
                >
                  多次购买客户占比
                </Tag>
              </div>
              <p className="mb-2 text-base text-gray-600">多次购买客户占总客户的比例</p>
              <p className="flex-1 text-sm text-gray-500">
                反映客户粘性和业务健康度，占比越高说明客户忠诚度越好
              </p>
            </div>
          </div>
        </Card>

        {/* 复合显示指标 */}
        <Card
          title={
            <div className="flex items-center gap-2">
              <span className="text-base font-medium">复合显示指标</span>
            </div>
          }
          size="small"
          styles={{ header: { background: '#f0f5ff' } }}
        >
          <div className="grid grid-cols-2 gap-4">
            <div className="flex h-full flex-col rounded-lg bg-teal-50 p-4">
              <div className="mb-2 flex items-center gap-2">
                <Tag
                  variant="solid"
                  color="cyan"
                  className="!text-base font-medium"
                >
                  部分退款/退款订单量
                </Tag>
              </div>
              <p className="mb-2 text-base text-gray-600">部分退款订单数/全额退款订单数</p>
              <p className="flex-1 text-sm text-gray-500">
                格式为"部分退款订单数/全额退款订单数"，反映商品质量和服务问题。部分退款订单正常计入订单量，全额退款订单不计入订单量
              </p>
            </div>
          </div>
        </Card>

        {/* 分布分析指标 */}
        <Card
          title={
            <div className="flex items-center gap-2">
              <span className="text-base font-medium">分布分析指标</span>
            </div>
          }
          size="small"
          styles={{ header: { background: '#fff7e6' } }}
        >
          <div className="grid grid-cols-2 gap-4">
            <div className="flex h-full flex-col rounded-lg bg-orange-50 p-4">
              <div className="mb-2 flex items-center gap-2">
                <Tag
                  variant="solid"
                  color="orange"
                  className="!text-base font-medium"
                >
                  热销商品排行
                </Tag>
              </div>
              <p className="mb-2 text-base text-gray-600">按销售额或利润排序的商品排行榜</p>
              <p className="flex-1 text-sm text-gray-500">
                展示最受欢迎的商品，支持销售额占比和利润占比两种排序方式
              </p>
            </div>
            <div className="flex h-full flex-col rounded-lg bg-green-50 p-4">
              <div className="mb-2 flex items-center gap-2">
                <Tag
                  variant="solid"
                  color="green"
                  className="!text-base font-medium"
                >
                  商品分类统计
                </Tag>
              </div>
              <p className="mb-2 text-base text-gray-600">按商品分类维度的销售统计</p>
              <p className="flex-1 text-sm text-gray-500">
                分析不同商品分类的表现，包含销售额、利润、商品数量等指标
              </p>
            </div>
            <div className="flex h-full flex-col rounded-lg bg-purple-50 p-4">
              <div className="mb-2 flex items-center gap-2">
                <Tag
                  variant="solid"
                  color="purple"
                  className="!text-base font-medium"
                >
                  客户购买次数分布
                </Tag>
              </div>
              <p className="mb-2 text-base text-gray-600">按购买次数分组的客户数量统计</p>
              <p className="flex-1 text-sm text-gray-500">
                展示不同购买频次的客户分布，如1次、2-3次、4-5次等，反映客户忠诚度分布
              </p>
            </div>
          </div>
        </Card>
      </div>
    </Modal>
  )
}

export default StatisticsGuideModal
