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

export interface DataSyncTaskDto {
  id: string
  taskCode: string
  taskName: string
  cronExpression: string
  isEnabled: boolean
  lastSyncTime?: string | null
  lastSyncStatus?: number | string
  lastSyncMessage?: string | null
}

export interface CreateUpdateDataSyncTaskDto {
  taskCode: string
  taskName: string
  cronExpression: string
  isEnabled: boolean
}

export interface GetDataSyncTaskListParams extends PagedAndSortedResultRequestDto {
  filter?: string
}

const baseUrl = '/api/app/data-sync-task'

export async function getList(params: GetDataSyncTaskListParams) {
  const res = await request.get<PagedResultDto<DataSyncTaskDto>>(baseUrl, { params })
  return res.data
}

export async function create(data: CreateUpdateDataSyncTaskDto) {
  const res = await request.post<DataSyncTaskDto>(baseUrl, data)
  return res.data
}

export async function update(id: string, data: CreateUpdateDataSyncTaskDto) {
  const res = await request.put<DataSyncTaskDto>(`${baseUrl}/${id}`, data)
  return res.data
}

export async function remove(id: string) {
  const res = await request.delete<void>(`${baseUrl}/${id}`)
  return res.data
}

export async function trigger(id: string) {
  const res = await request.post<void>(`${baseUrl}/${id}/trigger`)
  return res.data
}

export async function toggleEnable(id: string, isEnabled: boolean) {
  const res = await request.put<void>(`${baseUrl}/${id}/toggle-enable`, { isEnabled })
  return res.data
}