import { defineStore } from 'pinia'

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
  },
})
