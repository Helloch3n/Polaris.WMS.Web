import axios, { AxiosError, type AxiosInstance, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios'
import { createDiscreteApi } from 'naive-ui'
import {
  ACCESS_TOKEN_STORAGE_KEY,
  CURRENT_DEPARTMENT_STORAGE_KEY,
  CURRENT_WAREHOUSE_STORAGE_KEY,
  REFRESH_TOKEN_STORAGE_KEY,
  useAuthStore,
} from '../stores/auth'

type AbpErrorBody = {
  error?: {
    code?: string
    message?: string
    details?: string
    data?: Record<string, unknown> | null
    validationErrors?: Array<{ message?: string }> | null
  }
}

function tryParseJson(data: unknown): unknown {
  if (typeof data !== 'string') return data
  const text = data.trim()
  if (!text) return data
  try {
    return JSON.parse(text) as unknown
  } catch {
    return data
  }
}

function formatAbpData(data?: Record<string, unknown> | null): string {
  if (!data || typeof data !== 'object') return ''
  const entries = Object.entries(data)
    .filter(([, value]) => value !== null && value !== undefined && String(value).trim() !== '')
    .map(([key, value]) => `${key}: ${String(value)}`)
  return entries.join('，')
}

function getAbpBusinessError(
  data: unknown,
): {
  code?: string
  message: string
  details?: string
  validationErrors?: string
  dataText?: string
} | null {
  const parsed = tryParseJson(data)
  if (!parsed || typeof parsed !== 'object') return null

  const body = parsed as AbpErrorBody
  const code = body.error?.code?.trim()
  const message = body.error?.message?.trim()
  const details = body.error?.details?.trim()
  const validationErrors = (body.error?.validationErrors ?? [])
    .map((item) => item?.message?.trim())
    .filter((item): item is string => Boolean(item))
    .join('；')
  const dataText = formatAbpData(body.error?.data)

  if (!message && !code && !validationErrors && !dataText) return null
  return {
    code: code || undefined,
    message: message || '请求处理失败',
    details: details || undefined,
    validationErrors: validationErrors || undefined,
    dataText: dataText || undefined,
  }
}

function formatAbpErrorMessage(abpError: {
  code?: string
  message: string
  details?: string
  validationErrors?: string
  dataText?: string
}): string {
  const segments: string[] = []
  if (abpError.code) {
    segments.push(`错误码: ${abpError.code}`)
  }
  if (abpError.message) {
    segments.push(`错误信息: ${abpError.message}`)
  }
  if (abpError.details) {
    segments.push(`详情: ${abpError.details}`)
  }
  if (abpError.validationErrors) {
    segments.push(`校验: ${abpError.validationErrors}`)
  }
  if (abpError.dataText) {
    segments.push(`上下文: ${abpError.dataText}`)
  }
  return segments.join('；')
}

function getHttpStatusMessage(status?: number): string {
  if (status === 400) return '请求参数错误'
  if (status === 401) return '未登录或登录已过期'
  if (status === 403) return '拒绝访问'
  if (status === 404) return '请求资源不存在'
  if (status === 500) return '服务器内部错误'
  return '请求失败'
}

function resolveFallbackErrorMessage(error: AxiosError): string {
  if (error.code === 'ERR_NETWORK') return '网络错误，请检查网络连接'
  const status = error.response?.status
  if (typeof status === 'number') return `${status}: ${getHttpStatusMessage(status)}`
  return error.message?.trim() || '请求失败'
}

export const http: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'https://localhost:44346',
})

const { message: notify } = createDiscreteApi(['message'])

type RetryableRequestConfig = InternalAxiosRequestConfig & {
  _retry?: boolean
}

let isRefreshing = false
let requestsQueue: Array<{
  resolve: (value: string) => void
  reject: (reason?: unknown) => void
}> = []

// 刷新完成后统一唤醒挂起请求：成功透传新 token，失败统一拒绝
function flushRequestsQueue(error: unknown, accessToken = '') {
  requestsQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error)
      return
    }
    resolve(accessToken)
  })
  requestsQueue = []
}

function enqueueRequest() {
  return new Promise<string>((resolve, reject) => {
    requestsQueue.push({ resolve, reject })
  })
}

function isOAuthTokenRequest(url?: string): boolean {
  return Boolean(url && url.includes('/connect/token'))
}

function setOrRemoveHeader(config: InternalAxiosRequestConfig, headerName: string, headerValue: string) {
  const normalized = headerValue.trim()
  if (normalized) {
    config.headers[headerName] = normalized
    return
  }

  if (headerName in config.headers) {
    delete (config.headers as Record<string, unknown>)[headerName]
  }
}

async function redirectToLogin() {
  const { default: router } = await import('../router')
  if (router.currentRoute.value.path !== '/login') {
    await router.push({ path: '/login' })
  }
}

http.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  // 从全局 store 读取会话与上下文，并注入到 Header 中
  const authStore = useAuthStore()
  const accessToken = authStore.accessToken || localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY) || ''
  const currentWarehouseId = authStore.currentWarehouseId || localStorage.getItem(CURRENT_WAREHOUSE_STORAGE_KEY) || ''
  const currentDepartmentId = authStore.currentDepartmentId || localStorage.getItem(CURRENT_DEPARTMENT_STORAGE_KEY) || ''

  config.headers = config.headers ?? {}

  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`
  }

  // 全局视图规则：只有上下文有值时才携带 Header；空值必须显式剥离 Header
  setOrRemoveHeader(config, 'X-Current-Warehouse', currentWarehouseId)
  setOrRemoveHeader(config, 'X-Current-Department', currentDepartmentId)

  return config
})

http.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError) => {
    const status = error.response?.status
    const originalRequest = error.config as RetryableRequestConfig | undefined

    if (status === 401 && originalRequest && !isOAuthTokenRequest(originalRequest.url)) {
      // 401 无感刷新：单飞刷新 + 队列挂起重放
      const authStore = useAuthStore()
      const refreshToken = authStore.refreshToken || localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY) || ''

      if (!refreshToken) {
        authStore.clearAll()
        await redirectToLogin()
        return Promise.reject(error)
      }

      if (originalRequest._retry) {
        authStore.clearAll()
        await redirectToLogin()
        return Promise.reject(error)
      }

      if (isRefreshing) {
        // 刷新中：当前请求进入队列等待刷新结果
        try {
          const newAccessToken = await enqueueRequest()
          originalRequest.headers = originalRequest.headers ?? {}
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`
          return http(originalRequest)
        } catch (queueError) {
          return Promise.reject(queueError)
        }
      }

      originalRequest._retry = true
      isRefreshing = true

      try {
        // 刷新请求必须使用 x-www-form-urlencoded
        const baseURL = import.meta.env.VITE_API_URL ?? ''
        const form = new URLSearchParams()
        form.set('grant_type', 'refresh_token')
        form.set('client_id', 'WMS_App')
        form.set('refresh_token', refreshToken)

        const { data } = await axios.post<{ access_token?: string; refresh_token?: string }>(
          '/connect/token',
          form,
          {
            baseURL,
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
          },
        )

        const newAccessToken = data?.access_token ?? ''
        if (!newAccessToken) {
          throw new Error('刷新失败：未返回 access_token')
        }

        authStore.setTokens(newAccessToken, data?.refresh_token ?? refreshToken)
        flushRequestsQueue(null, newAccessToken)
        originalRequest.headers = originalRequest.headers ?? {}
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`
        return http(originalRequest)
      } catch (refreshError) {
        flushRequestsQueue(refreshError)
        authStore.clearAll()
        notify.error('登录已过期')
        await redirectToLogin()
        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    }

    if (status === 403) {
      notify.error('您没有执行该操作的权限！')
      return Promise.reject(error)
    }

    const abpError = getAbpBusinessError(error.response?.data)

    if (abpError) {
      const text = formatAbpErrorMessage(abpError)
      notify.error(text)
      error.message = text
      return Promise.reject(error)
    }

    const fallbackMessage = resolveFallbackErrorMessage(error)
    notify.error(fallbackMessage)
    error.message = fallbackMessage

    return Promise.reject(error)
  },
)
