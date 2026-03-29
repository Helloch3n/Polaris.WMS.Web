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

export interface ProductDto {
  id?: string
  code: string
  name: string
  unit: string
  auxUnit: string
  conversionRate: number
  isBatchManagementEnabled: boolean
  shelfLifeDays?: number | null
}

export interface CreateUpdateProductDto {
  code: string
  name: string
  unit: string
  auxUnit: string
  conversionRate: number
  isBatchManagementEnabled: boolean
  shelfLifeDays?: number | null
}

export interface GetProductListParams extends PagedAndSortedResultRequestDto {
  filter?: string
  productCode?: string
  productName?: string
}

const baseUrl = '/api/app/product'

export async function getProductList(params: GetProductListParams) {
  const res = await request.get<PagedResultDto<ProductDto>>(baseUrl, { params })
  return res.data
}

export async function getProduct(id: string) {
  const res = await request.get<ProductDto>(`${baseUrl}/${id}`)
  return res.data
}

export async function createProduct(data: CreateUpdateProductDto) {
  const res = await request.post<ProductDto>(baseUrl, data)
  return res.data
}

export async function updateProduct(id: string, data: CreateUpdateProductDto) {
  const res = await request.put<ProductDto>(`${baseUrl}/${id}`, data)
  return res.data
}

export async function deleteProduct(id: string) {
  const res = await request.delete<void>(`${baseUrl}/${id}`)
  return res.data
}