import request from '../../utils/request'
import type { GetPermissionListResultDto, UpdatePermissionsDto } from '../identity/types'

const baseUrl = '/api/permission-management/permissions'

export type PermissionProviderName = 'R' | 'U'

export interface PermissionQueryParams {
  providerName: PermissionProviderName
  providerKey: string
}

export async function getPermissions(params: PermissionQueryParams) {
  const res = await request.get<GetPermissionListResultDto>(baseUrl, { params })
  return res.data
}

export async function updatePermissions(params: PermissionQueryParams, data: UpdatePermissionsDto) {
  const res = await request.put<void>(baseUrl, data, { params })
  return res.data
}
