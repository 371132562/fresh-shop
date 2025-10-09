// 基于fetch封装的请求模块
import { notification } from 'antd' // 导入 Ant Design 的 notification 组件
import { ErrorCode, ResponseBody } from 'fresh-shop-backend/types/response.ts'

// 请求配置类型
type RequestConfig = {
  baseURL?: string
  timeout?: number
  headers?: Record<string, string>
}

// 请求拦截器类型
type RequestInterceptor = (config: RequestConfig) => RequestConfig | Promise<RequestConfig>

// 响应拦截器类型
type ResponseInterceptor = (response: Response) => unknown | Promise<unknown>

// 错误拦截器类型
type ErrorInterceptor = (error: unknown) => unknown | Promise<unknown>

// HTTP 客户端类
class HttpClient {
  private baseURL: string
  private timeout: number
  private requestInterceptors: RequestInterceptor[] = []
  private responseInterceptors: ResponseInterceptor[] = []
  private errorInterceptors: ErrorInterceptor[] = []

  constructor(config: RequestConfig = {}) {
    this.baseURL = config.baseURL || import.meta.env.VITE_API_BASE_URL || ''
    this.timeout = config.timeout || 10000
  }

  // 添加请求拦截器
  addRequestInterceptor(interceptor: RequestInterceptor) {
    this.requestInterceptors.push(interceptor)
  }

  // 添加响应拦截器
  addResponseInterceptor(interceptor: ResponseInterceptor) {
    this.responseInterceptors.push(interceptor)
  }

  // 添加错误拦截器
  addErrorInterceptor(interceptor: ErrorInterceptor) {
    this.errorInterceptors.push(interceptor)
  }

  // 处理请求拦截器
  private async processRequestInterceptors(config: RequestConfig): Promise<RequestConfig> {
    let processedConfig = { ...config }

    for (const interceptor of this.requestInterceptors) {
      processedConfig = await interceptor(processedConfig)
    }

    return processedConfig
  }

  // 处理响应拦截器
  private async processResponseInterceptors(response: Response): Promise<Response> {
    let processedResponse: Response = response

    for (const interceptor of this.responseInterceptors) {
      const result = await interceptor(processedResponse)
      if (result instanceof Response) {
        processedResponse = result
      }
    }

    return processedResponse
  }

  // 处理错误拦截器
  private async processErrorInterceptors(error: unknown): Promise<unknown> {
    let processedError = error

    for (const interceptor of this.errorInterceptors) {
      processedError = await interceptor(processedError)
    }

    return processedError
  }

  // 创建 AbortController 用于超时控制
  private createAbortController(): AbortController {
    const controller = new AbortController()
    setTimeout(() => controller.abort(), this.timeout)
    return controller
  }

  // 处理响应数据
  private async handleResponse<T = unknown>(response: Response): Promise<ResponseBody<T>> {
    const { status } = response

    // 统一处理后端返回的成功状态（HTTP Status 200）
    if (status === 200) {
      const data = await response.json()
      const { code, msg } = data // 解构后端返回的 code, msg, data

      if (code === ErrorCode.SUCCESS) {
        // 业务成功，直接返回后端 data 字段的数据
        return data
      } else {
        // 后端返回了 HTTP Status 200，但业务 code 表示错误
        notification.error({
          message: '错误',
          description: msg
        })
        // 可以根据不同的 code 做更精细的错误处理或跳转
        switch (code) {
          case ErrorCode.TOKEN_EXPIRED:
          case ErrorCode.UNAUTHORIZED:
            // 认证过期或未认证，可以清空本地 token 并跳转到登录页
            // localStorage.removeItem('token')
            // 这里可以添加路由跳转逻辑，例如：
            // router.push('/login');
            break
          case ErrorCode.FORBIDDEN:
            // 权限不足
            // message.warn('您没有操作权限！'); // 已经在上面统一 error 提示，这里可以额外区分
            break
          case ErrorCode.INVALID_INPUT:
            // 参数校验错误，msg 会更具体
            // message.error(msg);
            break
          case ErrorCode.SYSTEM_ERROR:
          case ErrorCode.UNKNOWN_ERROR:
            // 系统错误
            // message.error('服务器开小差了，请稍后再试！');
            break
          default:
            // 其他业务错误
            break
        }
        // 对于业务错误，仍然通过 Promise.reject 抛出，以便调用者可以捕获
        return Promise.reject(data)
      }
    } else {
      // 理论上，如果后端异常过滤器设置得好，不会出现 status 不是 200 的情况
      // 但为了健壮性，仍然保留这部分处理
      const errorData = await response.json().catch(() => ({}))
      const msg = errorData.msg || '未知错误'
      notification.error({
        message: '错误',
        description: `HTTP 错误: ${status} - ${msg}`
      })
      return Promise.reject(new Error(msg || 'HTTP Error'))
    }
  }

  // 处理错误
  private async handleError(error: unknown): Promise<never> {
    let errorMessage = '未知错误'

    if (error instanceof Error && error.name === 'AbortError') {
      // 请求超时
      errorMessage = '请求超时，请稍后再试！'
    } else if (error && typeof error === 'object' && 'response' in error) {
      // 请求已发出，但服务器响应的状态码不在 2xx 范围内
      const errorWithResponse = error as {
        response: { status: number; data: { msg?: string; message?: string; data?: unknown } }
      }
      const { status, data } = errorWithResponse.response
      errorMessage = data.msg || data.message || '未知错误'

      // 根据 HTTP 状态码进行提示
      switch (status) {
        case 400:
          errorMessage = '请求参数错误，请检查输入！'
          // 如果后端 ValidationPipe 返回的 data.message 是数组，可以显示更详细的错误
          if (Array.isArray(data.data) && data.data.length > 0) {
            errorMessage += ': ' + data.data.join('; ')
          }
          break
        case 401:
          errorMessage = '您的认证已过期或无效，请重新登录！'
          localStorage.removeItem('token')
          // router.push('/login'); // 跳转到登录页
          break
        case 403:
          errorMessage = '您没有权限执行此操作！'
          break
        case 404:
          errorMessage = '请求的资源不存在！'
          break
        case 500:
          errorMessage = '服务器内部错误，请稍后再试！'
          break
        default:
          errorMessage = `网络错误: ${status}`
      }
    } else if (error && typeof error === 'object' && 'request' in error) {
      // 请求已发出但没有收到响应 (例如网络断开或服务器没有响应)
      errorMessage = '服务器无响应，请检查网络或稍后再试！'
    } else if (error instanceof Error) {
      // 发送请求时出了问题
      errorMessage = '请求发送失败：' + error.message
    }

    notification.error({
      message: '错误',
      description: errorMessage
    })

    return Promise.reject(error)
  }

  // 通用请求方法
  async request<T = unknown>(url: string, options: RequestInit = {}): Promise<ResponseBody<T>> {
    try {
      // 构建完整URL
      const fullUrl = url.startsWith('http') ? url : `${this.baseURL}${url}`

      // 默认请求配置
      const defaultOptions: RequestInit = {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        },
        ...options
      }

      // 处理请求拦截器
      const config = await this.processRequestInterceptors({
        baseURL: this.baseURL,
        timeout: this.timeout,
        headers: defaultOptions.headers as Record<string, string>
      })

      // 创建 AbortController
      const controller = this.createAbortController()

      // 执行请求
      const response = await fetch(fullUrl, {
        ...defaultOptions,
        headers: config.headers,
        signal: controller.signal
      })

      // 处理响应拦截器
      const processedResponse = await this.processResponseInterceptors(response)

      // 处理响应数据
      return await this.handleResponse<T>(processedResponse)
    } catch (error) {
      // 处理错误拦截器
      const processedError = await this.processErrorInterceptors(error)
      return await this.handleError(processedError)
    }
  }

  // GET 请求
  get<T = unknown>(url: string, options: RequestInit = {}): Promise<ResponseBody<T>> {
    return this.request<T>(url, { ...options, method: 'GET' })
  }

  // POST 请求
  post<T = unknown>(
    url: string,
    data?: unknown,
    options: RequestInit = {}
  ): Promise<ResponseBody<T>> {
    return this.request<T>(url, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined
    })
  }

  // PUT 请求
  put<T = unknown>(
    url: string,
    data?: unknown,
    options: RequestInit = {}
  ): Promise<ResponseBody<T>> {
    return this.request<T>(url, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined
    })
  }

  // DELETE 请求
  delete<T = unknown>(url: string, options: RequestInit = {}): Promise<ResponseBody<T>> {
    return this.request<T>(url, { ...options, method: 'DELETE' })
  }
}

// 创建 HTTP 客户端实例
const http = new HttpClient({
  baseURL: import.meta.env.VITE_API_BASE_URL, // API基础URL（从环境变量获取）
  timeout: 10000 // 请求超时时间（毫秒）
})

// 添加请求拦截器
http.addRequestInterceptor(config => {
  // 添加token到请求头
  // const token = localStorage.getItem('token')
  // if (token) {
  //   config.headers.Authorization = `Bearer ${token}`
  // }
  return config
})

// 添加错误拦截器
http.addErrorInterceptor(error => {
  // 处理请求错误，例如网络不通，请求被取消等
  if (error instanceof Error && error.name === 'AbortError') {
    notification.error({
      message: '错误',
      description: '网络请求失败，请稍后再试！'
    })
  }
  return error
})

export default http
