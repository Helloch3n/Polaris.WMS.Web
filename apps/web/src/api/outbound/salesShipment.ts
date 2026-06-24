import request from '../../utils/request'

export const OutboundOrderStatus = {
  Created: 0,
  PartiallyAllocated: 1,
  Allocated: 2,
  Picking: 3,
  Shipped: 4,
  Completed: 5,
} as const

export type OutboundOrderStatus = typeof OutboundOrderStatus[keyof typeof OutboundOrderStatus] | number

export const SalesShipmentAllocationStatus = {
  Reserved: 10,
  TaskCreated: 20,
  Picked: 30,
  Released: 40,
  Issued: 50,
} as const

export type SalesShipmentAllocationStatus = typeof SalesShipmentAllocationStatus[keyof typeof SalesShipmentAllocationStatus] | number

export interface SalesShipmentAllocationDto {
  id: string
  salesShipmentId: string
  salesShipmentDetailId: string
  productId: string
  productCode: string
  productName: string
  qty: number
  containerId: string
  containerCode: string
  sourceLocationId: string
  sourceLocationCode: string
  batchNo: string
  sn: string
  status: SalesShipmentAllocationStatus
  creationTime: string
}

export interface SalesShipmentRecordDto {
  id: string
  salesShipmentId: string
  salesShipmentDetailId: string
  sourceSalesOrderLineId?: string | null
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

export interface SalesShipmentDetailDto {
  id: string
  salesShipmentId: string
  sourceSalesOrderLineId?: string | null
  lineNo: number
  productId: string
  productCode: string
  productName: string
  unit: string
  requiredQty: number
  allocatedQty: number
  pickedQty: number
  shippedQty: number
  remark?: string | null
  allocations: SalesShipmentAllocationDto[]
  records: SalesShipmentRecordDto[]
}

export interface SalesShipmentDto {
  id: string
  shipmentNo: string
  sourceSalesOrderId?: string | null
  sourceSalesOrderNo?: string | null
  customerId: string
  customerCode: string
  customerName: string
  status: OutboundOrderStatus
  deliveryContactName?: string | null
  deliveryPhone?: string | null
  deliveryAddress?: string | null
  remark?: string | null
  creationTime: string
  details: SalesShipmentDetailDto[]
}

export interface CreateSalesShipmentDetailInput {
  sourceSalesOrderLineId?: string | null
  lineNo: number
  productId: string
  productCode: string
  productName: string
  unit: string
  requiredQty: number
  remark?: string | null
}

export interface CreateSalesShipmentInput {
  shipmentNo: string
  sourceSalesOrderId?: string | null
  sourceSalesOrderNo?: string | null
  customerId: string
  deliveryContactName?: string | null
  deliveryPhone?: string | null
  deliveryAddress?: string | null
  remark?: string | null
  details: CreateSalesShipmentDetailInput[]
}

export interface UpdateSalesShipmentInput {
  customerId: string
  deliveryContactName?: string | null
  deliveryPhone?: string | null
  deliveryAddress?: string | null
  remark?: string | null
  details: CreateSalesShipmentDetailInput[]
}

export interface CreateSalesShipmentAllocationInput {
  salesShipmentId: string
  detailId: string
  qty: number
  containerCode: string
  locationCode: string
  batchNo: string
  sn: string
}

export interface AddSalesShipmentRecordInput {
  qty: number
  containerCode: string
  locationCode: string
  batchNo: string
  sn: string
}

export interface AddSalesShipmentRecordsInput {
  salesShipmentId: string
  detailId: string
  records: AddSalesShipmentRecordInput[]
}

export interface SalesShipmentSearchDto {
  skipCount?: number
  maxResultCount?: number
  sorting?: string
  shipmentNo?: string
  customerCode?: string
  status?: OutboundOrderStatus | null
}

export interface PagedResultDto<T> {
  totalCount: number
  items: T[]
}

const baseUrl = '/api/app/sales-shipment'

export async function getList(params: SalesShipmentSearchDto) {
  const res = await request.get<PagedResultDto<SalesShipmentDto>>(baseUrl, { params })
  return res.data
}

export async function get(id: string) {
  const res = await request.get<SalesShipmentDto>(`${baseUrl}/${id}`)
  return res.data
}

export async function create(data: CreateSalesShipmentInput) {
  const res = await request.post<SalesShipmentDto>(baseUrl, data)
  return res.data
}

export async function update(id: string, data: UpdateSalesShipmentInput) {
  const res = await request.put<SalesShipmentDto>(`${baseUrl}/${id}`, data)
  return res.data
}

export async function deleteShipment(id: string) {
  const res = await request.delete<void>(`${baseUrl}/${id}`)
  return res.data
}

export async function addAllocation(data: CreateSalesShipmentAllocationInput) {
  const res = await request.post<SalesShipmentAllocationDto>(`${baseUrl}/allocation`, data)
  return res.data
}

export async function removeAllocation(salesShipmentId: string, detailId: string, allocationId: string) {
  const res = await request.delete<void>(`${baseUrl}/allocation`, {
    params: { salesShipmentId, detailId, allocationId },
  })
  return res.data
}

export async function addRecords(data: AddSalesShipmentRecordsInput) {
  const res = await request.post<SalesShipmentRecordDto>(`${baseUrl}/records`, data)
  return res.data
}

export async function approveAndExecute(id: string) {
  const res = await request.post<void>(`${baseUrl}/${id}/approve-and-execute`)
  return res.data
}
