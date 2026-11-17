/**
 * 批量导入失败行映射基座（【MA-10】C3-1 单源下沉）
 *
 * 两套映射语义并存，勿合并：
 * - index 形态：后端 fail_items / 400 items 的 index 对应 validRows 的数组索引
 *   （AssetBatchImport / AssetTypeBatchImport / ContractBatchImport）
 * - id 形态：以业务 id 字段值回查（useBatchImport 通用管线）
 *
 * @dependsOn isApiError（errorHandler）判别 AxiosError 形态
 */
import type { FailedItem } from '@/utils/SubmitBatch'
import { isApiError } from '@/utils/errorHandler'

/** 400 响应体提取逐条 items（{ data: { items: [...] } }，仅 status===400 命中） */
export const extract400Items = (axiosError: unknown): Array<Record<string, string[]>> | null => {
  if (!isApiError(axiosError) || axiosError.response?.status !== 400) return null
  const respData = axiosError.response.data as Record<string, unknown>
  const detailItems = (respData?.data as Record<string, unknown>)?.items as
    | Array<Record<string, string[]>>
    | undefined
  return detailItems && Array.isArray(detailItems) ? detailItems : null
}

/** fail_items 条目判别（结构守卫，避免 Record 索引签名吞掉 in 窄化） */
export const isFailItem = (
  item: Record<string, string[]> | { index: number; error_message: string },
): item is { index: number; error_message: string } =>
  'error_message' in item && typeof (item as { index?: unknown }).index === 'number'

/** 将 fail_items 或 400 items 的逐条错误合并为 index → message 映射 */
export const buildFailedMapByIndex = (
  items: Array<Record<string, string[]> | { index: number; error_message: string }>,
): Map<number, string> => {
  const failedMap = new Map<number, string>()
  items.forEach((item, idx) => {
    if (isFailItem(item)) {
      failedMap.set(item.index, item.error_message)
    } else {
      const messages = Object.values(item).flat()
      if (messages.length > 0) failedMap.set(idx, messages.join(''))
    }
  })
  return failedMap
}

/** 将 failedMap 应用到 validRows 的 submitStatus/submitError */
export const applyFailedMapToRows = (
  validRows: Array<{ submitStatus?: string; submitError?: string }>,
  failedMap: Map<number, string>,
  fallback: string,
) => {
  validRows.forEach((row, idx) => {
    if (failedMap.has(idx)) {
      row.submitStatus = 'error'
      row.submitError = failedMap.get(idx) || fallback
    } else {
      row.submitStatus = 'success'
    }
  })
}

/** id 形态：以业务 id 字段值回查（useBatchImport 通用管线） */
export const buildFailedMapFromIds = <TApi extends object>(
  failedItems: Array<FailedItem<TApi>>,
  idField: keyof TApi,
): Map<string, string> => {
  const failedMap = new Map<string, string>()
  failedItems.forEach((failed) => {
    const idValue = failed.item[idField]
    if (idValue !== undefined && idValue !== null) {
      failedMap.set(String(idValue), failed.error)
    }
  })
  return failedMap
}
