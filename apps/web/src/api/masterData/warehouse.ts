import request from '../../utils/request'

export interface PagedResultDto<T> {
  totalCount: number
  items: T[]
}

export interface PagedAndSortedResultRequestDto {
  maxResultCount?: number
  skipCount?: number
  sorting?: string
}

export interface WarehouseDto {
  id: string
  code: string
  name: string
  creationTime?: string
  creatorId?: string
  lastModificationTime?: string
  lastModifierId?: string
}

export interface CreateUpdateWarehouseDto {
  code: string
  name: string
}

export interface WarehousePagedQueryDto extends PagedAndSortedResultRequestDto {
  filter?: string
  warehouseCode?: string
  warehouseName?: string
}

export interface WarehouseLocationDto {
  id?: string
  code: string
}

export interface WarehouseZoneWithLocationsDto {
  id?: string
  code: string
  name?: string
  locations?: WarehouseLocationDto[]
}

export interface WarehouseWithDetailsDto extends WarehouseDto {
  zones?: WarehouseZoneWithLocationsDto[]
}

export interface WarehouseUserDto {
  id: string
  userName?: string
  email?: string
  name?: string
}

// 兼旧命?
export type GetWarehouseListParams = WarehousePagedQueryDto

const baseUrl = '/api/app/warehouse'
const userWarehouseBaseUrl = '/api/app/user-warehouse'

export async function getList(params?: WarehousePagedQueryDto) {
  const res = await request.get<PagedResultDto<WarehouseDto>>(baseUrl, { params })
  return res.data
}

export async function get(id: string) {
  const res = await request.get<WarehouseDto>(`${baseUrl}/${id}`)
  return res.data
}

export async function getWithDetails(id: string) {
  const res = await request.get<WarehouseWithDetailsDto>(`${baseUrl}/${id}/with-details`)
  return res.data
}

export async function create(data: CreateUpdateWarehouseDto) {
  const res = await request.post<WarehouseDto>(baseUrl, data)
  return res.data
}

export async function update(id: string, data: CreateUpdateWarehouseDto) {
  const res = await request.put<WarehouseDto>(`${baseUrl}/${id}`, data)
  return res.data
}

export async function remove(id: string) {
  const res = await request.delete<void>(`${baseUrl}/${id}`)
  return res.data
}

export async function addUsers(warehouseId: string, userIds: string[]) {
  const payload = {
    userIds,
  }

  try {
    const res = await request.post<void>(`${userWarehouseBaseUrl}/users/${warehouseId}`, payload)
    return res.data
  } catch {
    const fallbackRes = await request.post<void>(`${baseUrl}/${warehouseId}/users`, payload)
    return fallbackRes.data
  }
}

export async function getWarehousesByUser(userId: string) {
  const res = await request.get<string[]>(`${userWarehouseBaseUrl}/warehouses-by-user/${userId}`)
  return res.data ?? []
}

export async function getUsersByWarehouse(warehouseId: string) {
  const res = await request.get<WarehouseUserDto[]>(`${userWarehouseBaseUrl}/users-by-warehouse/${warehouseId}`)
  return res.data ?? []
}

export async function removeUsers(warehouseId: string, userIds: string[]) {
  if (!userIds.length) return
  const res = await request.delete<void>(`${userWarehouseBaseUrl}/users/${warehouseId}`, {
    params: {
      UserIds: userIds,
    },
    paramsSerializer: {
      indexes: null,
    },
  })
  return res.data
}