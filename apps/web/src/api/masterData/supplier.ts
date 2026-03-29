import request from '../../utils/request'

/** ABP 甯哥敤鍒嗛〉结果 */
export interface PagedResultDto<T> {
  totalCount: number
  items: T[]
}

/** ABP 常用列表查 */
export interface PagedAndSortedResultRequestDto {
  maxResultCount?: number
  skipCount?: number
  sorting?: string
}

export interface SupplierDto {
  code: string
  name: string
  contactPerson: string
  mobile: string
  email: string
  address: string
}

export interface CreateUpdateSupplierDto {
  code: string
  name: string
  contactPerson: string
  mobile: string
  email: string
  address: string
}

export interface GetSupplierListParams extends PagedAndSortedResultRequestDto {
  maxResultCount?: number
  skipCount?: number
  sorting?: string
  supplierCode?: string
  supplierName?: string
}

const baseUrl = '/api/app/supplier'

export async function getList(params: GetSupplierListParams) {
  const res = await request.get<PagedResultDto<SupplierDto>>(baseUrl, { params })
  return res.data
}

export async function get(id: string) {
  const res = await request.get<SupplierDto>(`${baseUrl}/${id}`)
  return res.data
}

export async function create(data: CreateUpdateSupplierDto) {
  const res = await request.post<SupplierDto>(baseUrl, data)
  return res.data
}

export async function update(id: string, data: CreateUpdateSupplierDto) {
  const res = await request.put<SupplierDto>(`${baseUrl}/${id}`, data)
  return res.data
}

export async function remove(id: string) {
  const res = await request.delete<void>(`${baseUrl}/${id}`)
  return res.data
}