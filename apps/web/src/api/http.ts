import axios, { type AxiosInstance } from 'axios'

import type { ApiErrorCode } from '@/types/api'

const API_BASE = import.meta.env.VITE_API_BASE || '/api/v2'

export class ApiError extends Error {
  readonly code: ApiErrorCode
  readonly status?: number

  constructor(code: ApiErrorCode, message: string, status?: number) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.status = status
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
      const status = error.response?.status
      const code: ApiErrorCode =
        status === 401
          ? 'unauthorized'
          : status === 403
            ? 'forbidden'
            : status === 409
              ? 'conflict'
              : status === 422
                ? 'validation_error'
                : status === 503
                  ? 'unavailable_dependency'
                  : error.response
                    ? 'error'
                    : 'network_error'
      return Promise.reject(new ApiError(code, error.message, status))
    }
    return Promise.reject(new ApiError('error', String(error)))
  },
)

export { API_BASE }
