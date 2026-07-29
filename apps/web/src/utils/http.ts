import axios, { AxiosError, type AxiosInstance, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios'
import { computed } from 'vue'
import { createDiscreteApi, darkTheme } from 'naive-ui'
import { sharedResolvedTheme } from '../stores/settings'
import { wmsThemeOverrides } from '../theme/wmsTheme'
import {
  ACCESS_TOKEN_STORAGE_KEY,
  CURRENT_DEPARTMENT_STORAGE_KEY,
  CURRENT_WAREHOUSE_STORAGE_KEY,
  REFRESH_TOKEN_STORAGE_KEY,
  useAuthStore,
} from '../stores/auth'

export type AbpErrorBody = {
  error?: {
    code?: string | null
    message?: string | null
    details?: string | null
    data?: Record<string, unknown> | null
    validationErrors?: Array<{
      message?: string | null
      members?: string[] | null
    }> | null
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

function getAbpErrorMessage(data: unknown): string | null {
  const parsed = tryParseJson(data)
  if (!parsed || typeof parsed !== 'object') return null

  const body = parsed as AbpErrorBody
  const message = body.error?.message?.trim()
  if (message) return message

  const validationErrors = (body.error?.validationErrors ?? [])
    .map((item) => item?.message?.trim())
    .filter((item): item is string => Boolean(item))
    .join('；')
  if (validationErrors) return validationErrors

  return body.error?.details?.trim() || null
}

function getHttpStatusMessage(status?: number): string {
  if (status === 400) return '请求参数错误'
  if (status === 401) return '未登录或登录已过期'
  if (status === 403) return '您没有执行该操作的权限'
  if (status === 404) return '请求资源不存在'
  if (status === 500) return '服务器内部错误'
  return '请求失败'
}

export function resolveHttpErrorMessage(error: AxiosError): string {
  const abpMessage = getAbpErrorMessage(error.response?.data)
  if (abpMessage) return abpMessage

  if (error.code === 'ERR_NETWORK') return '网络错误，请检查网络连接'
  const status = error.response?.status
  if (typeof status === 'number') return getHttpStatusMessage(status)
  return error.message?.trim() || '请求失败'
}

export const http: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'https://localhost:44346',
})

const discreteConfig = computed(() => ({
  theme: sharedResolvedTheme.value === 'dark' ? darkTheme : null,
  themeOverrides: wmsThemeOverrides[sharedResolvedTheme.value],
}))
const { message: notify } = createDiscreteApi(['message'], { configProviderProps: discreteConfig })

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

    // 请求层只负责将 ABP/HTTP 错误规范化，具体页面负责展示，避免重复弹窗。
    error.message = resolveHttpErrorMessage(error)

    return Promise.reject(error)
  },
)
