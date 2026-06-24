import { http } from '@/utils/http'

export const MiscOperationType = {
  Inbound: 1,
  Outbound: 2,
} as const

export type MiscOperationType = typeof MiscOperationType[keyof typeof MiscOperationType]

export const MiscOrderStatus = {
  Draft: 0,
  Executed: 1,
} as const

export type MiscOrderStatus = typeof MiscOrderStatus[keyof typeof MiscOrderStatus]

export interface MiscInboundOrderDetailDto {
  id: string
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

export interface MiscInboundOrderDto {
  id: string
  orderNo: string
  accountAliasId: string
  accountAliasDescription: string
  costCenterId: string
  costCenterCode: string
  costCenterName: string
  type: MiscOperationType
  status: MiscOrderStatus
  remark?: string | null
  creationTime: string
  details: MiscInboundOrderDetailDto[]
}

export interface MiscInboundOrderSearchDto {
  skipCount?: number
  maxResultCount?: number
  orderNo?: string
  status?: MiscOrderStatus
}

export interface PagedResultDto<T> {
  totalCount: number
  items: T[]
}

export interface CreateUpdateMiscInboundOrderDetailDto {
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

export interface UpdateMiscInboundOrderDto {
  accountAliasId: string
  accountAliasDescription: string
  costCenterId: string
  costCenterCode: string
  costCenterName: string
  remark?: string | null
  details: CreateUpdateMiscInboundOrderDetailDto[]
}

const baseUrl = '/api/app/misc-inbound-order'

export async function getMiscInboundList(params: MiscInboundOrderSearchDto) {
  const res = await http.get<PagedResultDto<MiscInboundOrderDto>>(baseUrl, { params })
  return res.data
}

export async function getMiscInboundDetail(id: string) {
  const res = await http.get<MiscInboundOrderDto>(`${baseUrl}/${id}`)
  return res.data
}

export async function updateMiscInbound(id: string, data: UpdateMiscInboundOrderDto) {
  const res = await http.put<MiscInboundOrderDto>(`${baseUrl}/${id}`, data)
  return res.data
}

export async function approveAndExecuteMiscInbound(id: string) {
  const res = await http.post<void>(`${baseUrl}/${id}/approve-and-execute`)
  return res.data
}
