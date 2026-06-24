import request from '../../../utils/request'

export interface PagedResultDto<T> {
  totalCount: number
  items: T[]
}

export interface PagedAndSortedResultRequestDto {
  maxResultCount?: number
  skipCount?: number
  sorting?: string
}

export interface AuditedEntityDto {
  id: string
  creationTime?: string
  creatorId?: string
  lastModificationTime?: string
  lastModifierId?: string
}

export interface EntityDto {
  id: string
}

export const MiscOperationType = {
  Inbound: 1,
  Outbound: 2,
} as const

export type MiscOperationType =
  | (typeof MiscOperationType)[keyof typeof MiscOperationType]
  | keyof typeof MiscOperationType
  | number
  | string

export const MiscOrderStatus = {
  Draft: 0,
  Executed: 1,
} as const

export type MiscOrderStatus =
  | (typeof MiscOrderStatus)[keyof typeof MiscOrderStatus]
  | keyof typeof MiscOrderStatus
  | number
  | string

export interface MiscInboundOrderDetailDto extends EntityDto {
  warehouseId: string
  warehouseCode: string
  warehouseName: string
  locationId: string
  locationCode: string
  containerId: string
  containerCode: string
  productId: string
  productCode: string
  productName: string
  sn: string
  batchNo: string
  craftVersion?: string | null
  unit: string
  qty: number
  remark?: string | null
}

export interface CreateMiscInboundOrderDetailDto {
  warehouseId: string
  warehouseCode: string
  warehouseName: string
  locationId: string
  locationCode: string
  containerId: string
  containerCode: string
  productId: string
  productCode: string
  productName: string
  sn: string
  batchNo: string
  craftVersion?: string | null
  unit: string
  qty: number
  remark?: string | null
}

export interface MiscInboundOrderDto extends AuditedEntityDto {
  orderNo: string
  accountAliasId: string
  accountAliasDescription: string
  costCenterId: string
  costCenterCode: string
  costCenterName: string
  type: MiscOperationType
  status: MiscOrderStatus
  remark?: string | null
  details: MiscInboundOrderDetailDto[]
}

export interface CreateMiscInboundOrderDto {
  orderNo?: string
  accountAliasId: string
  accountAliasDescription: string
  costCenterId: string
  costCenterCode: string
  costCenterName: string
  remark?: string | null
  details: CreateMiscInboundOrderDetailDto[]
}

export interface UpdateMiscInboundOrderDto {
  accountAliasId: string
  accountAliasDescription: string
  costCenterId: string
  costCenterCode: string
  costCenterName: string
  remark?: string | null
  details: CreateMiscInboundOrderDetailDto[]
}

export interface MiscInboundOrderSearchDto extends PagedAndSortedResultRequestDto {
  orderNo?: string
  status?: MiscOrderStatus
}

const baseUrl = '/api/app/misc-inbound-order'

export async function getList(params: MiscInboundOrderSearchDto) {
  const res = await request.get<PagedResultDto<MiscInboundOrderDto>>(baseUrl, { params })
  return res.data
}

export async function get(id: string) {
  const res = await request.get<MiscInboundOrderDto>(`${baseUrl}/${id}`)
  return res.data
}

export async function create(data: CreateMiscInboundOrderDto) {
  const res = await request.post<MiscInboundOrderDto>(baseUrl, data)
  return res.data
}

export async function update(id: string, data: UpdateMiscInboundOrderDto) {
  const res = await request.put<MiscInboundOrderDto>(`${baseUrl}/${id}`, data)
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

export default {
  getList,
  get,
  create,
  update,
  approveAndExecute,
  remove,
}
