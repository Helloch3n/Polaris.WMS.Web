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

export const ZoneType = {
  Dock: 10,
  Storage: 20,
  LineSide: 30,
  QC: 40,
  Outbound: 50,
} as const

export type ZoneType = (typeof ZoneType)[keyof typeof ZoneType]

export interface ZoneDto {
  id: string
  warehouseId: string
  code: string
  name: string
  zoneType: number
  creationTime?: string
  creatorId?: string
  lastModificationTime?: string
  lastModifierId?: string
}

export interface CreateUpdateZoneDto {
  warehouseId: string
  code: string
  name: string
  zoneType: number
}

export interface ZonePagedQueryDto extends PagedAndSortedResultRequestDto {
  zoneCode?: string
  zoneName?: string
  warehouseCode?: string
  warehouseName?: string
}

// 兼旧命?
export type GetZoneListParams = ZonePagedQueryDto

const baseUrl = '/api/app/zone'

export async function getList(params?: ZonePagedQueryDto) {
  const res = await request.get<PagedResultDto<ZoneDto>>(baseUrl, { params })
  return res.data
}

export async function get(id: string) {
  const res = await request.get<ZoneDto>(`${baseUrl}/${id}`)
  return res.data
}

export async function create(data: CreateUpdateZoneDto) {
  const res = await request.post<ZoneDto>(baseUrl, data)
  return res.data
}

export async function update(id: string, data: CreateUpdateZoneDto) {
  const res = await request.put<ZoneDto>(`${baseUrl}/${id}`, data)
  return res.data
}

export async function remove(id: string) {
  const res = await request.delete<void>(`${baseUrl}/${id}`)
  return res.data
}

export async function getByWarehouseId(warehouseId: string) {
  const res = await request.get<ZoneDto[]>(`${baseUrl}/by-warehouse/${warehouseId}`)
  return res.data
}