import { http } from '@/utils/http'

export const TransferOrderStatus = {
  Draft: 0,
  Approved: 1,
  InProgress: 2,
  Completed: 3,
  Cancelled: 4,
} as const

export type TransferOrderStatus = typeof TransferOrderStatus[keyof typeof TransferOrderStatus]

export interface TransferDetailDto {
  id: string
  containerId: string
  containerCode: string
  reelCode?: string
  inventoryId: string
  productId: string
  productCode: string
  productName: string
  qty: number
  sourceLocationId: string
  sourceLocationCode: string
  targetLocationId: string
  targetLocationCode: string
  isCompleted: boolean
}

export interface TransferListDto {
  id: string
  orderNo: string
  status: TransferOrderStatus
  creationTime: string
  departmentId?: string | null
  departmentCode?: string
  departmentName?: string
  warehouseId?: string | null
  warehouseCode?: string
  warehouseName?: string
}

export interface TransferDto extends TransferListDto {
  sourceDepartmentId?: string | null
  sourceDepartmentName?: string
  sourceWarehouseId?: string | null
  sourceWarehouseCode?: string
  targetWarehouseId?: string | null
  targetWarehouseCode?: string
  details: TransferDetailDto[]
}

export interface TransferSearchDto {
  skipCount?: number
  maxResultCount?: number
  orderNo?: string
  status?: TransferOrderStatus
}

export interface PagedResultDto<T> {
  totalCount: number
  items: T[]
}

const baseUrl = '/api/app/transfer'

export async function getTransferList(params: TransferSearchDto): Promise<PagedResultDto<TransferListDto>> {
  const res = await http.get<PagedResultDto<TransferListDto>>(`${baseUrl}`, { params })
  return res.data
}

export async function getTransferDetail(id: string): Promise<TransferDto> {
  const res = await http.get<TransferDto>(`${baseUrl}/${id}`)
  return res.data
}

export async function approveAndExecute(id: string): Promise<void> {
  await http.post<void>(`${baseUrl}/${id}/approve-and-execute`)
}
