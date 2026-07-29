import { http } from '@/utils/http'

export const HandoverStatus = {
  Created: 10,
  InProgress: 15,
  Exception: 18,
  Completed: 20,
  Cancelled: 30,
} as const

export const HandoverLineStatus = {
  Pending: 10,
  Loaded: 20,
  Exception: 30,
} as const

export interface HandoverLineDto {
  id: string
  inventoryId: string
  productCode: string
  productName: string
  qty: number
  containerCode: string
  locationCode: string
  batchNo: string
  sn: string
  handedOverQty: number
  status: number
  exceptionType?: string | null
  exceptionRemark?: string | null
}

export interface HandoverSourceDto {
  id: string
  outboundReviewOrderNo: string
  isActive: boolean
}

export interface HandoverOrderDto {
  id: string
  handoverNo: string
  warehouseCode: string
  warehouseName: string
  carrierName?: string | null
  driverName?: string | null
  vehicleNo?: string | null
  status: number
  totalLineCount: number
  loadedLineCount: number
  exceptionLineCount: number
  creationTime: string
  sources: HandoverSourceDto[]
  lines: HandoverLineDto[]
}

export async function getHandoverList(params: {
  skipCount?: number
  maxResultCount?: number
  status?: number
}) {
  const response = await http.get<{ totalCount: number; items: HandoverOrderDto[] }>(
    '/api/app/outbound-handover-order',
    { params },
  )
  return response.data
}

export async function getHandover(id: string) {
  const response = await http.get<HandoverOrderDto>(`/api/app/outbound-handover-order/${id}`)
  return response.data
}

export async function startHandover(id: string) {
  const response = await http.post<HandoverOrderDto>(`/api/app/outbound-handover-order/${id}/start`)
  return response.data
}

export async function scanHandover(id: string, code: string) {
  const response = await http.post<HandoverOrderDto>(`/api/app/outbound-handover-order/${id}/scan`, { code })
  return response.data
}

export async function markHandoverException(
  id: string,
  input: { lineId: string; exceptionType: string; remark: string },
) {
  const response = await http.post<HandoverOrderDto>(
    `/api/app/outbound-handover-order/${id}/mark-exception`,
    input,
  )
  return response.data
}

export async function completeHandover(id: string, receiverName?: string) {
  await http.post(`/api/app/outbound-handover-order/${id}/complete`, {
    receiverName: receiverName || null,
  })
}
