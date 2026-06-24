import { http } from '@/utils/http'

export const PutawayTaskStatus = {
  Pending: 10,
  InProgress: 20,
  Completed: 30,
  Cancelled: 40,
} as const

export type PutawayTaskStatus = (typeof PutawayTaskStatus)[keyof typeof PutawayTaskStatus] | number | string

export interface PutawayTaskDto {
  id: string
  taskNo: string
  containerId?: string
  containerCode?: string
  sourceLocationId?: string
  sourceLocationCode?: string
  suggestedLocationId?: string
  suggestedLocationCode?: string
  targetLocationId?: string
  targetLocationCode?: string
  status?: PutawayTaskStatus
  creationTime?: string
}

export interface PutawayTaskSearchDto {
  skipCount?: number
  maxResultCount?: number
  status?: PutawayTaskStatus
  taskNo?: string
  containerCode?: string
}

export interface CompletePutawayTaskDto {
  actualLocationCode: string
}

export interface PagedResultDto<T> {
  totalCount: number
  items: T[]
}

const baseUrl = '/api/app/putaway'

export async function getPutawayTaskList(params: PutawayTaskSearchDto): Promise<PagedResultDto<PutawayTaskDto>> {
  const res = await http.get<PagedResultDto<any>>(baseUrl, {
    params: {
      skipCount: params.skipCount ?? 0,
      maxResultCount: params.maxResultCount ?? 100,
      status: params.status,
    }
  })
  return {
    totalCount: res.data.totalCount,
    items: (res.data.items ?? []).map(mapPutawayTaskToPda)
  }
}

export async function getPutawayTaskDetail(id: string): Promise<PutawayTaskDto> {
  // 盘点上架任务本质是 MoveTask，后端 PutawayAppService 未暴露单独的 Get 方法，这里直接调用 move-task 详情接口
  const res = await http.get<any>(`/api/app/move-task/${id}`)
  return mapMoveTaskToPda(res.data)
}

export async function completePutawayTask(id: string, data: CompletePutawayTaskDto) {
  const res = await http.post<void>(`${baseUrl}/${id}/complete`, {
    targetLocationCode: data.actualLocationCode
  })
  return res.data
}

function mapPutawayTaskToPda(item: any): PutawayTaskDto {
  return {
    id: item.id,
    taskNo: item.taskNo,
    containerCode: item.containerNo,
    sourceLocationCode: item.fromLocationCode,
    suggestedLocationCode: item.toLocationCode,
    targetLocationCode: item.toLocationCode,
    status: item.status,
    creationTime: item.creationTime
  }
}

function mapMoveTaskToPda(item: any): PutawayTaskDto {
  return {
    id: item.id,
    taskNo: item.taskNo,
    containerId: item.containerId,
    containerCode: item.containerCode,
    sourceLocationId: item.sourceLocationId,
    sourceLocationCode: item.sourceLocationCode,
    suggestedLocationId: item.targetLocationId,
    suggestedLocationCode: item.targetLocationCode,
    targetLocationId: item.targetLocationId,
    targetLocationCode: item.targetLocationCode,
    status: item.status,
    creationTime: item.creationTime
  }
}