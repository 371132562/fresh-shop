import {
  CaretDownOutlined,
  CaretRightOutlined,
  DownOutlined,
  InfoCircleOutlined,
  ShoppingCartOutlined,
  UpOutlined
} from '@ant-design/icons'
import { Button, Card, Tag, Tooltip } from 'antd'
import type { CustomerConsumptionDetailDto } from 'fresh-shop-backend/types/dto'
import React, { useMemo, useState } from 'react'

import dayjs from '@/utils/day'

type ProductItem = CustomerConsumptionDetailDto['productConsumptionRanks'][0]
type GroupBuyItem = ProductItem['groupBuys'][0]

type ProductConsumptionRanksProps = {
  ranks: CustomerConsumptionDetailDto['productConsumptionRanks']
  type: 'customer' | 'address'
}

const ProductConsumptionRanks: React.FC<ProductConsumptionRanksProps> = ({ ranks, type }) => {
  const [expandedProducts, setExpandedProducts] = useState<Set<string>>(new Set())

  const hasAnyGroupBuy = useMemo(
    () => ranks.some(p => p.groupBuys && p.groupBuys.length > 0),
    [ranks]
  )

  const formatAmount = (amount: number) => `¥${(amount || 0).toFixed(2)}`

  const toggleProductExpand = (productId: string) => {
    const next = new Set(expandedProducts)
    if (next.has(productId)) next.delete(productId)
    else next.add(productId)
    setExpandedProducts(next)
  }

  const allExpanded = useMemo(
    () =>
      ranks.every(
        p => !p.groupBuys || p.groupBuys.length === 0 || expandedProducts.has(p.productId)
      ),
    [ranks, expandedProducts]
  )

  const handleToggleAll = () => {
    if (!hasAnyGroupBuy) return
    if (allExpanded) {
      setExpandedProducts(new Set())
    } else {
      const allIds = new Set(
        ranks.filter(p => p.groupBuys && p.groupBuys.length > 0).map(p => p.productId)
      )
      setExpandedProducts(allIds)
    }
  }

  return (
    <Card
      title={
        <div className="flex h-12 items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingCartOutlined className="text-blue-500" />
            <span className="text-lg font-medium">商品消费排行</span>
          </div>
          {ranks.length > 0 && (
            <Button
              type="primary"
              ghost
              size="middle"
              icon={allExpanded ? <UpOutlined /> : <DownOutlined />}
              onClick={handleToggleAll}
              className="text-blue-500 hover:text-blue-600"
            >
              {allExpanded ? '全部收起' : '全部展开'}
            </Button>
          )}
        </div>
      }
      size="small"
      className="overflow-hidden"
      styles={{ header: { background: '#f0f5ff' } }}
    >
      <div className="space-y-3">
        {ranks.map((product: ProductItem, index: number) => {
          const totalGroupBuys = product.groupBuys?.length || 0
          const totalGroupBuyAmount =
            product.groupBuys?.reduce(
              (sum: number, gb: GroupBuyItem) => sum + (gb.totalAmount || 0),
              0
            ) || 0
          const totalGroupBuyRefund =
            product.groupBuys?.reduce(
              (sum: number, gb: GroupBuyItem) => sum + (gb.totalRefundAmount || 0),
              0
            ) || 0

          const latestGroupBuyDate = product.groupBuys?.reduce(
            (latest: Date | null, gb: GroupBuyItem) => {
              const gbDate = new Date(gb.latestGroupBuyStartDate)
              return !latest || gbDate > latest ? gbDate : latest
            },
            null as Date | null
          )

          const isLatestConsumption = product.isLatestConsumption

          return (
            <div
              key={product.productId}
              className="group"
            >
              <div
                className={`relative overflow-hidden rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-all duration-300 hover:border-blue-300 hover:shadow-lg ${
                  totalGroupBuys > 0 ? 'cursor-pointer' : ''
                } ${expandedProducts.has(product.productId) ? 'border-blue-400 shadow-md' : ''}`}
                onClick={() => {
                  if (totalGroupBuys > 0) toggleProductExpand(product.productId)
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-12 w-12 items-center justify-center rounded-full text-sm font-bold shadow-lg transition-all duration-200 ${
                          index === 0
                            ? 'bg-gradient-to-br from-yellow-400 to-orange-500 text-orange-800 ring-2 ring-yellow-200'
                            : index === 1
                              ? 'bg-gradient-to-br from-gray-300 to-gray-500 text-gray-800 ring-2 ring-gray-200'
                              : index === 2
                                ? 'bg-gradient-to-br from-amber-400 to-yellow-600 text-amber-800 ring-2 ring-amber-200'
                                : 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white ring-2 ring-blue-200'
                        }`}
                      >
                        {index < 3 ? (
                          <span className="text-xl">
                            {index === 0 ? '👑' : index === 1 ? '🥈' : '🥉'}
                          </span>
                        ) : (
                          <span className="text-sm font-bold">{index + 1}</span>
                        )}
                      </div>

                      <div className="flex w-6 items-center justify-center">
                        {totalGroupBuys > 0 && (
                          <div className="text-gray-400 transition-all duration-300 group-hover:text-blue-500">
                            {expandedProducts.has(product.productId) ? (
                              <CaretDownOutlined className="text-lg" />
                            ) : (
                              <CaretRightOutlined className="text-lg" />
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <div className="text-lg font-semibold text-gray-800">
                          {product.productName}
                        </div>
                        {isLatestConsumption && type === 'customer' && (
                          <Tag
                            color="red"
                            className="text-xs"
                          >
                            最新购买
                          </Tag>
                        )}
                      </div>
                      <div className="mt-1 flex items-center gap-4 text-sm text-gray-500">
                        <span>购买 {product.count} 次</span>
                        {latestGroupBuyDate && (
                          <span>最后购买: {dayjs(latestGroupBuyDate).format('YYYY-MM-DD')}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-2xl font-bold text-cyan-600">
                      {formatAmount(totalGroupBuyAmount)}
                    </div>
                    <div className="flex items-center justify-end gap-1 text-sm text-gray-500">
                      <span>总消费</span>
                      {totalGroupBuyRefund > 0 && (
                        <Tooltip title="已扣除退款金额">
                          <InfoCircleOutlined className="text-orange-500" />
                        </Tooltip>
                      )}
                    </div>
                    {totalGroupBuyRefund > 0 && (
                      <div className="text-xs text-orange-600">
                        退款: {formatAmount(totalGroupBuyRefund)}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {product.groupBuys &&
                product.groupBuys.length > 0 &&
                expandedProducts.has(product.productId) && (
                  <div className="ml-6 mt-3 space-y-2">
                    <div className="border-l-2 border-blue-200 pl-4">
                      {product.groupBuys.map((groupBuy: GroupBuyItem, gbIndex: number) => {
                        const isRefundedOrder =
                          (groupBuy.count || 0) === 0 && (groupBuy.totalRefundAmount || 0) > 0
                        return (
                          <div
                            key={`${product.productId}-${gbIndex}`}
                            className={`mb-2 rounded-lg p-3 shadow-sm transition-all hover:shadow-md ${
                              isRefundedOrder
                                ? 'border border-red-200 bg-gradient-to-r from-red-50 to-orange-50'
                                : 'bg-gradient-to-r from-blue-50 to-indigo-50'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <div className="text-base font-semibold text-gray-800">
                                    {groupBuy.groupBuyName}
                                  </div>
                                  <div
                                    className={`rounded-full px-2 py-1 text-xs ${
                                      isRefundedOrder
                                        ? 'bg-red-100 text-red-600'
                                        : 'bg-blue-100 text-blue-600'
                                    }`}
                                  >
                                    {groupBuy.unitName}
                                  </div>
                                  {isRefundedOrder && (
                                    <div className="rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-600">
                                      已退款
                                    </div>
                                  )}
                                </div>
                                <div className="mt-1 text-sm text-gray-500">
                                  发起时间:{' '}
                                  {dayjs(groupBuy.latestGroupBuyStartDate).format('YYYY-MM-DD')}
                                </div>
                              </div>
                              <div className="flex items-center gap-6">
                                {isRefundedOrder ? (
                                  <div className="text-center">
                                    <div className="text-lg font-bold text-red-600">
                                      {formatAmount(groupBuy.totalRefundAmount || 0)}
                                    </div>
                                    <div className="text-xs text-gray-500">退款金额</div>
                                  </div>
                                ) : (
                                  <>
                                    <div className="text-center">
                                      <div className="text-lg font-bold text-blue-600">
                                        {groupBuy.count}
                                      </div>
                                      <div className="text-xs text-gray-500">购买次数</div>
                                    </div>
                                    <div className="text-right">
                                      <div className="text-xl font-bold text-cyan-600">
                                        {formatAmount(groupBuy.totalAmount || 0)}
                                      </div>
                                      <div className="flex items-center justify-end gap-1 text-xs text-gray-500">
                                        <span>小计</span>
                                        {(groupBuy.totalRefundAmount || 0) > 0 && (
                                          <Tooltip title="已扣除退款金额">
                                            <InfoCircleOutlined className="text-orange-500" />
                                          </Tooltip>
                                        )}
                                      </div>
                                      {(groupBuy.totalRefundAmount || 0) > 0 && (
                                        <div className="text-xs text-orange-600">
                                          退款: {formatAmount(groupBuy.totalRefundAmount || 0)}
                                        </div>
                                      )}
                                    </div>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
            </div>
          )
        })}
      </div>
    </Card>
  )
}

export default ProductConsumptionRanks
