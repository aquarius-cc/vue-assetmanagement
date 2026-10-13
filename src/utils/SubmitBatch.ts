/**
 * @file 通用批量提交函数，支持并发提交与错误信息收集
 * @module src/utils/SubmitBatch
 * @exports
 *   - FailedItem: 失败项接口（含原始数据与错误信息）
 *   - SubmitBatchResult: 批量提交结果接口
 *   - SubmitBatchOptions: 批量提交配置接口
 *   - extractErrorMessage: 从错误对象提取可读错误信息
 *   - submitBatch: 通用批量提交函数（支持并发控制）
 * @callers
 *   - composables/useBatchImport
 * @dependsOn
 *   - axios (isAxiosError)
 */

import { isAxiosError, type AxiosError } from 'axios'
import { logError } from '@/utils/logger'

/** 失败项：包含原始数据和具体错误信息 */
export interface FailedItem<T> {
  /** 提交失败的原始数据 */
  item: T
  /** 后端返回的具体错误信息 */
  error: string
}

export interface SubmitBatchResult<T> {
  /** 成功提交的条数 */
  successCount: number
  /** 失败项列表（包含原始数据和错误信息） */
  failedItems: FailedItem<T>[]
}

export interface SubmitBatchOptions<T> {
  /** 实体名称（用于日志） */
  entityName: string
  /** 唯一标识字段名（用于日志追踪和失败项匹配） */
  idField: keyof T
  /** 并发数（默认 5） */
  concurrency?: number
}

/**
 * 从错误对象中提取可读的错误信息
 * 优先级：Axios response.data.detail > response.data 字段错误 > error.message > 兜底
 */
// [P1-4] 下列 3 个内部助手为 extractErrorMessage 原逻辑原样下沉，未改任何判断/返回。

/** DRF 常见格式：{ detail: "..." } 或 { detail: ["...", "..."] } */
const formatDetailField = (detail: unknown): string | null => {
  if (detail == null) return null
  return Array.isArray(detail) ? detail.map(String).join('；') : String(detail)
}

/** 单个字段的错误消息列表格式化：数组直接用，标量转字符串数组 */
const formatFieldMessages = (messages: unknown): string[] =>
  Array.isArray(messages) ? messages : [String(messages)]

/** DRF 字段级错误：{ field_name: ["错误1", "错误2"] } → `field: msg1, msg2；...` */
const formatAllFieldErrors = (data: Record<string, unknown>): string | null => {
  const fieldErrors = Object.entries(data)
    .filter(([, v]) => v != null)
    .map(([field, messages]) => `${field}: ${formatFieldMessages(messages).join(', ')}`)
    .join('；')
  return fieldErrors || null
}

/** 从 Axios 错误体提取 detail 或 message（命中返回字符串，否则 null） */
const extractDetailOrMessage = (data: Record<string, unknown>): string | null => {
  if ('detail' in data) {
    const detail = formatDetailField(data.detail)
    if (detail !== null) return detail
  }
  if ('message' in data && typeof data.message === 'string') {
    return data.message
  }
  return null
}

/** Axios 错误体提取：detail > message > 全字段拼接 > HTTP 状态码兜底 */
const extractAxiosErrorMessage = (error: AxiosError): string => {
  const data = error.response?.data
  if (data && typeof data === 'object') {
    const record = data as Record<string, unknown>
    const direct = extractDetailOrMessage(record)
    if (direct !== null) return direct
    const fieldErrors = formatAllFieldErrors(record)
    if (fieldErrors !== null) return fieldErrors
  }
  return `请求失败 (${error.response?.status ?? '未知状态'})`
}

export function extractErrorMessage(error: unknown): string {
  if (isAxiosError(error)) return extractAxiosErrorMessage(error)
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error
  return '未知错误'
}

/**
 * 通用批量提交函数
 * @param dataList 要提交的数据列表
 * @param createFn 单条创建函数
 * @param options 配置项
 * @returns 提交结果（包含成功数和失败项列表，失败项携带具体错误信息）
 */
export async function submitBatch<T extends object>(
  dataList: T[],
  createFn: (item: T) => Promise<unknown>,
  options: SubmitBatchOptions<T>,
): Promise<SubmitBatchResult<T>> {
  const { entityName, idField, concurrency = 5 } = options
  const batchSize = concurrency
  let successCount = 0
  const failedItems: FailedItem<T>[] = []

  for (let i = 0; i < dataList.length; i += batchSize) {
    const batch = dataList.slice(i, i + batchSize)
    const promises = batch.map(async (item) => {
      try {
        await createFn(item)
        successCount++
      } catch (error) {
        const errorMsg = extractErrorMessage(error)
        const idValue = String(item[idField] ?? 'unknown')
        logError('utils/SubmitBatch', `[${entityName}] 创建失败 (ID: ${idValue}): ${errorMsg}`)
        failedItems.push({ item, error: errorMsg })
      }
    })
    await Promise.all(promises)
  }

  return { successCount, failedItems }
}
