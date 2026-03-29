import { http } from '../utils/http'
import type { AbpTokenResponse } from '../types/auth'

export async function loginByPassword(payload: { username: string; password: string }) {
  const formData = new URLSearchParams()
  formData.set('grant_type', 'password')
  formData.set('client_id', 'WMS_App')
  formData.set('scope', 'WMS')
  formData.set('username', payload.username)
  formData.set('password', payload.password)

  const res = await http.post<AbpTokenResponse>('/connect/token', formData, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  })
  return res.data
}
