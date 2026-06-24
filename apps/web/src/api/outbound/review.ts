import request from '../../utils/request'

export const OutboundReviewStatus = {
  Created: 10,
  Completed: 20,
  Cancelled: 30,
} as const

export type OutboundReviewStatus = typeof OutboundReviewStatus[keyof typeof OutboundReviewStatus] | number

export interface OutboundReviewLineDto {
  id: string
  outboundReviewOrderId: string
  pickListLineId: string
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

export interface OutboundReviewOrderDto {
  id: string
  reviewNo: string
  pickListId: string
  status: OutboundReviewStatus
  remark?: string | null
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

export async function complete(id: string) {
  const res = await request.post<void>(`${baseUrl}/${id}/complete`)
  return res.data
}
