import request from '../../utils/request'

export interface PagedResultDto<T> {
  totalCount: number
  items: T[]
}

export interface ListResultDto<T> {
  items: T[]
}

export interface PagedAndSortedResultRequestDto {
  maxResultCount?: number
  skipCount?: number
  sorting?: string
}

export const LocationType = {
  Equipment: 10,
  Rack: 20,
  Floor: 30,
} as const

export type LocationType = (typeof LocationType)[keyof typeof LocationType]

export const LocationStatus = {
  Idle: 0,
  Partial: 10,
  Full: 20,
  Locked: 30,
} as const

export type LocationStatus = (typeof LocationStatus)[keyof typeof LocationStatus]

export interface LocationDto {
  id: string
  warehouseId: string
  zoneId: string
  code: string
  aisle: string
  rack: string
  level: string
  bin: string
  maxWeight: number
  maxVolume: number
  maxReelCount: number
  type: number
  status: number
  allowMixedProducts: boolean
  allowMixedBatches: boolean
  creationTime?: string
  creatorId?: string
  lastModificationTime?: string
  lastModifierId?: string
}

/** 创建/更新 DTO 鈥?不含 status（后竸接受外部传入 status锛?*/
export interface CreateUpdateLocationDto {
  warehouseId: string
  zoneId: string
  code: string
  aisle: string
  rack: string
  level: string
  bin: string
  maxWeight: number
  maxVolume: number
  maxReelCount: number
  type: number
  allowMixedProducts: boolean
  allowMixedBatches: boolean
}

export interface BatchCreateLocationDto {
  zoneId: string
  warehouseId: string
  aislePrefix: string
  rackCount: number
  levelCount: number
}

export interface LocationPagedQueryDto extends PagedAndSortedResultRequestDto {
  filter?: string
  zoneId?: string
  zoneCode?: string
  zoneName?: string
  warehouseCode?: string
  warehouseName?: string
  locationCode?: string
}

// 兼旧命?
export type GetLocationListParams = LocationPagedQueryDto

const baseUrl = '/api/app/location'

export async function getList(params: LocationPagedQueryDto) {
  const res = await request.get<PagedResultDto<LocationDto>>(baseUrl, { params })
  return res.data
}

export async function get(id: string) {
  const res = await request.get<LocationDto>(`${baseUrl}/${id}`)
  return res.data
}

export async function getLocationByWarehouseId(warehouseId: string) {
  const res = await request.get<ListResultDto<LocationDto>>(`${baseUrl}/location-by-warehouse-id/${warehouseId}`)
  return res.data
}

export async function create(data: CreateUpdateLocationDto) {
  const res = await request.post<LocationDto>(baseUrl, data)
  return res.data
}

export async function update(id: string, data: CreateUpdateLocationDto) {
  const res = await request.put<LocationDto>(`${baseUrl}/${id}`, data)
  return res.data
}

export async function deleteLocation(id: string) {
  const res = await request.delete<void>(`${baseUrl}/${id}`)
  return res.data
}
export { deleteLocation as delete }

export async function batchCreate(data: BatchCreateLocationDto) {
  const res = await request.post<void>(`${baseUrl}/batch-create`, data)
  return res.data
}