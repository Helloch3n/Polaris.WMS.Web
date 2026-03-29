import request from '../../utils/request'
import type {
  GetIdentityUsersParams,
  IdentityRoleDto,
  IdentityUserCreateDto,
  IdentityUserDto,
  IdentityUserUpdateDto,
  PagedResultDto,
} from './types'

const baseUrl = '/api/identity/users'

export async function getList(params: GetIdentityUsersParams) {
  const res = await request.get<PagedResultDto<IdentityUserDto>>(baseUrl, { params })
  return res.data
}

export async function get(id: string) {
  const res = await request.get<IdentityUserDto>(`${baseUrl}/${id}`)
  return res.data
}

export async function create(data: IdentityUserCreateDto) {
  const res = await request.post<IdentityUserDto>(baseUrl, data)
  return res.data
}

export async function update(id: string, data: IdentityUserUpdateDto) {
  const res = await request.put<IdentityUserDto>(`${baseUrl}/${id}`, data)
  return res.data
}

export async function remove(id: string) {
  const res = await request.delete<void>(`${baseUrl}/${id}`)
  return res.data
}

export async function resetPassword(id: string, password: string) {
  const res = await request.put<void>(`${baseUrl}/${id}/password`, {
    password,
  })
  return res.data
}

export async function getRoles(id: string) {
  const res = await request.get<IdentityRoleDto[]>(`${baseUrl}/${id}/roles`)
  return res.data
}
