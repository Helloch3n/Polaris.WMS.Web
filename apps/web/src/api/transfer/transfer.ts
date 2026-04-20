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

export const TransferOrderStatus = {
  Draft: 0,
  Approved: 1,
  InProgress: 2,
  Completed: 3,
  Cancelled: 4,
} as const

export type TransferOrderStatus = (typeof TransferOrderStatus)[keyof typeof TransferOrderStatus] | keyof typeof TransferOrderStatus | string | number

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

export interface TransferDetailDto {
  id: string
  containerId: string
  containerCode: string
  inventoryId: string
  productId: string
  productCode: string
  productName: string
  craftVersion: string
  qty: number
  sourceLocationId: string
  sourceLocationCode: string
  targetLocationId: string
  targetLocationCode: string
  sourceWarehouseId?: string | null
  sourceWarehouseCode: string
  targetWarehouseId?: string | null
  targetWarehouseCode: string
  isCompleted: boolean
}

export interface TransferDto extends TransferListDto {
  sourceDepartmentId?: string | null
  sourceDepartmentName?: string
  sourceWarehouseId?: string | null
  sourceWarehouseCode: string
  targetWarehouseId?: string | null
  targetWarehouseCode: string
  details: TransferDetailDto[]
}

export interface CreateTransferDetailDto {
  containerId: string
  inventoryId: string
  productId: string
  qty: number
  sourceLocationId: string
  targetLocationId: string
}

export interface CreateTransferDto {
  sourceDepartmentId?: string | null
  sourceWarehouseId: string
  targetWarehouseId: string
  details: CreateTransferDetailDto[]
}

export interface TransferSearchDto extends PagedAndSortedResultRequestDto {
  orderNo?: string
  status?: TransferOrderStatus
  startTime?: string
  endTime?: string
}

const baseUrl = '/api/app/transfer'

export async function getList(params: TransferSearchDto) {
  const res = await request.get<PagedResultDto<TransferListDto>>(baseUrl, { params })
  return res.data
}

export async function get(id: string) {
  const res = await request.get<TransferDto>(`${baseUrl}/${id}`)
  return res.data
}

export async function create(data: CreateTransferDto) {
  const res = await request.post<TransferDto>(baseUrl, data)
  return res.data
}

export async function update(data: TransferDto) {
  const res = await request.put<TransferDto>(baseUrl, data)
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
