import { http } from './http'

/**
 * 统一导出唯一实例，避免重复注册响应拦截器
 */
const request = http

export default request
export { request }
