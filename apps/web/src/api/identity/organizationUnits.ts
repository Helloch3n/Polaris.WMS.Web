import request from '../../utils/request'
import type {
  GetOrganizationUnitMembersParams,
  GetIdentityUsersParams,
  IdentityUserDto,
  OrganizationUnitCreateDto,
  OrganizationUnitDto,
  OrganizationUnitUserDto,
  OrganizationUnitUpdateDto,
  PagedResultDto,
} from './types'

const baseUrl = '/api/identity/organization-units'
const appBaseUrl = '/api/app/organization-unit'
const appTreeUrl = '/api/app/organization-unit/tree'
const usersBaseUrl = '/api/identity/users'
const usersFallbackBaseUrl = '/identity/users'

function is404Error(error: unknown) {
  return typeof error === 'object' && error !== null && 'response' in error
    && typeof (error as { response?: { status?: number } }).response?.status === 'number'
    && (error as { response?: { status?: number } }).response?.status === 404
}

export async function getTree() {
  const res = await request.get<OrganizationUnitDto[]>(appTreeUrl)
  const items = buildOrganizationUnitTree(res.data ?? [])
  return { items }
}

function buildOrganizationUnitTree(flatList: OrganizationUnitDto[]) {
  const nodeMap = new Map<string, OrganizationUnitDto>()
  const roots: OrganizationUnitDto[] = []

  for (const item of flatList) {
    nodeMap.set(item.id, {
      ...item,
      children: [],
    })
  }

  for (const node of nodeMap.values()) {
    const parentId = node.parentId ?? null
    if (!parentId) {
      roots.push(node)
      continue
    }

    const parent = nodeMap.get(parentId)
    if (!parent) {
      roots.push(node)
      continue
    }

    const children = parent.children ?? []
    children.push(node)
    parent.children = children
  }

  return roots
}

export async function get(id: string) {
  const res = await request.get<OrganizationUnitDto>(`${baseUrl}/${id}`)
  return res.data
}

export async function create(data: OrganizationUnitCreateDto) {
  const res = await request.post<OrganizationUnitDto>(appBaseUrl, data)
  return res.data
}

export async function update(id: string, data: OrganizationUnitUpdateDto) {
  const res = await request.put<OrganizationUnitDto>(`${baseUrl}/${id}`, data)
  return res.data
}

export async function remove(id: string) {
  const res = await request.delete<void>(`${baseUrl}/${id}`)
  return res.data
}

export async function getMembers(id: string, params: GetOrganizationUnitMembersParams) {
  const userParams: GetIdentityUsersParams = {
    ...params,
    organizationUnitId: id,
  }

  try {
    const res = await request.get<PagedResultDto<IdentityUserDto>>(usersBaseUrl, { params: userParams })
    return res.data
  } catch (error) {
    if (!is404Error(error)) throw error
    try {
      const fallbackUserRes = await request.get<PagedResultDto<IdentityUserDto>>(usersFallbackBaseUrl, { params: userParams })
      return fallbackUserRes.data
    } catch (fallbackError) {
      if (!is404Error(fallbackError)) throw fallbackError
      const fallbackRes = await request.get<PagedResultDto<IdentityUserDto>>(`${baseUrl}/${id}/members`, { params })
      return fallbackRes.data
    }
  }
}

export async function getUsers(organizationUnitId: string) {
  const res = await request.get<OrganizationUnitUserDto[]>(`${appBaseUrl}/users/${organizationUnitId}`)
  return res.data ?? []
}

export async function addUser(organizationUnitId: string, userId: string) {
  try {
    const res = await request.put<void>(`${baseUrl}/${organizationUnitId}/members/${userId}`)
    return res.data
  } catch (error) {
    if (!is404Error(error)) throw error
    const fallbackRes = await request.put<void>(`${baseUrl}/${organizationUnitId}/users/${userId}`)
    return fallbackRes.data
  }
}

export async function addUsers(organizationUnitId: string, userIds: string[]) {
  const payload = {
    userIds,
  }

  try {
    const res = await request.post<void>(`${appBaseUrl}/${organizationUnitId}/users`, payload)
    return res.data
  } catch (error) {
    if (!is404Error(error)) throw error
    const fallbackRes = await request.post<void>(`${appBaseUrl}/${organizationUnitId}/add-users`, payload)
    return fallbackRes.data
  }
}

export async function removeUser(organizationUnitId: string, userId: string) {
  try {
    const res = await request.delete<void>(`${baseUrl}/${organizationUnitId}/members/${userId}`)
    return res.data
  } catch (error) {
    if (!is404Error(error)) throw error
    const fallbackRes = await request.delete<void>(`${baseUrl}/${organizationUnitId}/users/${userId}`)
    return fallbackRes.data
  }
}
