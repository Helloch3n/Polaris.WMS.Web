import request from '@/utils/http'

export interface CompleteMoveTaskDto {
  actualLocationCode: string
}

export function completeMoveTask(taskId: string, data: CompleteMoveTaskDto) {
  return request.post(`/api/app/move-task/${taskId}/complete`, data)
}
