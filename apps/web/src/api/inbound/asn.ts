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

export const AsnStatus = {
  Pending: 10,
  Receiving: 20,
  Completed: 30,
} as const

export type AsnStatus = (typeof AsnStatus)[keyof typeof AsnStatus] | string

export interface AsnDetailDto {
  id: string
  asnId: string
  scmAsnRowNo?: string
  sourcePoNo?: string
  sourcePoLineNo?: number
  productId: string
  productCode?: string
  productName?: string
  supplierBatchNo?: string
  licensePlate?: string
  uom?: string
  expectedQty?: number
  receivedQty?: number
}

export interface AsnDto extends AuditedEntityDto {
  asnNo: string
  supplierId?: string
  supplierCode?: string
  supplierName?: string
  status?: AsnStatus
  expectedArrivalTime?: string
  licensePlate?: string
  details?: AsnDetailDto[]
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
