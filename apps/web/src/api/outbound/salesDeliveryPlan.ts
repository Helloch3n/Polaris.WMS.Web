import request from '../../utils/request'

export const SalesDeliveryPlanStatus = {
  PendingAllocation: 10,
  PartiallyAllocated: 20,
  Allocated: 30,
  Executing: 40,
  Completed: 50,
  Cancelled: 60,
} as const

export type SalesDeliveryPlanStatus = typeof SalesDeliveryPlanStatus[keyof typeof SalesDeliveryPlanStatus] | number

export interface SalesDeliveryPlanDetailDto {
  id: string
  salesDeliveryPlanId: string
  lineNo: number
  salesOrderDetailId: string
  salesOrderLineNo: number
  productId: string
  productCode: string
  productName: string
  warehouseId: string
  warehouseCode: string
  warehouseName: string
  unit: string
  plannedQty: number
  unitPrice?: number | null
  lineAmount?: number | null
  orderDescription?: string | null
  technicalVersion?: string | null
  specialRequirements?: string | null
  plannedDeliveryDate?: string | null
  consigneeName?: string | null
  phone?: string | null
  country?: string | null
  province?: string | null
  city?: string | null
  district?: string | null
  address?: string | null
  netWeight?: number | null
  grossWeight?: number | null
  remark?: string | null
}

export interface SalesDeliveryPlanDto {
  id: string
  planNo: string
  planDate: string
  customerId: string
  customerCode: string
  customerName: string
  salesOrderId: string
  salesOrderNo: string
  contractNo?: string | null
  carrierCode?: string | null
  carrierName?: string | null
  totalSalesAmount?: number | null
  status: SalesDeliveryPlanStatus
  sourceStatusCode?: string | null
  sourceUpdatedAt: string
  lastSyncedAt: string
  remark?: string | null
  warehouseCodes: string
  warehouseNames: string
  earliestPlannedDeliveryDate?: string | null
  creationTime: string
  details: SalesDeliveryPlanDetailDto[]
}

export interface SalesDeliveryPlanSearchDto {
  skipCount?: number
  maxResultCount?: number
  sorting?: string
  planNo?: string
  salesOrderNo?: string
  customerKeyword?: string
  warehouseCode?: string
  status?: SalesDeliveryPlanStatus | null
  plannedDeliveryDateFrom?: string
  plannedDeliveryDateTo?: string
}

export interface PagedResultDto<T> {
  totalCount: number
  items: T[]
}

const baseUrl = '/api/app/sales-delivery-plan'

export async function getList(params: SalesDeliveryPlanSearchDto) {
  const res = await request.get<PagedResultDto<SalesDeliveryPlanDto>>(baseUrl, { params })
  return res.data
}

export async function get(id: string) {
  const res = await request.get<SalesDeliveryPlanDto>(`${baseUrl}/${id}`)
  return res.data
}
