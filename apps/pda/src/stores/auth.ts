import { defineStore } from 'pinia'
import { loginByPassword } from '@/api/auth'

export type AuthState = {
  accessToken: string
  refreshToken: string
  userName: string
}

const ACCESS_TOKEN_KEY = 'pda_access_token'
const REFRESH_TOKEN_KEY = 'pda_refresh_token'
const USER_NAME_KEY = 'pda_user_name'

export const useAuthStore = defineStore('pda-auth', {
  state: (): AuthState => ({
    accessToken: localStorage.getItem(ACCESS_TOKEN_KEY) ?? '',
    refreshToken: localStorage.getItem(REFRESH_TOKEN_KEY) ?? '',
    userName: localStorage.getItem(USER_NAME_KEY) ?? '',
  }),
  getters: {
    isAuthenticated: (state): boolean => !!state.accessToken,
  },
  actions: {
    setAuth(payload: { accessToken: string; refreshToken?: string; userName?: string }) {
      this.accessToken = payload.accessToken
      this.refreshToken = payload.refreshToken ?? ''
      this.userName = payload.userName ?? ''
      localStorage.setItem(ACCESS_TOKEN_KEY, this.accessToken)
      localStorage.setItem(REFRESH_TOKEN_KEY, this.refreshToken)
      localStorage.setItem(USER_NAME_KEY, this.userName)
    },
    clearAuth() {
      this.accessToken = ''
      this.refreshToken = ''
      this.userName = ''
      localStorage.removeItem(ACCESS_TOKEN_KEY)
      localStorage.removeItem(REFRESH_TOKEN_KEY)
      localStorage.removeItem(USER_NAME_KEY)
    },
    // 🚀 补齐 LoginView.vue 需要的 login 方法
    async login(username: string, password: string): Promise<boolean> {
      try {
        const res = await loginByPassword({ username, password })
        // 根据 ABP 的标准 Token 返回结构
        if (res && res.access_token) {
          this.setAuth({
            accessToken: res.access_token,
            refreshToken: res.refresh_token,
            userName: username // 保存登录的用户名
          })
          return true
        }
        return false
      } catch (error) {
        console.error('登录异常:', error)
        return false
      }
    },
    // 🚀 补齐 MineView.vue 需要的 logout 方法
    logout() {
      this.clearAuth()
    }
  },
})