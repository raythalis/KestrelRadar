import type { ApiErrorCode, ApiErrorDetails, ApiErrorResponse } from '@kestrel/contracts'
import axios, { type AxiosInstance } from 'axios'

import { apiErrorMessage, showApiError } from '@/utils/feedback'

export const API_BASE = import.meta.env.VITE_API_BASE || '/api'

/**
 * 请求失败（连不上、超时、被拒）时没有后端错误码可用：用 null 表示这一层。
 * 它不是任何一套码体系里的值，别拿它当 code 用。
 */
export type RequestFailure = null

export class ApiError extends Error {
  /** 后端错误码；null = 请求根本没到后端 */
  readonly code: ApiErrorCode | RequestFailure
  /** 字段级定位（只有校验类才有），供弹窗高亮用 */
  readonly details?: ApiErrorDetails
  /** 后端原文：界面不用它（文案按码映射），只给兜底与日志 */
  readonly serverMessage: string

  constructor(
    code: ApiErrorCode | RequestFailure,
    message: string,
    details?: ApiErrorDetails,
    serverMessage = '',
  ) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.details = details
    this.serverMessage = serverMessage
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
    const isAxios = axios.isAxiosError(error)
    const payload = isAxios ? (error.response?.data as ApiErrorResponse | undefined) : undefined
    const apiError = payload?.error
    const code = apiError?.code ?? null
    const details = apiError?.details
    const serverMessage = apiError?.message ?? ''

    // 请求失败全在这里收口：文案按码映射，浮层由 utils/feedback 统一弹
    const failure = new ApiError(
      code,
      apiErrorMessage(code, details, serverMessage),
      details,
      serverMessage,
    )
    showApiError(failure)
    return Promise.reject(failure)
  },
)
