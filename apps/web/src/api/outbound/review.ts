import request from '../../utils/request'

export const OutboundReviewStatus = {
  Created: 10,
  Reviewing: 15,
  Exception: 18,
  Completed: 20,
  Cancelled: 30,
} as const

export const OutboundReviewLineStatus = {
  Pending: 10,
  Passed: 20,
  Exception: 30,
} as const

export type OutboundReviewStatus = typeof OutboundReviewStatus[keyof typeof OutboundReviewStatus] | number

export interface OutboundReviewLineDto {
  id: string
  outboundReviewOrderId: string
  pickListLineId: string
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
  reviewedQty: number
  status: number
  reviewedAt?: string | null
  reviewedBy?: string | null
  exceptionType?: string | null
  exceptionRemark?: string | null
}

export interface OutboundReviewOrderDto {
  id: string
  reviewNo: string
  pickListId: string
  pickListNo: string
  waveOrderId: string
  waveOrderNo: string
  warehouseId: string
  warehouseCode: string
  warehouseName: string
  targetLocationId: string
  targetLocationCode: string
  status: OutboundReviewStatus
  startedAt?: string | null
  startedBy?: string | null
  completedAt?: string | null
  completedBy?: string | null
  remark?: string | null
  totalLineCount: number
  reviewedLineCount: number
  exceptionLineCount: number
  creationTime: string
  lines: OutboundReviewLineDto[]
}

export interface CreateOutboundReviewOrderInput {
  pickListId: string
  remark?: string | null
}

export interface OutboundReviewOrderSearchDto {
  skipCount?: number
  maxResultCount?: number
  sorting?: string
  reviewNo?: string
  pickListNo?: string
  waveOrderNo?: string
  warehouseId?: string
  status?: OutboundReviewStatus | null
  pickListId?: string
}

export interface PagedResultDto<T> {
  totalCount: number
  items: T[]
}

const baseUrl = '/api/app/outbound-review-order'

export async function getList(params: OutboundReviewOrderSearchDto) {
  const res = await request.get<PagedResultDto<OutboundReviewOrderDto>>(baseUrl, { params })
  return res.data
}

export async function get(id: string) {
  const res = await request.get<OutboundReviewOrderDto>(`${baseUrl}/${id}`)
  return res.data
}

export async function create(data: CreateOutboundReviewOrderInput) {
  const res = await request.post<OutboundReviewOrderDto>(baseUrl, data)
  return res.data
}

export async function start(id: string) {
  const res = await request.post<OutboundReviewOrderDto>(`${baseUrl}/${id}/start`)
  return res.data
}

export async function scan(id: string, code: string) {
  const res = await request.post<OutboundReviewOrderDto>(`${baseUrl}/${id}/scan`, { code })
  return res.data
}

export async function markException(
  id: string,
  data: { lineId: string; exceptionType: string; remark: string },
) {
  const res = await request.post<OutboundReviewOrderDto>(`${baseUrl}/${id}/mark-exception`, data)
  return res.data
}

export async function complete(id: string) {
  const res = await request.post<void>(`${baseUrl}/${id}/complete`)
  return res.data
}

export async function reopen(id: string) {
  const res = await request.post<void>(`${baseUrl}/${id}/reopen`)
  return res.data
}

export async function cancel(id: string) {
  const res = await request.post<void>(`${baseUrl}/${id}/cancel`)
  return res.data
}
