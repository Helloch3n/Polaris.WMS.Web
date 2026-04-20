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

export interface CostCenterSearchDto extends PagedAndSortedResultRequestDto {
  code?: string
  name?: string
  departmentCode?: string
  departmentName?: string
  companyCode?: string
}

export interface CostCenterDto {
  id: string
  code: string
  name: string
  departmentCode: string
  departmentName: string
  companyCode: string
  creationTime?: string
  creatorId?: string
  lastModificationTime?: string
  lastModifierId?: string
}

const baseUrl = '/api/app/cost-center'

export async function getList(params: CostCenterSearchDto) {
  const res = await request.get<PagedResultDto<CostCenterDto>>(baseUrl, { params })
  return res.data
}

export async function get(id: string) {
  const res = await request.get<CostCenterDto>(`${baseUrl}/${id}`)
  return res.data
}
