import request from '../../utils/request'
import type {
  GetIdentityRolesParams,
  IdentityRoleCreateDto,
  IdentityRoleDto,
  IdentityRoleUpdateDto,
  PagedResultDto,
} from './types'

const baseUrl = '/api/identity/roles'

export async function getList(params: GetIdentityRolesParams) {
  const res = await request.get<PagedResultDto<IdentityRoleDto>>(baseUrl, { params })
  return res.data
}

export async function get(id: string) {
  const res = await request.get<IdentityRoleDto>(`${baseUrl}/${id}`)
  return res.data
}

export async function create(data: IdentityRoleCreateDto) {
  const res = await request.post<IdentityRoleDto>(baseUrl, data)
  return res.data
}

export async function update(id: string, data: IdentityRoleUpdateDto) {
  const res = await request.put<IdentityRoleDto>(`${baseUrl}/${id}`, data)
  return res.data
}

export async function remove(id: string) {
  const res = await request.delete<void>(`${baseUrl}/${id}`)
  return res.data
}
