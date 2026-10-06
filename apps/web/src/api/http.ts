import type { ErrorCode } from '@kestrel/contracts'
import axios, { type AxiosInstance } from 'axios'

import type { ErrorResponse } from '@kestrel/contracts'

export const API_BASE = import.meta.env.VITE_API_BASE || '/api'

export class ApiError extends Error {
  readonly code: ErrorCode | 'network_error'

  constructor(code: ErrorCode | 'network_error', message: string) {
    super(message)
    this.name = 'ApiError'
    this.code = code
  }
}

export const http: AxiosInstance = axios.create({
  baseURL: API_BASE,
  timeout: 15000,
  headers: { Accept: 'application/json' },
})

http.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (axios.isAxiosError(error)) {
      const data = error.response?.data as ErrorResponse | undefined
      if (data?.error) {
        // 校验失败的信息由后端契约给出（英文原文），页面不该原样展示：换成人话
        const message =
          data.error.code === 'validation_error'
            ? '填写的内容不符合要求，请检查长度与格式'
            : data.error.message
        return Promise.reject(new ApiError(data.error.code, message))
      }
      return Promise.reject(new ApiError('network_error', `连不上后端（${API_BASE}）`))
    }
    return Promise.reject(new ApiError('network_error', String(error)))
  },
)
