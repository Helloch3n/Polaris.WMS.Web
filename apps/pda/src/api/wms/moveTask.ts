import http from '@/utils/http'

export interface CompleteMoveTaskDto {
  actualLocationCode: string;
}

export function completeMoveTask(id: string, data: CompleteMoveTaskDto) {
  return http.post(`/api/app/move-task/${id}/complete`, data)
}
import request from '@/utils/http'

export interface CompleteMoveTaskDto {
  actualLocationCode: string
}

export function completeMoveTask(taskId: string, data: CompleteMoveTaskDto) {
  return request.post(`/api/app/move-task/${taskId}/complete`, data)
}
