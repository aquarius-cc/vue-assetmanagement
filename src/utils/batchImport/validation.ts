/**
 * @file 批量导入校验原语库——四个 *BatchImport.config.ts 的 validateItem/transformToApiData
 *   同构分支（必填非空/必填格式/正整数/非负数/可选日期/可选枚举/字符串清洗）DR-1 收敛至此后单一实现。
 * @module src/utils/batchImport/validation
 * @remarks
 *   设计约束（P1-4 复杂度拆分红线）：
 *   1. 每个原语自身圈复杂度 ≤ 3（单一职责），调用方 validateItem 因此可降为「纯调用序列」（复杂度 ≈ 1-2）。
 *   2. 错误消息全部由调用方传入——既有 spec 逐字断言消息文案，本层禁止内联中文文案。
 *   3. 语义与原各 config 内联实现逐行等价（含 `String(x ?? '')` 清洗口径、`!value?.trim()` 空判定、
 *      `Number.isInteger` 正整数判定、可选字段「有值才校验」短路），不改任何对外行为。
 * @callers
 *   - components/componentsdetails/detils/{contract,asset,outAsset}BatchImport.config.ts
 *   - components/componentsdetails/detils/userBatchImport.config.ts（transformToApiData 清洗段）
 */

/** 校验错误聚合器：field → 消息（与 BatchImportConfig.validateItem.errors 同构） */
export type ImportErrorSink = Record<string, string>

/** YYYY-MM-DD 日期格式（各 config 内联正则的统一来源，避免散落字面量） */
export const YYYY_MM_DD = /^\d{4}-\d{2}-\d{2}$/

/**
 * 必填非空字符串校验（trim 后判空）。
 * 与原 `if (!item.X?.trim()) errors.X = msg` 语义逐行等价（null/undefined/''/纯空白均判空）。
 */
export function requireNonEmpty(
  value: string | null | undefined,
  field: string,
  message: string,
  errors: ImportErrorSink,
): void {
  if (!value?.trim()) {
    errors[field] = message
  }
}

/**
 * 必填非空 + 长度区间校验。
 * 与原「空 → 消息A；越界 → 消息B」两段 if 等价；长度判定用 trim 后值（原实现对 trim 后值判 length）。
 */
export function requireNonEmptyLength(
  value: string | null | undefined,
  field: string,
  emptyMessage: string,
  min: number,
  max: number,
  lengthMessage: string,
  errors: ImportErrorSink,
): void {
  const trimmed = value?.trim()
  if (!trimmed) {
    errors[field] = emptyMessage
  } else if (trimmed.length < min || trimmed.length > max) {
    errors[field] = lengthMessage
  }
}

/**
 * 必填 YYYY-MM-DD 日期校验：空 → emptyMessage；格式错 → formatMessage。
 * 与原「trim → 空判 → 正则」两段 if 等价；非字符串入参统一 String() 后判定（原实现对 Excel 异构值兜底）。
 */
export function requireDate(
  value: string | null | undefined,
  field: string,
  emptyMessage: string,
  formatMessage: string,
  errors: ImportErrorSink,
): void {
  const trimmed = typeof value === 'string' ? value.trim() : String(value ?? '')
  if (!trimmed) {
    errors[field] = emptyMessage
  } else if (!YYYY_MM_DD.test(trimmed)) {
    errors[field] = formatMessage
  }
}

/**
 * 可选 YYYY-MM-DD 日期校验【归一化口径，contract 用】：无值短路跳过；
 * 有值 → 字符串 trim / 非字符串 String() 归一化 → 非空且格式错才报错。
 * 与原 `if (item.X) { const s = typeof X==='string' ? X.trim() : String(X); if (s && !regex.test(s)) ... }` 等价。
 */
export function optionalDate(
  value: string | number | null | undefined,
  field: string,
  formatMessage: string,
  errors: ImportErrorSink,
): void {
  if (!value) return
  const normalized = typeof value === 'string' ? value.trim() : String(value)
  if (normalized && !YYYY_MM_DD.test(normalized)) {
    errors[field] = formatMessage
  }
}

/**
 * 可选 YYYY-MM-DD 日期校验【原值口径，asset 用】：无值（含 undefined/null）短路跳过；
 * 有值（含纯空白——原实现 raw truthy 判定）→ 原值直判正则。
 * 与原 `if (item.X && !regex.test(item.X))` 逐字符等价（刻意不做 trim，保既有边界行为）。
 */
export function optionalDateRaw(
  value: string | null | undefined,
  field: string,
  formatMessage: string,
  errors: ImportErrorSink,
): void {
  if (!value) return
  if (!YYYY_MM_DD.test(value)) {
    errors[field] = formatMessage
  }
}

/**
 * 可选 YYYY-MM-DD 日期校验【trim 口径，outAsset return_date 用】：无值短路跳过；
 * 有值（含纯空白——raw truthy 判在场）→ trim 后判格式（空白 trim 后为空串，正则必失败 → 报格式错）。
 * 与原 `if (item.X && !regex.test(item.X.trim()))` 逐字符等价。
 */
export function optionalDateTrimmed(
  value: string | null | undefined,
  field: string,
  formatMessage: string,
  errors: ImportErrorSink,
): void {
  if (!value) return
  if (!YYYY_MM_DD.test(value.trim())) {
    errors[field] = formatMessage
  }
}

/**
 * 必填 + 格式（正则）校验：空 → emptyMessage；格式错 → formatMessage。
 * 与原「if (!v) 报必填 else if (!regex.test(v)) 报格式」两段 if 等价（工号/手机号用）。
 * @param value 调用方传入已清洗（trim）值——pattern 对清洗后值判定，与原实现一致。
 */
export function requirePattern(
  value: string | null | undefined,
  field: string,
  emptyMessage: string,
  pattern: RegExp,
  formatMessage: string,
  errors: ImportErrorSink,
): void {
  if (!value?.trim()) {
    errors[field] = emptyMessage
  } else if (!pattern.test(value)) {
    errors[field] = formatMessage
  }
}

/**
 * 数字校验：必填口径（NaN 报错）+ 可选下界。
 * @param nonNegative true → 追加 `n < 0` 报错（如金额/保修期「不小于0」）；false → 仅 NaN 报错。
 * 与原 `const n = Number(item.X); if (isNaN(n) || (nonNegative && n < 0))` 等价。
 */
export function requireNumber(
  value: string | number | null | undefined,
  field: string,
  message: string,
  nonNegative: boolean,
  errors: ImportErrorSink,
): void {
  const n = Number(value)
  if (Number.isNaN(n) || (nonNegative && n < 0)) {
    errors[field] = message
  }
}

/**
 * 可选数字校验：无值（undefined/null/''）短路跳过；有值才判数字与下界。
 * 与原 `if (item.X !== undefined && item.X !== '') { const n = Number(...); ... }` 等价。
 */
export function optionalNumber(
  value: string | number | null | undefined,
  field: string,
  message: string,
  errors: ImportErrorSink,
): void {
  if (value === undefined || value === null || value === '') return
  const n = Number(value)
  if (Number.isNaN(n) || n < 0) {
    errors[field] = message
  }
}

/**
 * 必填正整数校验（NaN/非整数/<1 报错）。
 * 与原 `const n = Number(item.X); if (isNaN(n) || !Number.isInteger(n) || n < 1)` 等价。
 */
export function requirePositiveInteger(
  value: string | number | null | undefined,
  field: string,
  message: string,
  errors: ImportErrorSink,
): void {
  const n = Number(value)
  if (Number.isNaN(n) || !Number.isInteger(n) || n < 1) {
    errors[field] = message
  }
}

/**
 * 可选枚举校验：无值短路跳过；有值且不在允许集 → 报错。
 * 消息由调用方拼接（含枚举清单），本层不内联文案。
 * 与原 `if (item.X && !valid.includes(item.X))` 等价。
 */
export function optionalEnum<T extends string>(
  value: string | null | undefined,
  field: string,
  allowed: readonly T[],
  message: string,
  errors: ImportErrorSink,
): void {
  if (!value) return
  if (!(allowed as readonly string[]).includes(value)) {
    errors[field] = message
  }
}

/**
 * 必填枚举校验：空 → emptyMessage；不在允许集 → message。
 * 与原「空判 + includes 判定」两段 if 等价（contract_type / contract_status 用）。
 */
export function requireEnum<T extends string>(
  value: string | null | undefined,
  field: string,
  emptyMessage: string,
  allowed: readonly T[],
  message: string,
  errors: ImportErrorSink,
): void {
  if (!value?.trim()) {
    errors[field] = emptyMessage
  } else if (!(allowed as readonly string[]).includes(value)) {
    errors[field] = message
  }
}

/** 可选字符串 → trim 后保留，空/null → fallback。与原 `row.X?.trim() || fallback` 等价。 */
export function trimmedOr(value: string | null | undefined, fallback: string): string {
  return value?.trim() || fallback
}

/**
 * Excel 异构值清洗为 trim 字符串：null/undefined → ''，其余 String() 后 trim。
 * 与原 `String(item.X ?? '').trim()` 逐值等价（`??` 仅合并 null/undefined，false/0 等假值走 String()）。
 * 消除 validateItem/transform 内每字段 +2~3 的圈复杂度税。
 */
export function cleanExcelString(value: unknown): string {
  if (value === undefined || value === null) return ''
  return String(value).trim()
}

/** 可选字符串 → trim 后保留，空/null → null。与原 `row.X?.trim() || null` 等价。 */
export function trimmedOrNull(value: string | null | undefined): string | null {
  return value?.trim() || null
}
