// 基于axios封装的请求模块
import axios from 'axios'

// 创建axios实例
const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL, // API基础URL（从环境变量获取）
  timeout: 10000 // 请求超时时间（毫秒）
})

// 请求拦截器
http.interceptors.request.use(
  config => {
    // 添加token到请求头
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  error => {
    // 处理请求错误
    return Promise.reject(error)
  }
)

// 响应拦截器
http.interceptors.response.use(
  response => {
    // 处理响应数据
    const { status, data } = response
    // 如果响应码不是200，视为错误
    if (status !== 200) {
      // 此处可添加不同错误码的处理逻辑
      return Promise.reject(new Error(data || 'Error'))
    } else {
      return data
    }
  },
  error => {
    // 处理响应错误
    return Promise.reject(error)
  }
)

export default http
