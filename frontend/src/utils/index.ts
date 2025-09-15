// dayjs 相关逻辑已迁移至 '@/utils/day'

// 自定义手机号校验规则
export const validatePhoneNumber = (_: any, value: string) => {
  // 如果没有输入，则不进行校验，这里你可以根据需求调整是否允许为空
  if (!value) {
    return Promise.resolve() // 允许为空
  }

  // 中国大陆手机号的正则表达式：以1开头，第二位是3-9，后面是9位数字
  const reg = /^1[3-9]\d{9}$/
  if (reg.test(value)) {
    return Promise.resolve()
  }
  return Promise.reject(new Error('请输入有效的手机号！'))
}

// 格式化显示 年-月-日 级别的日期
export { formatDate } from './day'

// 构建图片完整预览地址（统一逻辑）
// 例：//{host}{VITE_IMAGES_PORT}{VITE_IMAGES_BASE_URL}{filename}
export const buildImageUrl = (filename: string): string => {
  if (!filename) return ''
  const host = location.hostname
  const port = location.port ? (import.meta.env.VITE_IMAGES_PORT as string) : ''
  const base = import.meta.env.VITE_IMAGES_BASE_URL as string
  return `//${host}${port}${base}${filename}`
}
