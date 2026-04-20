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

export interface AccountAliasSearchDto extends PagedAndSortedResultRequestDto {
  alias?: string
  description?: string
  isActiveAtNow?: boolean
}

export interface AccountAliasDto {
  id: string
  alias: string
  description: string
  effectiveDate: string
  expireDate?: string | null
  isUnitPriceRequired: boolean
  isProjectRequired: boolean
  isDepartmentRequired: boolean
  isProductionNoRequired: boolean
  isWorkOrderOperationRequired: boolean
  productionCostType: ProductionCostType | keyof typeof ProductionCostType | string | number
  isSupplierRequired: boolean
  isCustomerRequired: boolean
  isWorkOrderAttributeRequired: boolean
  creationTime?: string
  creatorId?: string
  lastModificationTime?: string
  lastModifierId?: string
}

export const ProductionCostType = {
  None: 0,
  Material: 1,
  Labor: 2,
  ManufacturingOverhead: 3,
  Subcontracting: 4,
} as const

export type ProductionCostType = (typeof ProductionCostType)[keyof typeof ProductionCostType]

const baseUrl = '/api/app/account-alias'

export async function getList(params: AccountAliasSearchDto) {
  const res = await request.get<PagedResultDto<AccountAliasDto>>(baseUrl, { params })
  return res.data
}

export async function get(id: string) {
  const res = await request.get<AccountAliasDto>(`${baseUrl}/${id}`)
  return res.data
}
