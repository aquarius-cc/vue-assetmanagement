/**
 * 编辑载荷归一化与乐观锁合并工具（AssetForm 编辑流专用）
 *
 * 同源映射契约（DR-1）：detailToUpdatePayload 与 AssetForm 的 getAssetCreateForm
 * 共用本模块的 pick* 归一化函数——两侧键集与取值归一逐一对应（price 同过
 * Number→String，'4999.00' 与 4999 归一后同为 '4999'），dirtyDiff 的等值判定
 * 依赖该同源性。键集 = 编辑载荷面（剔除录入倍数 asset_purchase_number）。
 */

import type { AssetDetail } from '@/types/asset'

/**
 * 从可选字符串字段取值，null/undefined 兜底为默认值。
 * P1-4 复杂度收敛用：把 `field ?? ''` 的分支从字段字面量里收走。
 */
export const pickStr = (value: string | null | undefined, fallback: string): string =>
  value ?? fallback

/**
 * 从可选数值字段取值，null/undefined 兜底为默认值。
 */
export const pickNum = (value: number | null | undefined, fallback: number): number =>
  value ?? fallback

/**
 * 单价字段取值：null/undefined → ''，其余 String() 化。
 */
export const pickPrice = (value: number | string | null | undefined): string =>
  value != null ? String(value) : ''

/**
 * 从「可空关联对象」上安全取一个字符串字段。
 * 对象或字段任一缺失均兜底为默认值。
 */
export const pickRel = (
  rel: Record<string, unknown> | null | undefined,
  field: string,
  fallback: string,
): string => {
  const value = rel?.[field]
  return typeof value === 'string' ? value : fallback
}

/** 关联对象（接口无索引签名）→ 可按键取值的记录视图 */
const asRel = (value: unknown): Record<string, unknown> | null | undefined =>
  value as Record<string, unknown> | null | undefined

/**
 * 详情 → 更新载荷归一化（与 getAssetCreateForm 同源映射）。
 * 供基线快照与 409 合并提交共用：merged = { ...detailToUpdatePayload(latest),
 * ...dirtyDiff(baseline, form), version: latest.version }。
 */
export const detailToUpdatePayload = (detail: AssetDetail): Record<string, unknown> => ({
  asset_name: pickStr(detail.asset_name, ''),
  asset_specification: pickStr(detail.asset_specification, ''),
  asset_brand: pickStr(detail.asset_brand, ''),
  asset_unit: pickStr(detail.asset_unit, ''),
  asset_purchase_price: pickPrice(Number(detail.asset_purchase_price)),
  asset_purchase_date: pickStr(detail.asset_purchase_date, ''),
  asset_warranty_period: pickNum(Number(detail.asset_warranty_period ?? 0), 0),
  asset_entry_date: pickStr(detail.asset_entry_date, ''),
  asset_type: pickRel(asRel(detail.asset_type), 'type_code', ''),
  asset_entry_person: pickRel(asRel(detail.asset_entry_person), 'employee_jobcode', ''),
  asset_contract: pickRel(asRel(detail.asset_contract), 'contract_code', ''),
  asset_applicant: pickRel(asRel(detail.asset_applicant), 'employee_jobcode', ''),
  asset_manager: pickRel(asRel(detail.asset_manager), 'employee_jobcode', ''),
  asset_using_location: pickStr(detail.asset_using_location, ''),
  asset_storage: pickRel(asRel(detail.asset_storage), 'storage_code', ''),
  asset_description: pickStr(detail.asset_description, ''),
})

/**
 * 脏字段 diff：仅保留 current 相对 baseline 变化的键（用户真实修改面）。
 * 合并提交时只覆盖脏键，未动过的字段让位给他人并发修改（乐观锁人机协同）。
 */
export const dirtyDiff = (
  baseline: Record<string, unknown>,
  current: Record<string, unknown>,
): Record<string, unknown> => {
  const diff: Record<string, unknown> = {}
  for (const key of Object.keys(current)) {
    if (current[key] !== baseline[key]) diff[key] = current[key]
  }
  return diff
}

/**
 * VERSION_CONFLICT 专属判别：后端信封恒为 {code, message, data}，错误时 code 是
 * HTTP 状态码（409），业务码在 data.error_code（core/exception_handler.py 收口）。
 * 不可用 response.data.code 判别——那是 409，会与所有冲突混同。
 */
export const isVersionConflict = (err: unknown): boolean => {
  const envelope = (err as { response?: { data?: { data?: { error_code?: unknown } } } })?.response
    ?.data?.data
  return envelope?.error_code === 'VERSION_CONFLICT'
}
