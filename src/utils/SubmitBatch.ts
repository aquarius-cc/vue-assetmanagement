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
 *   - composables/useAssetBatchImport
 *   - composables/useContractBatchImport
 * @dependsOn
 *   - axios (isAxiosError)
 */

import { isAxiosError } from 'axios'

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
export function extractErrorMessage(error: unknown): string {
  // 1. Axios 错误：优先取 response.data.detail 或字段级错误
  if (isAxiosError(error)) {
    const data = error.response?.data
    if (data && typeof data === 'object') {
      // DRF 常见格式：{ detail: "..." } 或 { detail: ["...", "..."] }
      if ('detail' in data && data.detail != null) {
        return Array.isArray(data.detail) ? data.detail.map(String).join('；') : String(data.detail)
      }
      // DRF 字段级错误：{ field_name: ["错误1", "错误2"] }
      if ('message' in data && typeof data.message === 'string') {
        return data.message
      }
      // 其他字段错误：遍历所有字段拼接
      const fieldErrors = Object.entries(data)
        .filter(([, v]) => v != null)
        .map(([field, messages]) => {
          const msgList = Array.isArray(messages) ? messages : [String(messages)]
          return `${field}: ${msgList.join(', ')}`
        })
        .join('；')
      if (fieldErrors) return fieldErrors
    }
    // HTTP 状态码兜底
    return `请求失败 (${error.response?.status ?? '未知状态'})`
  }

  // 2. 标准 Error 对象
  if (error instanceof Error) return error.message

  // 3. 字符串
  if (typeof error === 'string') return error

  // 4. 兜底
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
        // console.log("尝试创建:", item)
        await createFn(item)
        successCount++
      } catch (error) {
        const errorMsg = extractErrorMessage(error)
        const idValue = String(item[idField] ?? 'unknown')
        console.error(`[${entityName}] 创建失败 (ID: ${idValue}): ${errorMsg}`)
        failedItems.push({ item, error: errorMsg })
      }
    })
    await Promise.all(promises)
  }

  return { successCount, failedItems }
}
