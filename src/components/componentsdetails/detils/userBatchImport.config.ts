/**
 * 员工批量导入配置（自 UserBatchImport.vue 物理提取，零逻辑变更）
 *
 * 注意：校验与转换依赖「部门名称→代码」映射，该映射在组件内是响应式 computed
 * （随 departmentStore 数据变化）。因此此处以工厂函数形式提供配置，
 * 调用方传入映射的 getter（如 () => reverseDepartmentMapping.value），
 * 逻辑与原实现逐行一致。
 */
import { USER_STATUS_INPUT_MAPPING } from '@/utils/Format'
import type { HeaderExample, ExampleColumn } from '@/utils/batchImportHelpers'
import type { ExcelEmployeeData, EmployeeCreateForm } from '@/types/user'
import {
  requireNonEmpty,
  requirePattern,
  optionalEnum,
  cleanExcelString,
} from '@/utils/batchImport/validation'

/** 部门名称 -> 部门代码 映射的 getter 类型 */
export type DepartmentMappingGetter = () => Record<string, string>

/** 工号格式：1 位大写字母 + 5 位数字（validateItem 与 spec 共同锁定） */
const JOBCODE_PATTERN = /^[A-Z][0-9]{5}$/

/** 手机号格式：1 开头 11 位 */
const PHONE_PATTERN = /^1[3-9]\d{9}$/

/** 排序上限（与 spec 断言一致） */
const SORT_MAX = 1000000

/**
 * 部门名称可解析性：精确命中 / trim 后命中 / 双向包含模糊命中 / 「部门代码」列兜底，任一成立即可。
 * 供 validateItem（存在性判定）与 resolveDepartmentCode（代码解析）共享，DR-1 单一实现。
 */
function isDepartmentResolvable(
  departmentName: string,
  codeColumn: string,
  mapping: Record<string, string>,
): boolean {
  if (mapping[departmentName]) return true
  if (Object.keys(mapping).some((name) => name.trim() === departmentName)) return true
  if (
    Object.keys(mapping).some(
      (name) => name.includes(departmentName) || departmentName.includes(name),
    )
  ) {
    return true
  }
  return !!codeColumn
}

/**
 * 部门名称 → 部门代码解析：精确 → trim → 模糊 → 回退「部门代码」列。
 * 与原 transformToApiData 内联四级解析逐行等价（供校验与转换两处复用）。
 */
function resolveDepartmentCode(
  departmentName: string,
  codeColumn: string,
  mapping: Record<string, string>,
): string {
  if (!departmentName) return codeColumn
  const exact = mapping[departmentName]
  if (exact) return exact
  const entries = Object.entries(mapping)
  const trimMatch = entries.find(([name]) => name.trim() === departmentName)
  if (trimMatch) return trimMatch[1]
  const fuzzyMatch = entries.find(
    ([name]) => name.includes(departmentName) || departmentName.includes(name),
  )
  if (fuzzyMatch) return fuzzyMatch[1]
  return codeColumn
}

/** 排序值三段校验（NaN / <0 / >上限，顺序覆盖写与原三连 if 等价） */
function checkSortRange(sort: number, errors: Record<string, string>): void {
  if (Number.isNaN(sort)) errors['排序'] = '排序必须是数字'
  if (sort < 0) errors['排序'] = '排序不能小于 0'
  if (sort > SORT_MAX) errors['排序'] = `排序不能大于 ${SORT_MAX}`
}

/**
 * 创建员工批量导入配置
 * @param getDepartmentMapping - 部门名称→代码映射的 getter（保持响应性）
 */
export function createUserBatchConfig(getDepartmentMapping: DepartmentMappingGetter) {
  return {
    entityName: '员工',
    // ✅ 必须列为 Excel 表头的中文键
    requiredFields: ['姓名', '工号', '电话', '位置', '部门', '排序'] as (keyof ExcelEmployeeData)[],
    excelHeaderMap: {
      姓名: '姓名',
      工号: '工号',
      电话: '电话',
      位置: '位置',
      状态: '状态',
      部门代码: '部门代码',
      部门: '部门',
      描述: '描述',
      排序: '排序',
    } as const,

    /** 校验单条 Excel 行（P1-4：同构分支收敛，本体降为清洗 + 纯调用序列） */
    validateItem(item: ExcelEmployeeData) {
      const errors: Record<string, string> = {}
      const VALID_STATUS_INPUTS = Object.keys(USER_STATUS_INPUT_MAPPING)

      // 清洗字段（cleanExcelString 与原 String(x ?? '').trim() 逐值等价，消除每字段 +2 复杂度税）
      const name = cleanExcelString(item.姓名)
      const jobcode = cleanExcelString(item.工号)
      const phone = cleanExcelString(item.电话)
      const location = cleanExcelString(item.位置)
      const statusInput = cleanExcelString(item.状态)
      const departmentName = cleanExcelString(item.部门)
      const codeColumn = cleanExcelString(item.部门代码)
      const sort = Number(item.排序 ?? 0)

      // 必填校验
      requireNonEmpty(name, '姓名', '姓名为必填项', errors)
      requirePattern(
        jobcode,
        '工号',
        '工号为必填项',
        JOBCODE_PATTERN,
        '工号格式不正确（如 A12345）',
        errors,
      )
      requirePattern(phone, '电话', '电话为必填项', PHONE_PATTERN, '电话格式不正确', errors)
      requireNonEmpty(location, '位置', '位置为必填项', errors)
      if (!departmentName) {
        errors['部门'] = '部门名称为必填项'
      } else if (!isDepartmentResolvable(departmentName, codeColumn, getDepartmentMapping())) {
        // 检查部门名称是否可解析（与 transformToApiData 逻辑一致，经共享 isDepartmentResolvable）
        errors['部门'] = '部门名称在系统中不存在，且「部门代码」列也为空'
      }
      checkSortRange(sort, errors)

      // 状态值映射（可选字段，不存在则使用默认值 active）
      optionalEnum(
        statusInput,
        '状态',
        VALID_STATUS_INPUTS,
        `状态值无效，有效值：${VALID_STATUS_INPUTS.join('、')}`,
        errors,
      )

      return {
        valid: Object.keys(errors).length === 0,
        errors,
      }
    },

    /**
     * 转换为 API 提交格式（EmployeeCreateForm）
     * 注意：这里只转换通过校验的行，但即使部分数据有误，我们仍返回一个合法的 EmployeeCreateForm 对象，
     * 因为提交时只会提交 valid 行。
     * P1-4：部门四级解析收敛至 resolveDepartmentCode（与 validateItem 共享，DR-1）。
     */
    transformToApiData(item: ExcelEmployeeData): EmployeeCreateForm {
      const statusInput = cleanExcelString(item.状态)
      const normalizedStatus = statusInput
        ? ((USER_STATUS_INPUT_MAPPING[statusInput] || 'active') as 'active' | 'left' | 'retirement')
        : 'active'

      const departmentCode = resolveDepartmentCode(
        cleanExcelString(item.部门),
        cleanExcelString(item.部门代码),
        getDepartmentMapping(),
      )

      return {
        employee_jobcode: cleanExcelString(item.工号),
        employee_name: cleanExcelString(item.姓名),
        employee_phone: cleanExcelString(item.电话),
        employee_location: cleanExcelString(item.位置),
        employee_status: normalizedStatus,
        employee_department_code: departmentCode || '',
        employee_description: cleanExcelString(item.描述) || null,
        sort_order: Number(item.排序 ?? 0),
      }
    },

    /** placeholder: 实际提交逻辑在 submitBatchData 中直接调用 batchCreateUsers */
    createFn: async () => ({}) as EmployeeCreateForm,

    idField: 'employee_jobcode' as const, // ✅ 对应 EmployeeCreateForm 的键
  }
}

// ===== 导入格式参考卡片数据 =====
export const userHeaderExamples: HeaderExample[] = [
  {
    headerName: '姓名',
    field: 'employee_name',
    required: true,
    example: '张三',
    remark: '员工姓名，2-20个字符',
  },
  {
    headerName: '工号',
    field: 'employee_jobcode',
    required: true,
    example: 'A12345',
    remark: '1位大写字母+5位数字，不可重复',
  },
  {
    headerName: '电话',
    field: 'employee_phone',
    required: true,
    example: '13812345678',
    remark: '11位手机号码',
  },
  {
    headerName: '位置',
    field: 'employee_location',
    required: true,
    example: '铁机路B栋14楼',
    remark: '员工所在位置',
  },
  {
    headerName: '部门',
    field: 'employee_department',
    required: true,
    example: '信息管理中心',
    remark: '部门名称，优先于部门代码',
  },
  {
    headerName: '状态',
    field: 'employee_status',
    required: false,
    example: 'active',
    remark: 'active/left/retirement，默认active',
  },
  {
    headerName: '部门代码',
    field: 'employee_department_code',
    required: false,
    example: 'XXGLZX',
    remark: '可选，部门名称优先',
  },
  {
    headerName: '排序',
    field: 'sort_order',
    required: false,
    example: '100',
    remark: '排序顺序，默认0',
  },
  {
    headerName: '描述',
    field: 'employee_description',
    required: false,
    example: '负责资产管理系统维护',
    remark: '员工描述信息',
  },
]

export const userExampleColumns: ExampleColumn[] = userHeaderExamples.map((h) => ({
  prop: h.field,
  label: h.headerName,
}))

export const userExampleRows = [
  {
    employee_name: '张三',
    employee_jobcode: 'A12345',
    employee_phone: '13812345678',
    employee_location: '铁机路B栋14楼',
    employee_department: '信息管理中心',
    sort_order: 100,
    employee_status: 'active',
    employee_department_code: 'XXGLZX',
    employee_description: '信息管理中心员工，负责资产管理系统维护',
  },
  {
    employee_name: '李四',
    employee_jobcode: 'B67890',
    employee_phone: '13987654321',
    employee_location: '铁机路B栋13楼',
    employee_department: '人力资源部',
    sort_order: 200,
    employee_status: 'active',
    employee_department_code: 'RLZYB',
    employee_description: '人力资源部主管',
  },
]

/** 下载模板用的示例数据（原组件 downloadTemplate 内联数据物理提取） */
export const userTemplateData: ExcelEmployeeData[] = [
  {
    姓名: '张三',
    工号: 'A12345',
    状态: 'active(在职)/left(离职)/retirement(退休)',
    电话: '13812345678',
    排序: 100,
    位置: '铁机路B栋14楼',
    部门代码: 'XXGLZX(请根据实际部门代码填写，可参考部门列表或不填写)',
    部门: '信息管理中心(XXGLZX, 部门与部门代码相对应，请填写正确的部门名称)',
    描述: '信息管理中心员工，负责资产管理系统维护',
  },
]
