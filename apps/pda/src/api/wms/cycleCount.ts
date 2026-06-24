import { http } from '@/utils/http'

export const CycleCountType = {
  Open: 1,  // 明盘
  Blind: 2, // 暗盘
} as const

export type CycleCountType = typeof CycleCountType[keyof typeof CycleCountType]

export const CycleCountOrderStatus = {
  New: 0,
  Counting: 1,
  Completed: 2,
  Voided: 3,
} as const

export type CycleCountOrderStatus = typeof CycleCountOrderStatus[keyof typeof CycleCountOrderStatus]

export interface CycleCountOrderDetailDto {
  id: string
  cycleCountOrderId: string
  locationId: string
  locationCode: string
  containerCode: string
  productId: string
  productCode: string
  productName: string
  systemQty?: number | null // 明盘有值，暗盘无值
  countedQty?: number | null
  differenceQty?: number | null
  isCounted: boolean
}

export interface CycleCountOrderDto {
  id: string
  warehouseId: string
  warehouseCode: string
  warehouseName: string
  orderNo: string
  countType: CycleCountType
  status: CycleCountOrderStatus
  creationTime: string
  details: CycleCountOrderDetailDto[]
}

export interface CycleCountOrderSearchDto {
  skipCount?: number
  maxResultCount?: number
  orderNo?: string
  status?: CycleCountOrderStatus
}

export interface PagedResultDto<T> {
  totalCount: number
  items: T[]
}

export interface SubmitCountResultInput {
  orderId: string
  containerCode: string
  productId: string
  countedQty: number
}

const baseUrl = '/api/app/cycle-count'

export async function getCycleCountList(params: CycleCountOrderSearchDto) {
  const res = await http.get<PagedResultDto<CycleCountOrderDto>>(`${baseUrl}`, { params })
  return res.data
}

export async function getCycleCountDetail(id: string) {
  const res = await http.get<CycleCountOrderDto>(`${baseUrl}/${id}`)
  return res.data
}

export async function submitCountResult(data: SubmitCountResultInput) {
  await http.post<void>(`${baseUrl}/submit-count-result`, data)
}
