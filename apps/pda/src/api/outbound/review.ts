import { http } from '@/utils/http'

export const ReviewStatus = {
  Created: 10,
  Reviewing: 15,
  Exception: 18,
  Completed: 20,
  Cancelled: 30,
} as const

export const ReviewLineStatus = {
  Pending: 10,
  Passed: 20,
  Exception: 30,
} as const

export interface ReviewLineDto {
  id: string
  inventoryId: string
  productCode: string
  productName: string
  qty: number
  containerCode: string
  locationCode: string
  batchNo: string
  sn: string
  reviewedQty: number
  status: number
  exceptionType?: string | null
  exceptionRemark?: string | null
}

export interface ReviewOrderDto {
  id: string
  reviewNo: string
  pickListNo: string
  waveOrderNo: string
  warehouseCode: string
  warehouseName: string
  targetLocationCode: string
  status: number
  totalLineCount: number
  reviewedLineCount: number
  exceptionLineCount: number
  creationTime: string
  lines: ReviewLineDto[]
}

export async function getReviewList(params: {
  skipCount?: number
  maxResultCount?: number
  status?: number
}) {
  const response = await http.get<{ totalCount: number; items: ReviewOrderDto[] }>(
    '/api/app/outbound-review-order',
    { params },
  )
  return response.data
}

export async function getReview(id: string) {
  const response = await http.get<ReviewOrderDto>(`/api/app/outbound-review-order/${id}`)
  return response.data
}

export async function startReview(id: string) {
  const response = await http.post<ReviewOrderDto>(`/api/app/outbound-review-order/${id}/start`)
  return response.data
}

export async function scanReview(id: string, code: string) {
  const response = await http.post<ReviewOrderDto>(`/api/app/outbound-review-order/${id}/scan`, { code })
  return response.data
}

export async function markReviewException(
  id: string,
  input: { lineId: string; exceptionType: string; remark: string },
) {
  const response = await http.post<ReviewOrderDto>(
    `/api/app/outbound-review-order/${id}/mark-exception`,
    input,
  )
  return response.data
}

export async function completeReview(id: string) {
  await http.post(`/api/app/outbound-review-order/${id}/complete`)
}
