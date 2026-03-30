import { http } from '@/utils/http'

// --- 枚举定义 (与后端保持一致) ---
export enum MoveTaskType {
  Putaway = 10,     // 入库上架
  MoveToQc = 20,    // 移库送检
  InternalMove = 30, // 库内理货
  PickDown = 40     // 拣货下架
}

export enum MoveTaskStatus {
  Pending = 10,     // 待执行
  InProgress = 20,  // 执行中
  Completed = 30,   // 已完成
  Cancelled = 40    // 已取消
}

// --- DTO 定义 ---
export interface MoveTaskDto {
  id: string
  taskNo: string
  containerId?: string
  containerCode: string
  taskType: MoveTaskType
  status: MoveTaskStatus
  sourceLocationId: string
  sourceLocationCode: string
  targetLocationId: string
  targetLocationCode: string
  creationTime: string
}

export interface PagedResultDto<T> {
  totalCount: number
  items: T[]
}

// 搜索参数
export interface MoveTaskSearchDto {
  skipCount: number
  maxResultCount: number
  status?: MoveTaskStatus
  // 根据需要添加其他搜索条件，例如 ContainerCode
}

// --- API 方法 ---
export function getMoveTaskList(params: MoveTaskSearchDto) {
  // 注意：根据你的 proxy 配置，这里应该使用相对路径，Vite 会代理到后端
  // 如果你的 proxy 配置 target 是 'https://localhost:44346'，这里直接写 '/api/app/move-task' 即可
  return http.get<PagedResultDto<MoveTaskDto>>('/api/app/move-task', { params })
}

export interface CompleteMoveTaskDto {
  actualLocationCode: string;
}

export function completeMoveTask(id: string, data: CompleteMoveTaskDto) {
  return http.post(`/api/app/move-task/${id}/complete`, data)
}

export function getMoveTaskDetails(id: string) {
  return http.get<MoveTaskDto>(`/api/app/move-task/${id}`)
}