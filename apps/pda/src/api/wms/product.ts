import { http } from '@/utils/http'

export interface ProductDto {
  id: string
  code: string
  name: string
  unit: string
  isBatchManagementEnabled: boolean
}

export interface PagedResultDto<T> {
  totalCount: number
  items: T[]
}

export interface GetProductListParams {
  maxResultCount?: number
  skipCount?: number
  filter?: string
  productCode?: string
  productName?: string
}

export async function getProductList(params: GetProductListParams): Promise<PagedResultDto<ProductDto>> {
  const res = await http.get<PagedResultDto<ProductDto>>('/api/app/product', { params })
  return res.data
}
