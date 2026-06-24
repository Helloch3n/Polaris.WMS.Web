import request from '../../utils/request'

export interface CustomerDto {
  id: string
  code: string
  name: string
  contactName?: string | null
  phone?: string | null
  address?: string | null
  isEnabled: boolean
  remark?: string | null
  creationTime: string
}

export interface CustomerSearchDto {
  skipCount?: number
  maxResultCount?: number
  sorting?: string
  code?: string
  name?: string
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
