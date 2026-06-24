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
  needInspection: boolean
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
  needInspection?: boolean
}

const baseUrl = '/api/app/production-inbound'

function mapDetailFromBackend(detail: any): ProductionInboundDetailDto {
  return {
    ...detail,
    containerId: detail.reelId,
    containerCode: detail.reelCode || detail.reelId,
  }
}

function mapDetailToBackend(detail: any): any {
  return {
    ...detail,
    reelId: detail.containerId,
    reelCode: detail.containerCode || detail.containerId,
  }
}

function mapCreateDetailToBackend(detail: any): any {
  return {
    ...detail,
    reelId: detail.containerId,
  }
}

function mapFromBackend(data: any): ProductionInboundDto {
  if (!data) return data
  return {
    ...data,
    details: data.details ? data.details.map(mapDetailFromBackend) : [],
  }
}

export async function getList(params: ProductionInboundSearchDto) {
  const res = await request.get<PagedResultDto<any>>(baseUrl, { params })
  if (res.data && res.data.items) {
    res.data.items = res.data.items.map(mapFromBackend)
  }
  return res.data
}

export async function get(id: string) {
  const res = await request.get<any>(`${baseUrl}/${id}`)
  return mapFromBackend(res.data)
}

export async function getByOrderId(orderId: string) {
  const res = await request.get<any>(`${baseUrl}/${orderId}`)
  return mapFromBackend(res.data)
}

export async function create(data: CreateProductionInboundDto) {
  const payload = {
    ...data,
    details: data.details ? data.details.map(mapCreateDetailToBackend) : [],
  }
  const res = await request.post<any>(baseUrl, payload)
  return mapFromBackend(res.data)
}

export async function update(data: ProductionInboundDto) {
  const payload = {
    ...data,
    details: data.details ? data.details.map(mapDetailToBackend) : [],
  }
  const res = await request.put<any>(baseUrl, payload)
  return mapFromBackend(res.data)
}

export async function approveAndExecute(id: string) {
  const res = await request.post<void>(`${baseUrl}/${id}/approve-and-execute`)
  return res.data
}
