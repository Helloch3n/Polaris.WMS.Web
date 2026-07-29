import request from '../../utils/request'

export const SalesOrderStatus = {
  Open: 10,
  PartiallyShipped: 20,
  Completed: 30,
  Cancelled: 40,
} as const

export type SalesOrderStatus = typeof SalesOrderStatus[keyof typeof SalesOrderStatus] | number

export interface SalesOrderDetailDto {
  id: string
  salesOrderId: string
  lineNo: number
  productId: string
  productCode: string
  productName: string
  unit: string
  qty: number
  allocatedQty: number
  plannedShipmentQty: number
  shippedQty: number
  availableToShipQty: number
  remark?: string | null
}

export interface SalesOrderDto {
  id: string
  orderNo: string
  customerId: string
  customerCode: string
  customerName: string
  status: SalesOrderStatus
  orderDate: string
  expectedDeliveryTime?: string | null
  remark?: string | null
  creationTime: string
  details: SalesOrderDetailDto[]
}

export interface CreateSalesOrderDetailInput {
  lineNo: number
  productId: string
  productCode: string
  productName: string
  unit: string
  qty: number
  remark?: string | null
}

export interface CreateSalesOrderInput {
  orderNo: string
  customerId: string
  orderDate: string
  expectedDeliveryTime?: string | null
  remark?: string | null
  details: CreateSalesOrderDetailInput[]
}

export interface UpdateSalesOrderInput {
  customerId: string
  orderDate: string
  expectedDeliveryTime?: string | null
  remark?: string | null
  details: CreateSalesOrderDetailInput[]
}

export interface SalesOrderSearchDto {
  skipCount?: number
  maxResultCount?: number
  sorting?: string
  orderNo?: string
  customerCode?: string
  status?: SalesOrderStatus | null
}

export interface PagedResultDto<T> {
  totalCount: number
  items: T[]
}

const baseUrl = '/api/app/sales-order'

export async function getList(params: SalesOrderSearchDto) {
  const res = await request.get<PagedResultDto<SalesOrderDto>>(baseUrl, { params })
  return res.data
}

export async function get(id: string) {
  const res = await request.get<SalesOrderDto>(`${baseUrl}/${id}`)
  return res.data
}

export async function create(data: CreateSalesOrderInput) {
  const res = await request.post<SalesOrderDto>(baseUrl, data)
  return res.data
}

export async function update(id: string, data: UpdateSalesOrderInput) {
  const res = await request.put<SalesOrderDto>(`${baseUrl}/${id}`, data)
  return res.data
}

export async function deleteOrder(id: string) {
  const res = await request.delete<void>(`${baseUrl}/${id}`)
  return res.data
}
