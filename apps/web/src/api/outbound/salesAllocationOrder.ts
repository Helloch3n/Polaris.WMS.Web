import request from '../../utils/request'

export const SalesAllocationOrderStatus = {
  PendingAllocation: 10,
  PartiallyAllocated: 20,
  Allocated: 30,
  Confirmed: 40,
  Executing: 50,
  Completed: 60,
  Cancelled: 90,
} as const

export type SalesAllocationOrderStatus = typeof SalesAllocationOrderStatus[keyof typeof SalesAllocationOrderStatus] | number

export interface SalesAllocationReservationDto {
  id: string
  salesAllocationOrderId: string
  salesAllocationDetailId: string
  inventoryId: string
  inventoryAllocationId?: string | null
  isDedicated: boolean
  qty: number
  containerId: string
  containerCode: string
  sourceLocationId: string
  sourceLocationCode: string
  batchNo: string
  sn: string
  fifoDate: string
  status: number
}

export interface SalesAllocationDetailDto {
  id: string
  salesAllocationOrderId: string
  salesDeliveryPlanDetailId: string
  lineNo: number
  salesOrderDetailId: string
  salesOrderLineNo: number
  productId: string
  productCode: string
  productName: string
  unit: string
  plannedQty: number
  allocatedQty: number
  differenceQty: number
  remark?: string | null
  reservations: SalesAllocationReservationDto[]
}

export interface SalesAllocationOrderDto {
  id: string
  allocationNo: string
  salesDeliveryPlanId: string
  salesDeliveryPlanNo: string
  customerId: string
  customerCode: string
  customerName: string
  salesOrderId: string
  salesOrderNo: string
  warehouseId: string
  warehouseCode: string
  warehouseName: string
  status: SalesAllocationOrderStatus
  plannedQty: number
  allocatedQty: number
  remark?: string | null
  creationTime: string
  details: SalesAllocationDetailDto[]
}

export interface AvailableInventoryDto {
  inventoryId: string
  inventoryAllocationId?: string | null
  isDedicated: boolean
  relationshipAvailableQuantity: number
  availableQuantity: number
  productId: string
  batchNo: string
  sn: string
  unit: string
  fifoDate: string
  containerId: string
  containerCode: string
  locationId: string
  locationCode: string
}

const baseUrl = '/api/app/sales-allocation-order'

export async function getList(params: Record<string, unknown>) {
  const res = await request.get<{ totalCount: number; items: SalesAllocationOrderDto[] }>(baseUrl, { params })
  return res.data
}

export async function get(id: string) {
  const res = await request.get<SalesAllocationOrderDto>(`${baseUrl}/${id}`)
  return res.data
}

export async function createFromPlan(data: { salesDeliveryPlanId: string; warehouseId: string; remark?: string }) {
  const res = await request.post<SalesAllocationOrderDto>(`${baseUrl}/from-plan`, data)
  return res.data
}

export async function getAvailableInventory(id: string, detailId: string, code?: string) {
  const res = await request.get<AvailableInventoryDto[]>(`${baseUrl}/${id}/available-inventory/${detailId}`, {
    params: { code: code || undefined },
  })
  return res.data
}

export async function updateAllocations(
  id: string,
  data: { details: Array<{ detailId: string; allocations: Array<{ inventoryId: string; inventoryAllocationId?: string | null; qty: number }> }> },
) {
  const res = await request.put<SalesAllocationOrderDto>(`${baseUrl}/${id}/allocations`, data)
  return res.data
}

export async function remove(id: string) {
  await request.delete(`${baseUrl}/${id}`)
}

export async function confirm(id: string) {
  const res = await request.post<SalesAllocationOrderDto>(`${baseUrl}/${id}/confirm`)
  return res.data
}

export async function revokeConfirmation(id: string) {
  const res = await request.post<SalesAllocationOrderDto>(`${baseUrl}/${id}/revoke-confirmation`)
  return res.data
}
