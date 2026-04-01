/**
 * 团购盈利展示相关的前端派生计算工具。
 * 这些计算只基于现有接口字段完成，不引入新的统计口径。
 */

/**
 * 退款压力偏高阈值。
 * 当退款金额占净销售额比例达到该值时，前端会给出“退款偏高”提示。
 */
export const HIGH_REFUND_PRESSURE_RATIO = 0.2

/**
 * 低利润率阈值（百分比）。
 * 用于矩阵筛选与轻量提示，避免不同页面各自写死不同数值。
 */
export const LOW_PROFIT_MARGIN_PERCENT = 10

/**
 * 单份毛利偏低阈值（元）。
 * 规格层用于区分“正常盈利”和“临界盈利”。
 */
export const LOW_UNIT_PROFIT_THRESHOLD = 1

/**
 * 规格毛利率偏低阈值（百分比）。
 * 与单份毛利阈值配合使用，避免只看金额或只看比例造成误判。
 */
export const LOW_UNIT_PROFIT_MARGIN_PERCENT = 10

/**
 * 计算单份毛利。
 */
export const calculateUnitProfit = (price: number, costPrice: number): number => price - costPrice

/**
 * 计算利润率（百分比）。
 * 当销售额为 0 时，统一按 0 处理，避免产生 Infinity / NaN。
 */
export const calculateProfitMarginPercent = (revenue: number, profit: number): number => {
  if (revenue <= 0) {
    return 0
  }

  return (profit / revenue) * 100
}

/**
 * 计算规格毛利率（百分比）。
 */
export const calculateUnitProfitMarginPercent = (price: number, costPrice: number): number => {
  if (price <= 0) {
    return 0
  }

  return ((price - costPrice) / price) * 100
}

export type UnitPricingStatus = 'loss' | 'low' | 'healthy'

/**
 * 规格定价提示状态。
 * 先识别“售价低于成本”的明确风险；其余情况再使用“单份毛利 + 毛利率”双条件联合判断。
 */
export const getUnitPricingStatus = (
  price: number,
  costPrice: number
): {
  status: UnitPricingStatus
  label: string
  color: 'red' | 'orange' | 'green'
} => {
  const unitProfit = calculateUnitProfit(price, costPrice)
  const unitProfitMargin = calculateUnitProfitMarginPercent(price, costPrice)

  if (price < costPrice) {
    return {
      status: 'loss',
      label: '售价低于成本',
      color: 'red'
    }
  }

  if (
    unitProfit <= LOW_UNIT_PROFIT_THRESHOLD &&
    unitProfitMargin <= LOW_UNIT_PROFIT_MARGIN_PERCENT
  ) {
    return {
      status: 'low',
      label: '毛利偏低',
      color: 'orange'
    }
  }

  return {
    status: 'healthy',
    label: '定价健康',
    color: 'green'
  }
}

/**
 * 判断是否存在退款。
 */
export const hasRefundPressure = (totalRefundAmount: number): boolean => totalRefundAmount > 0

/**
 * 判断退款压力是否偏高。
 * 当前以“退款金额 / 净销售额”作为前端轻量提示依据；当净销售额为 0 且有退款时，也视为高压力。
 */
export const isHighRefundPressure = (totalRefundAmount: number, totalRevenue: number): boolean => {
  if (totalRefundAmount <= 0) {
    return false
  }

  if (totalRevenue <= 0) {
    return true
  }

  return totalRefundAmount / totalRevenue >= HIGH_REFUND_PRESSURE_RATIO
}
