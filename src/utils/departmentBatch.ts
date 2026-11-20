/**
 * 部门批量创建工具（自 DepartmentBatchAddDialog.vue 物理提取，零逻辑变更）
 */
import type { DepartmentCreateForm } from '@/types/department'

interface BatchRow {
  department_code: string
  department_name: string
  department_information: string
  sort_order: number | null
}

/**
 * 将弹窗有效行转换为批量创建请求载荷。
 * 【BF-207】sort_order 缺省（null）时省略该字段 → 后端自动排到组末尾；显式值（含 0）仍尊重。
 */
export const buildBatchCreateItems = (
  validItems: BatchRow[],
  parentCode: string,
): DepartmentCreateForm[] =>
  validItems.map((item) => ({
    department_code: item.department_code.trim(),
    department_name: item.department_name.trim(),
    department_information: item.department_information.trim() || '-',
    parent_department_code: parentCode,
    ...(item.sort_order != null && { sort_order: item.sort_order }),
  }))
