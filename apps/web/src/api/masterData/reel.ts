import request from '../../utils/request'

/** ABP 甯哥敤鍒嗛〉结果 */
export interface PagedResultDto<T> {
  totalCount: number
  items: T[]
}

/** ABP 常用列表查 */
export interface PagedAndSortedResultRequestDto {
  maxResultCount?: number
  skipCount?: number
  sorting?: string
}

export const ReelType = {
  Turnover: 0,
  FinishedGoods: 1,
  Virtual: 2,
} as const

export type ReelType = (typeof ReelType)[keyof typeof ReelType]

export interface ReelDto {
  id?: string
  reelNo: string
  name: string
  size?: string
  reelType: ReelType | keyof typeof ReelType | string | number
  selfWeight: number
  currentLocationId?: string
  currentLocationCode?: string
  currentZoneId?: string
  currentZoneCode?: string
  currentWarehouseId?: string
  currentWarehouseCode?: string
  status: number | string
  isLocked: boolean
}

export interface CreateUpdateReelDto {
  reelNo?: string
  name: string
  size?: string
  reelType: ReelType | number
  selfWeight: number
  currentLocationId?: string
}

export interface UpdateReelLocationDto {
  locationId: string
}

export interface InventoryBriefDto {
  inventoryId: string
  productId: string
  productCode: string
  productName: string
  craftVersion?: string
  batchNo: string
  quantity: number
  uom: string
}

export interface MovableReelDto {
  reelId: string
  reelNo: string
  reelType: string
  currentLocationId: string
  currentLocationCode: string
  inventories: InventoryBriefDto[]
}

export interface GetReelListParams extends PagedAndSortedResultRequestDto {
  maxResultCount?: number
  skipCount?: number
  sorting?: string
  containerCode?: string
  filter?: string
}

const baseUrl = '/api/app/reel'

export async function getList(params: GetReelListParams) {
  const res = await request.get<PagedResultDto<ReelDto>>(baseUrl, { params })
  return res.data
}

export async function get(id: string) {
  const res = await request.get<ReelDto>(`${baseUrl}/${id}`)
  return res.data
}

export async function create(data: CreateUpdateReelDto) {
  const res = await request.post<ReelDto>(baseUrl, data)
  return res.data
}

export async function update(id: string, data: CreateUpdateReelDto) {
  const res = await request.put<ReelDto>(`${baseUrl}/${id}`, data)
  return res.data
}

async function deleteReel(id: string) {
  const res = await request.delete<void>(`${baseUrl}/${id}`)
  return res.data
}
export { deleteReel as delete }

export async function updateLocation(id: string, data: UpdateReelLocationDto) {
  const res = await request.put<void>(`${baseUrl}/${id}/update-location`, data)
  return res.data
}

export async function getMovableReels(sourceWarehouseId: string) {
  const res = await request.get<MovableReelDto[]>(`${baseUrl}/movable-reels/${sourceWarehouseId}`)
  return res.data
}