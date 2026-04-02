import request from '../../utils/request'

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

export interface AsnDto extends AuditedEntityDto {
  asnNo: string
  supplierCode?: string
  supplierName?: string
  status?: number
  licensePlate?: string
}

export interface AsnSearchDto extends PagedAndSortedResultRequestDto {
  asnNo?: string
  supplierName?: string
  status?: number
  licensePlate?: string
}

const baseUrl = '/api/app/asn'

export async function getList(params: AsnSearchDto) {
  const res = await request.get<PagedResultDto<AsnDto>>(baseUrl, { params })
  return res.data
}

export async function get(id: string) {
  const res = await request.get<AsnDto>(`${baseUrl}/${id}`)
  return res.data
}

export async function getByAsnNo(asnNo: string) {
  const res = await request.get<AsnDto>(`${baseUrl}/by-asn-no/${asnNo}`)
  return res.data
}

export default { getList, get, getByAsnNo }
