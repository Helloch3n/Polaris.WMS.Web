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

export interface MiscOutboundOrderDetailDto extends EntityDto {
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

export interface CreateMiscOutboundOrderDetailDto {
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

export interface MiscOutboundOrderDto extends AuditedEntityDto {
  orderNo: string
  accountAliasId: string
  accountAliasDescription: string
  costCenterId: string
  costCenterCode: string
  costCenterName: string
  type: MiscOperationType
  status: MiscOrderStatus
  remark?: string | null
  details: MiscOutboundOrderDetailDto[]
}

export interface CreateMiscOutboundOrderDto {
  orderNo: string
  accountAliasId: string
  accountAliasDescription: string
  costCenterId: string
  costCenterCode: string
  costCenterName: string
  remark?: string | null
  details: CreateMiscOutboundOrderDetailDto[]
}

export interface UpdateMiscOutboundOrderDto {
  accountAliasId: string
  accountAliasDescription: string
  costCenterId: string
  costCenterCode: string
  costCenterName: string
  remark?: string | null
  details: CreateMiscOutboundOrderDetailDto[]
}

export interface MiscOutboundOrderSearchDto extends PagedAndSortedResultRequestDto {
  orderNo?: string
  status?: MiscOrderStatus
}

const baseUrl = '/api/app/misc-outbound-order'

export async function getList(params: MiscOutboundOrderSearchDto) {
  const res = await request.get<PagedResultDto<MiscOutboundOrderDto>>(baseUrl, { params })
  return res.data
}

export async function get(id: string) {
  const res = await request.get<MiscOutboundOrderDto>(`${baseUrl}/${id}`)
  return res.data
}

export async function create(data: CreateMiscOutboundOrderDto) {
  const res = await request.post<MiscOutboundOrderDto>(baseUrl, data)
  return res.data
}

export async function update(id: string, data: UpdateMiscOutboundOrderDto) {
  const res = await request.put<MiscOutboundOrderDto>(`${baseUrl}/${id}`, data)
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
  remove,
}
