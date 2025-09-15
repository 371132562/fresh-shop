import 'dayjs/locale/zh-cn'

import dayjs from 'dayjs'

// 统一 dayjs 出口与常用工具方法
// - 统一设置/扩展都应集中在此文件
// - 页面与组件仅从 '@/utils/day' 导入

export const formatDate = (date: Date | string | number) => {
  // 统一日期格式：YYYY-MM-DD
  return dayjs(date).format('YYYY-MM-DD')
}

// 全局设定中文本地化
dayjs.locale('zh-cn')

export default dayjs
