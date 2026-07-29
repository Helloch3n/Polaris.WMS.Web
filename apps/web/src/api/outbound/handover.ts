import request from '../../utils/request'

export const OutboundHandoverStatus = {
  Created: 10,
  InProgress: 15,
  Exception: 18,
  Completed: 20,
  Cancelled: 30,
} as const

export const OutboundHandoverLineStatus = {
  Pending: 10,
  Loaded: 20,
  Exception: 30,
} as const

export type OutboundHandoverStatus = typeof OutboundHandoverStatus[keyof typeof OutboundHandoverStatus] | number

export interface OutboundHandoverSourceDto {
  id: string
  outboundReviewOrderId: string
  outboundReviewOrderNo: string
  isActive: boolean
}

export interface OutboundHandoverLineDto {
  id: string
  outboundHandoverOrderId: string
  outboundReviewOrderId: string
  reviewLineId: string
  salesAllocationOrderId: string
  salesAllocationDetailId: string
  salesAllocationReservationId: string
  inventoryId: string
  productId: string
  productCode: string
  productName: string
  qty: number
  containerId: string
  containerCode: string
  locationId: string
  locationCode: string
  batchNo: string
  sn: string
  handedOverQty: number
  status: number
  handedOverAt?: string | null
  handedOverBy?: string | null
  exceptionType?: string | null
  exceptionRemark?: string | null
}

export interface OutboundHandoverOrderDto {
  id: string
  handoverNo: string
  outboundReviewOrderId: string
  warehouseId: string
  warehouseCode: string
  warehouseName: string
  carrierCode?: string | null
  carrierName?: string | null
  driverName?: string | null
  driverPhone?: string | null
  vehicleNo?: string | null
  logisticsNo?: string | null
  plannedDepartureTime?: string | null
  startedAt?: string | null
  startedBy?: string | null
  completedAt?: string | null
  completedBy?: string | null
  receiverName?: string | null
  status: OutboundHandoverStatus
  remark?: string | null
  totalLineCount: number
  loadedLineCount: number
  exceptionLineCount: number
  creationTime: string
  sources: OutboundHandoverSourceDto[]
  lines: OutboundHandoverLineDto[]
}

export interface CreateOutboundHandoverOrderInput {
  outboundReviewOrderId?: string
  outboundReviewOrderIds?: string[]
  carrierCode?: string | null
  carrierName?: string | null
  driverName?: string | null
  driverPhone?: string | null
  vehicleNo?: string | null
  logisticsNo?: string | null
  plannedDepartureTime?: string | null
  remark?: string | null
}

export type UpdateOutboundHandoverOrderInput = Omit<
  CreateOutboundHandoverOrderInput,
  'outboundReviewOrderId' | 'outboundReviewOrderIds'
>

export interface OutboundHandoverOrderSearchDto {
  skipCount?: number
  maxResultCount?: number
  sorting?: string
  handoverNo?: string
  reviewNo?: string
  warehouseId?: string
  carrierName?: string
  vehicleNo?: string
  status?: OutboundHandoverStatus | null
  outboundReviewOrderId?: string
}

export interface PagedResultDto<T> {
  totalCount: number
  items: T[]
}

const baseUrl = '/api/app/outbound-handover-order'

export async function getList(params: OutboundHandoverOrderSearchDto) {
  const res = await request.get<PagedResultDto<OutboundHandoverOrderDto>>(baseUrl, { params })
  return res.data
}

export async function get(id: string) {
  const res = await request.get<OutboundHandoverOrderDto>(`${baseUrl}/${id}`)
  return res.data
}

export async function create(data: CreateOutboundHandoverOrderInput) {
  const res = await request.post<OutboundHandoverOrderDto>(baseUrl, data)
  return res.data
}

export async function update(id: string, data: UpdateOutboundHandoverOrderInput) {
  const res = await request.put<OutboundHandoverOrderDto>(`${baseUrl}/${id}`, data)
  return res.data
}

export async function start(id: string) {
  const res = await request.post<OutboundHandoverOrderDto>(`${baseUrl}/${id}/start`)
  return res.data
}

export async function scan(id: string, code: string) {
  const res = await request.post<OutboundHandoverOrderDto>(`${baseUrl}/${id}/scan`, { code })
  return res.data
}

export async function markException(
  id: string,
  data: { lineId: string; exceptionType: string; remark: string },
) {
  const res = await request.post<OutboundHandoverOrderDto>(`${baseUrl}/${id}/mark-exception`, data)
  return res.data
}

export async function complete(id: string, receiverName?: string | null) {
  const res = await request.post<void>(`${baseUrl}/${id}/complete`, { receiverName })
  return res.data
}

export async function cancel(id: string) {
  const res = await request.post<void>(`${baseUrl}/${id}/cancel`)
  return res.data
}
