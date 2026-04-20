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

export const ProductionInboundType = {
  FinishedProduct: 10,
  SemiFinishedProduct: 20,
  WorkInProgress: 30,
} as const

export type ProductionInboundType =
  | (typeof ProductionInboundType)[keyof typeof ProductionInboundType]
  | keyof typeof ProductionInboundType
  | number
  | string

export const ProductionInboundStatus = {
  Draft: 0,
  InProgress: 1,
  Completed: 2,
} as const

export type ProductionInboundStatus =
  | (typeof ProductionInboundStatus)[keyof typeof ProductionInboundStatus]
  | keyof typeof ProductionInboundStatus
  | number
  | string

export const ProductionInboundDetailStatus = {
  Pending: 0,
  InProgress: 1,
  Completed: 2,
} as const

export type ProductionInboundDetailStatus =
  | (typeof ProductionInboundDetailStatus)[keyof typeof ProductionInboundDetailStatus]
  | keyof typeof ProductionInboundDetailStatus
  | number
  | string

export interface AuditedEntityDto {
  id: string
  creationTime?: string
  creatorId?: string
  lastModificationTime?: string
  lastModifierId?: string
}

export interface ProductionInboundDetailDto extends AuditedEntityDto {
  productionInboundId: string
  productId: string
  productCode: string
  productName: string
  batchNo: string
  craftVersion: string
  containerId: string
  containerCode: string
  qty: number
  unit: string
  weight: number
  sn: string
  layerIndex: number
  relatedOrderNo: string
  relatedOrderNoLineNo: string
  actualLocationId: string
  actualLocationCode: string
  status: ProductionInboundDetailStatus
}

export interface ProductionInboundDto extends AuditedEntityDto {
  orderNo: string
  sourceOrderNo: string
  inboundType: ProductionInboundType
  sourceDepartmentId: string
  sourceDepartmentName?: string
  sourceDepartmentCode?: string
  targetWarehouseId: string
  targetWarehouseName?: string
  targetWarehouseCode?: string
  status: ProductionInboundStatus
  details?: ProductionInboundDetailDto[]
}

export interface ProductionInboundSearchDto extends PagedAndSortedResultRequestDto {
  orderNo?: string
  sourceOrderNo?: string
  status?: ProductionInboundStatus
}

export interface CreateProductionInboundDto {
  sourceOrderNo: string
  inboundType: ProductionInboundType
  sourceDepartmentId: string
  targetWarehouseId: string
  details?: CreateProductionInboundDetailDto[]
}

export interface CreateProductionInboundDetailDto {
  productId: string
  batchNo: string
  craftVersion: string
  containerId: string
  qty: number
  unit: string
  weight?: number | null
  sn: string
  layerIndex: number
  relatedOrderNo: string
  relatedOrderNoLineNo: string
  actualLocationId?: string | null
}

const baseUrl = '/api/app/production-inbound'

export async function getList(params: ProductionInboundSearchDto) {
  const res = await request.get<PagedResultDto<ProductionInboundDto>>(baseUrl, { params })
  return res.data
}

export async function get(id: string) {
  const res = await request.get<ProductionInboundDto>(`${baseUrl}/${id}`)
  return res.data
}

export async function getByOrderId(orderId: string) {
  const res = await request.get<ProductionInboundDto>(`${baseUrl}/${orderId}`)
  return res.data
}

export async function create(data: CreateProductionInboundDto) {
  const res = await request.post<ProductionInboundDto>(baseUrl, data)
  return res.data
}

export async function update(data: ProductionInboundDto) {
  const res = await request.put<ProductionInboundDto>(baseUrl, data)
  return res.data
}

export async function approveAndExecute(id: string) {
  const res = await request.post<void>(`${baseUrl}/${id}/approve-and-execute`)
  return res.data
}
