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

export const PalletMergeType = {
  Split: 0,
  Merge: 1,
} as const

export type PalletMergeType = (typeof PalletMergeType)[keyof typeof PalletMergeType]

export const PalletMergeOrderStatus = {
  Draft: 0,
  Completed: 1,
} as const

export type PalletMergeOrderStatus = (typeof PalletMergeOrderStatus)[keyof typeof PalletMergeOrderStatus]

export const PalletMergeDirection = {
  Before: 0,
  After: 1,
} as const

export type PalletMergeDirection = (typeof PalletMergeDirection)[keyof typeof PalletMergeDirection]

export interface PalletMergeListDto {
  id: string
  orderNo: string
  warehouseId: string
  warehouseCode?: string
  warehouseName?: string
  accountAliasId: string
  accountAlias: string
  mergeType: PalletMergeType
  status: PalletMergeOrderStatus
  creationTime: string
  creatorId?: string
}

export interface PalletMergeDetailDto {
  id: string
  palletMergeOrderId: string
  direction: PalletMergeDirection
  containerId: string
  containerCode: string
  inventoryId?: string | null
  productId: string
  productCode: string
  productName: string
  qty: number
  unit: string
  weight: number
  batchNo: string
  sn: string
  craftVersion?: string | null
  locationId: string
  locationCode: string
  layerIndex: number
}

export interface PalletMergeDto extends PalletMergeListDto {
  details: PalletMergeDetailDto[]
}

export interface CreatePalletMergeDetailDto {
  direction: PalletMergeDirection
  containerId: string
  containerCode: string
  inventoryId?: string | null
  productId: string
  productCode: string
  productName: string
  qty: number
  unit: string
  weight: number
  batchNo: string
  sn: string
  craftVersion?: string | null
  locationId: string
  locationCode: string
  layerIndex: number
}

export interface CreatePalletMergeDto {
  warehouseId: string
  accountAliasId: string
  mergeType: PalletMergeType
  details: CreatePalletMergeDetailDto[]
}

export interface PalletMergeSearchDto extends PagedAndSortedResultRequestDto {
  orderNo?: string
  mergeType?: PalletMergeType
  status?: PalletMergeOrderStatus
  startTime?: string
  endTime?: string
}

const baseUrl = '/api/app/pallet-merge'

export async function getList(params: PalletMergeSearchDto) {
  const res = await request.get<PagedResultDto<PalletMergeListDto>>(baseUrl, { params })
  return res.data
}

export async function get(id: string) {
  const res = await request.get<PalletMergeDto>(`${baseUrl}/${id}`)
  return res.data
}

export async function create(data: CreatePalletMergeDto) {
  const res = await request.post<PalletMergeDto>(baseUrl, data)
  return res.data
}

export async function approveAndExecute(id: string) {
  const res = await request.post<void>(`${baseUrl}/${id}/approve-and-execute`)
  return res.data
}

export async function remove(id: string) {
  const res = await request.delete<void>(`${baseUrl}/${id}`)
  return res.data
}
