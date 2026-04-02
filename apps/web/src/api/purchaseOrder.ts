import request from '../utils/request'

// NOTE: the project organizes many APIs under api folder. Adjust import path if necessary.

export interface PagedResultDto<T> {
  totalCount: number
  items: T[]
}

export interface PagedAndSortedResultRequestDto {
  maxResultCount?: number
  skipCount?: number
  sorting?: string
}

export interface AuditedEntityDto {
  id: string
  creationTime?: string
  creatorId?: string
  lastModificationTime?: string
  lastModifierId?: string
}

export interface PurchaseOrderDto extends AuditedEntityDto {
  poNo: string
  supplierCode?: string
  supplierName?: string
  orderDate?: string
  status?: number
}

export interface PurchaseOrderSearchDto extends PagedAndSortedResultRequestDto {
  poNo?: string
  supplierName?: string
  status?: number
}

const baseUrl = '/api/app/purchase-order'

export async function getList(params: PurchaseOrderSearchDto) {
  const res = await request.get<PagedResultDto<PurchaseOrderDto>>(baseUrl, { params })
  return res.data
}

export async function get(id: string) {
  const res = await request.get<PurchaseOrderDto>(`${baseUrl}/${id}`)
  return res.data
}

export async function getByPoNo(poNo: string) {
  const res = await request.get<PurchaseOrderDto>(`${baseUrl}/by-po-no/${poNo}`)
  return res.data
}

export default { getList, get, getByPoNo }
