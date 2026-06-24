import request from '../../utils/request'

export const OutboundHandoverStatus = {
  Created: 10,
  Completed: 20,
  Cancelled: 30,
} as const

export type OutboundHandoverStatus = typeof OutboundHandoverStatus[keyof typeof OutboundHandoverStatus] | number

export interface OutboundHandoverLineDto {
  id: string
  outboundHandoverOrderId: string
  reviewLineId: string
  salesShipmentId: string
  salesShipmentDetailId: string
  salesShipmentAllocationId: string
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
}

export interface OutboundHandoverOrderDto {
  id: string
  handoverNo: string
  outboundReviewOrderId: string
  status: OutboundHandoverStatus
  remark?: string | null
  creationTime: string
  lines: OutboundHandoverLineDto[]
}

export interface CreateOutboundHandoverOrderInput {
  outboundReviewOrderId: string
  remark?: string | null
}

export interface OutboundHandoverOrderSearchDto {
  skipCount?: number
  maxResultCount?: number
  sorting?: string
  handoverNo?: string
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

export async function complete(id: string) {
  const res = await request.post<void>(`${baseUrl}/${id}/complete`)
  return res.data
}
