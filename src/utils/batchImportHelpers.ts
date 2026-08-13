/**
 * @file 批量导入公共辅助函数，提供验证状态标签类型与文本
 * @module src/utils/batchImportHelpers
 * @exports
 *   - validationTagType: 根据验证/提交状态返回 Element Plus 标签类型
 *   - validationTagText: 根据验证/提交状态返回标签显示文本
 *   - HeaderExample: 表头说明行接口
 *   - ExampleColumn: 示例数据列配置接口
 * @callers
 *   - composables/useBatchImport
 * @dependsOn
 *   - @/composables/useBatchImport (ValidatedRow 类型)
 */

import type { ValidatedRow } from '@/composables/useBatchImport'

/** 验证状态标签类型 */
export function validationTagType<T>(row: ValidatedRow<T>): string {
  if (row.submitStatus === 'error') return 'danger'
  if (row.submitStatus === 'success') return 'success'
  if (row.validationStatus === 'error') return 'danger'
  return 'success'
}

/** 验证状态标签文本 */
export function validationTagText<T>(row: ValidatedRow<T>): string {
  if (row.submitStatus === 'error') return '提交失败'
  if (row.submitStatus === 'success') return '已提交'
  if (row.validationStatus === 'error') return '验证失败'
  return '有效'
}

/** 表头说明行 */
export interface HeaderExample {
  headerName: string
  field: string
  required: boolean
  example: string
  remark: string
}

/** 示例数据列配置 */
export interface ExampleColumn {
  prop: string
  label: string
}
