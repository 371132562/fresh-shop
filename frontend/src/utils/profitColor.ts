/**
 * 利润和利润率颜色工具函数
 * 遵循国际通用颜色规则：正数绿色，负数红色
 */

/**
 * 获取利润值的颜色类名
 * @param value 利润值
 * @returns Tailwind CSS 颜色类名
 */
export const getProfitColor = (value: number): string => {
  if (value > 0) {
    return 'text-green-600'
  } else if (value < 0) {
    return 'text-red-600'
  }
  return 'text-gray-500'
}

/**
 * 获取利润率值的颜色类名
 * @param value 利润率值（百分比）
 * @returns Tailwind CSS 颜色类名
 */
export const getProfitMarginColor = (value: number): string => {
  if (value > 0) {
    return 'text-green-600'
  } else if (value < 0) {
    return 'text-red-600'
  }
  return 'text-gray-500'
}

/**
 * 获取利润背景颜色类名
 * @param value 利润值
 * @returns Tailwind CSS 背景颜色类名
 */
export const getProfitBgColor = (value: number): string => {
  if (value > 0) {
    return 'bg-green-100'
  } else if (value < 0) {
    return 'bg-red-100'
  }
  return 'bg-gray-100'
}

/**
 * 获取利润图标颜色类名
 * @param value 利润值
 * @returns Tailwind CSS 图标颜色类名
 */
export const getProfitIconColor = (value: number): string => {
  if (value > 0) {
    return 'text-green-600'
  } else if (value < 0) {
    return 'text-red-600'
  }
  return 'text-gray-500'
}

/**
 * 获取利润图标
 * @param value 利润值
 * @returns 对应的图标
 */
export const getProfitIcon = (value: number): string => {
  if (value > 0) {
    return '📈'
  } else if (value < 0) {
    return '📉'
  }
  return '➖'
}
