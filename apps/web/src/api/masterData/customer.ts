import request from '../../utils/request'

export interface CustomerDto {
  id: string
  code: string
  name: string
  shortName?: string | null
  customerType?: string | null
  taxpayerNumber?: string | null
  isInsideCompany: boolean
  insideCompanyCode?: string | null
  insideCompanyName?: string | null
  legalRepresentative?: string | null
  contactName?: string | null
  phone?: string | null
  fax?: string | null
  email?: string | null
  address?: string | null
  isEnabled: boolean
  remark?: string | null
  creationTime: string
}

export interface CreateUpdateCustomerDto {
  code: string
  name: string
  shortName?: string | null
  customerType?: string | null
  taxpayerNumber?: string | null
  isInsideCompany: boolean
  insideCompanyCode?: string | null
  insideCompanyName?: string | null
  legalRepresentative?: string | null
  contactName?: string | null
  phone?: string | null
  fax?: string | null
  email?: string | null
  address?: string | null
  isEnabled: boolean
  remark?: string | null
}

export interface CustomerSearchDto {
  skipCount?: number
  maxResultCount?: number
  sorting?: string
  code?: string
  name?: string
  customerType?: string
  isInsideCompany?: boolean
  isEnabled?: boolean
}

export interface PagedResultDto<T> {
  totalCount: number
  items: T[]
}

const baseUrl = '/api/app/customer'

export async function getList(params: CustomerSearchDto) {
  const res = await request.get<PagedResultDto<CustomerDto>>(baseUrl, { params })
  return res.data
}

export async function get(id: string) {
  const res = await request.get<CustomerDto>(`${baseUrl}/${id}`)
  return res.data
}

export async function create(data: CreateUpdateCustomerDto) {
  const res = await request.post<CustomerDto>(baseUrl, data)
  return res.data
}

export async function update(id: string, data: CreateUpdateCustomerDto) {
  const res = await request.put<CustomerDto>(`${baseUrl}/${id}`, data)
  return res.data
}

export async function remove(id: string) {
  const res = await request.delete<void>(`${baseUrl}/${id}`)
  return res.data
}
