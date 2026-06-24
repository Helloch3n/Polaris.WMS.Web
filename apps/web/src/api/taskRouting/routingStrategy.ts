import request from '../../utils/request'
import { MoveTaskType } from './moveTask'

export interface RoutingStrategyDto {
  id: string
  ruleName: string
  priority: number
  taskType: MoveTaskType
  isActive: boolean
  sourceZoneId?: string
  productCategoryId?: string
  productId?: string
  targetZoneId: string
  creationTime?: string
  creatorId?: string
}

export interface CreateRoutingStrategyDto {
  ruleName: string
  priority: number
  taskType: MoveTaskType
  isActive: boolean
  sourceZoneId?: string
  productCategoryId?: string
  productId?: string
  targetZoneId: string
}

export interface UpdateRoutingStrategyDto {
  ruleName: string
  priority: number
  taskType: MoveTaskType
  isActive: boolean
  sourceZoneId?: string
  productCategoryId?: string
  productId?: string
  targetZoneId: string
}

export interface RoutingStrategySearchDto {
  skipCount?: number
  maxResultCount?: number
  sorting?: string
  filter?: string
  taskType?: MoveTaskType
  isActive?: boolean
}

export interface PagedResultDto<T> {
  totalCount?: number
  items?: T[]
}

const baseUrl = '/api/app/routing-strategy'

export async function getList(params: RoutingStrategySearchDto) {
  const res = await request.get<PagedResultDto<RoutingStrategyDto>>(baseUrl, { params })
  return res.data
}

export async function get(id: string) {
  const res = await request.get<RoutingStrategyDto>(`${baseUrl}/${id}`)
  return res.data
}

export async function create(data: CreateRoutingStrategyDto) {
  const res = await request.post<RoutingStrategyDto>(baseUrl, data)
  return res.data
}

export async function update(id: string, data: UpdateRoutingStrategyDto) {
  const res = await request.put<RoutingStrategyDto>(`${baseUrl}/${id}`, data)
  return res.data
}

export async function remove(id: string) {
  const res = await request.delete<void>(`${baseUrl}/${id}`)
  return res.data
}

export default {
  getList,
  get,
  create,
  update,
  remove,
}
