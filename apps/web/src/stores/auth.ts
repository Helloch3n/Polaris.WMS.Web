import { defineStore } from 'pinia'
import axios from 'axios'
import { useTabsStore } from './tabs'

export const ACCESS_TOKEN_STORAGE_KEY = 'auth_access_token'
export const REFRESH_TOKEN_STORAGE_KEY = 'auth_refresh_token'
export const CURRENT_WAREHOUSE_STORAGE_KEY = 'X-Current-Warehouse'
export const CURRENT_DEPARTMENT_STORAGE_KEY = 'X-Current-Department'
export const USER_STORAGE_KEY = 'auth_user'
const LEGACY_TOKEN_STORAGE_KEY = 'auth_token'
const LEGACY_GRANTED_POLICIES_STORAGE_KEY = 'auth_granted_policies'
const REMEMBER_FLAG_KEY = 'web_login_remember_flag'
const REMEMBER_USERNAME_KEY = 'web_login_remember_username'
const REMEMBER_PASSWORD_KEY = 'web_login_remember_password'

export type AuthUserInfo = {
  username: string
  // 如需扩展及：id?: string; name?: string; roles?: string[]; ...
}

type OAuthTokenResponse = {
  access_token: string
  token_type?: string
  expires_in?: number
  scope?: string
  refresh_token?: string
}

type AbpApplicationConfiguration = {
  auth?: {
    grantedPolicies?: Record<string, boolean>
  }
  currentUser?: {
    grantedPolicies?: Record<string, boolean>
  }
}

function readUserFromStorage(): AuthUserInfo | null {
  const raw = localStorage.getItem(USER_STORAGE_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as AuthUserInfo
  } catch {
    return null
  }
}

function resolveGrantedPolicies(payload: AbpApplicationConfiguration): Record<string, boolean> {
  if (payload.auth?.grantedPolicies && typeof payload.auth.grantedPolicies === 'object') {
    return payload.auth.grantedPolicies
  }
  if (payload.currentUser?.grantedPolicies && typeof payload.currentUser.grantedPolicies === 'object') {
    return payload.currentUser.grantedPolicies
  }
  return {}
}

export const useAuthStore = defineStore('auth', {
  state: () => ({
    accessToken: localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY) ?? '',
    refreshToken: localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY) ?? '',
    currentWarehouseId: localStorage.getItem(CURRENT_WAREHOUSE_STORAGE_KEY) ?? '',
    currentDepartmentId: localStorage.getItem(CURRENT_DEPARTMENT_STORAGE_KEY) ?? '',
    user: readUserFromStorage(),
    grantedPolicies: {} as Record<string, boolean>,
    appConfigLoaded: false,
    appConfigLoadedToken: '' as string,
  }),

  actions: {
    // 统一设置 Token，并同步写入本地持久化
    setTokens(accessToken: string, refreshToken = '') {
      this.accessToken = accessToken
      this.refreshToken = refreshToken
      localStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, accessToken)
      if (refreshToken) {
        localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, refreshToken)
      } else {
        localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY)
      }
    },

    // 统一设置请求上下文；空值必须移除对应 Header 存储键
    setContext(warehouseId?: string | null, departmentId?: string | null) {
      const normalizedWarehouseId = (warehouseId ?? '').trim()
      const normalizedDepartmentId = (departmentId ?? '').trim()

      this.currentWarehouseId = normalizedWarehouseId
      this.currentDepartmentId = normalizedDepartmentId

      if (normalizedWarehouseId) {
        localStorage.setItem(CURRENT_WAREHOUSE_STORAGE_KEY, normalizedWarehouseId)
      } else {
        localStorage.removeItem(CURRENT_WAREHOUSE_STORAGE_KEY)
      }

      if (normalizedDepartmentId) {
        localStorage.setItem(CURRENT_DEPARTMENT_STORAGE_KEY, normalizedDepartmentId)
      } else {
        localStorage.removeItem(CURRENT_DEPARTMENT_STORAGE_KEY)
      }
    },

    // 清空核心会话状态，并按要求清空整个 localStorage
    clearAll() {
      const rememberFlag = localStorage.getItem(REMEMBER_FLAG_KEY)
      const rememberUsername = localStorage.getItem(REMEMBER_USERNAME_KEY)
      const rememberPassword = localStorage.getItem(REMEMBER_PASSWORD_KEY)

      this.accessToken = ''
      this.refreshToken = ''
      this.currentWarehouseId = ''
      this.currentDepartmentId = ''
      this.user = null
      this.grantedPolicies = {}
      this.appConfigLoaded = false
      this.appConfigLoadedToken = ''
      localStorage.clear()

      if (rememberFlag === '1' && rememberUsername && rememberPassword) {
        localStorage.setItem(REMEMBER_FLAG_KEY, rememberFlag)
        localStorage.setItem(REMEMBER_USERNAME_KEY, rememberUsername)
        localStorage.setItem(REMEMBER_PASSWORD_KEY, rememberPassword)
      }
    },

    async login(username: string, password: string) {
      const baseURL = import.meta.env.VITE_API_URL ?? ''

      const form = new URLSearchParams()
      form.set('grant_type', 'password')
      form.set('client_id', 'WMS_App')
      form.set('scope', 'WMS')
      form.set('username', username)
      form.set('password', password)

      const { data } = await axios.post<OAuthTokenResponse>('/connect/token', form, {
        baseURL,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      })

      const accessToken = data?.access_token
      if (!accessToken) throw new Error('登录失败：未返回 access_token')

      this.setTokens(accessToken, data.refresh_token ?? '')

      this.user = { username }
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(this.user))

      await this.loadApplicationConfiguration(true)

      return accessToken
    },

    async refreshAccessToken() {
      const refreshToken = localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY) || this.refreshToken
      if (!refreshToken) {
        throw new Error('refresh_token 不存在，无法刷新登录状态')
      }

      const baseURL = import.meta.env.VITE_API_URL ?? ''
      const form = new URLSearchParams()
      form.set('grant_type', 'refresh_token')
      form.set('client_id', 'WMS_App')
      form.set('scope', 'WMS')
      form.set('refresh_token', refreshToken)

      const { data } = await axios.post<OAuthTokenResponse>('/connect/token', form, {
        baseURL,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      })

      const accessToken = data?.access_token
      if (!accessToken) {
        throw new Error('刷新失败：未返回 access_token')
      }

      this.setTokens(accessToken, data.refresh_token ?? refreshToken)
      this.appConfigLoaded = false
      this.appConfigLoadedToken = ''
      this.grantedPolicies = {}

      return accessToken
    },

    async loadApplicationConfiguration(force = false) {
      const token = this.accessToken
      if (!token) {
        this.grantedPolicies = {}
        this.appConfigLoaded = false
        this.appConfigLoadedToken = ''
        return
      }

      const hasPolicies = Object.keys(this.grantedPolicies).length > 0
      if (!force && this.appConfigLoaded && this.appConfigLoadedToken === token && hasPolicies) {
        return
      }

      const { default: request } = await import('../utils/request')
      const res = await request.get<AbpApplicationConfiguration>('/api/abp/application-configuration')
      const grantedPolicies = resolveGrantedPolicies(res.data)

      this.grantedPolicies = grantedPolicies
      this.appConfigLoaded = true
      this.appConfigLoadedToken = token
    },

    hasPermission(policy: string) {
      if (!policy) return true
      return Boolean(this.grantedPolicies[policy])
    },

    async logout(options?: { redirect?: boolean; redirectTarget?: string }) {
      const redirect = options?.redirect ?? true
      const redirectTarget = options?.redirectTarget ?? ''

      this.clearAll()
      this.$reset()

      localStorage.removeItem(LEGACY_TOKEN_STORAGE_KEY)
      localStorage.removeItem(LEGACY_GRANTED_POLICIES_STORAGE_KEY)

      const tabsStore = useTabsStore()
      tabsStore.closeAll()

      if (!redirect) {
        return
      }

      const { default: router } = await import('../router')
      const query = redirectTarget ? { redirect: redirectTarget } : undefined
      if (router.currentRoute.value.path !== '/login') {
        await router.push({ path: '/login', query })
      }
    },
  },
})
