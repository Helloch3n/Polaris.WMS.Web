import axios, { type AxiosError } from 'axios'
import { showFailToast } from 'vant'
import { useAuthStore } from '../stores/auth'

type AbpErrorPayload = {
  error?: {
    message?: string
    details?: string
  }
}

export const http = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '',
})

http.interceptors.request.use((config) => {
  const authStore = useAuthStore()
  if (authStore.accessToken) {
    config.headers = config.headers ?? {}
    config.headers.Authorization = `Bearer ${authStore.accessToken}`
  }
  return config
})

http.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const status = error.response?.status
    const payload = error.response?.data as AbpErrorPayload | undefined
    const message = payload?.error?.details ? `${payload.error.message}: ${payload.error.details}` : payload?.error?.message

    if (message) {
      showFailToast(message)
      return Promise.reject(error)
    }

    if (status === 401) {
      const authStore = useAuthStore()
      authStore.clearAuth()
      window.location.replace('/login')
    }

    showFailToast(status ? `${status}: 请求失败` : '网络错误')
    return Promise.reject(error)
  },
)
