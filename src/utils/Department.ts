/**
 * 部门数据模型
 * 对应后端数据库表: department_database_table
 */

// ==================== 基础接口定义 ====================

/**
 * 部门创建表单接口
 * 用于创建新部门时的表单数据
 */

import type { EmployeeExtended } from '@/utils/User'

export interface DepartmentCreateForm {
  /** 部门编码 (唯一标识) */
  department_code: string
  /** 部门名称 */
  department_name: string
  /** 部门信息员 */
  department_information: string
  /** 排序顺序 (可选，不填时后端默认为 0，值越小越靠前) */
  sort_order?: number
  /** 上级部门编码 (可选，null 表示根部门) */
  parent_code?: string | null
}

/**
 * 部门更新表单接口
 * 用于更新部门信息时的表单数据
 */
export interface DepartmentUpdateForm extends Partial<DepartmentCreateForm> {
  /** 部门编码 (唯一标识，用于定位要更新的记录) */
  department_code: string
}

/**
 * 部门基础接口
 * 对应后端数据库表 department_database_table 的基础字段
 */
export interface Department extends DepartmentCreateForm {
  /** 主键 ID */
  id: number
  /** 排序顺序 (后端返回，创建时若未传则默认为 0) */
  sort_order: number
  /** 上级部门编码 (null 表示根部门) */
  parent_code: string | null
  /** 部门层级 (0=根部门, 1=一级部门, 最大6层) */
  level: number
  /** 子部门列表 (后端返回树形结构时包含) */
  children?: Department[]
  /** 部门下员工数量 (统计字段) */
  employee_count?: number
}

/**
 * 部门简要信息
 * 用于根据工号查询部门、获取父部门等轻量级接口的返回值
 */
export interface DepartmentBrief {
  department_code: string
  department_name: string
  level: number
  parent_code: string | null
}

// ==================== 查询参数接口 ====================

/**
 * 部门查询参数接口
 * 用于部门列表查询时的筛选条件
 */
export interface DepartmentQueryParams {
  /** 页码 */
  page?: number
  /** 每页数量 */
  page_size?: number
  /** 搜索关键词 */
  search?: string
  /** 部门编码 */
  department_code?: string
  /** 部门名称 */
  department_name?: string
  /** 排序字段 */
  ordering?: string
  /** 索引签名：允许任意 string key，但值必须是 string/number/boolean/null/undefined */
  [key: string]: string | number | boolean | null | undefined
}

// ==================== 响应接口 ====================

/**
 * 部门列表响应接口
 */
export interface DepartmentListResponse {
  /** 总记录数 */
  count: number
  /** 下一页链接 */
  next: string | null
  /** 上一页链接 */
  previous: string | null
  /** 部门列表数据 */
  results: Department[]
}

/**
 * 部门简化接口
 * 用于在组件间引用
 */
export interface DepartmentItem {
  value: string
  department_name: string
  department_code: string
}

// ==================== 部门树形结构接口 ====================

/**
 * 部门树节点接口
 * 用于 el-tree 组件展示，继承 Department 并添加树形相关属性
 */
export interface DepartmentTreeNode extends Department {
  /** 节点标签（el-tree 显示用，默认使用 department_name） */
  label?: string
  /** 节点值（el-tree 值用，默认使用 department_code） */
  value?: string
  /** 是否为叶子节点（无子部门） */
  isLeaf?: boolean
  /** 是否展开（前端状态） */
  isExpanded?: boolean
  /** 子部门列表 */
  children?: DepartmentTreeNode[]
}

/**
 * 部门树查询参数
 */
export interface DepartmentTreeQueryParams {
  /** 是否包含员工数量统计 */
  with_employee_count?: boolean
  /** 指定根部门编码（不指定则返回完整树） */
  root_code?: string
  /** 索引签名：兼容 request.get 的 params 类型要求 */
  [key: string]: string | number | boolean | null | undefined
}

/**
 * 部门排序项
 * 用于批量更新排序
 */
export interface DepartmentSortItem {
  /** 部门编码 */
  department_code: string
  /** 排序顺序 */
  sort_order: number
}

/**
 * 移动部门请求参数
 * 注意：后端字段名为 target_parent_code，需与后端 MoveDepartmentSerializer 一致
 */
export interface MoveDepartmentParams {
  /** 目标父部门编码（null 表示移动到根） */
  target_parent_code: string | null
}

// ==================== 部门员工列表响应类型 ====================

/**
 * 部门员工列表响应接口
 * 后端返回格式: { department: {...}, employees_count: number, employees: [...] }
 */
export interface DepartmentEmployeeListResponse {
  /** 部门信息 */
  department: Department
  /** 员工数量 */
  employees_count: number
  /** 员工列表 */
  employees: EmployeeExtended[]
}

/**
 * 部门员工列表查询参数
 * 用于按条件筛选部门下的人员
 *
 * 支持筛选条件：
 * - status: 人员状态（active=在职, left=离职, retirement=退休）
 *
 * 使用示例：
 *   getDepartmentEmployees('DEP001', { status: 'active' }) // 获取在职人员
 */
export interface DepartmentEmployeeListQueryParams {
  /** 人员状态筛选（可选，不传则返回全部） */
  status?: 'active' | 'left' | 'retirement' | ''
  /** 索引签名：兼容 request.get 的 params 类型要求 */
  [key: string]: string | number | boolean | null | undefined
}

// ==================== 兼容性接口（保留原有的兼容性定义以兼容现有代码） ====================

export interface DepartmentForm {
  department_code: string
  department_name: string
  department_information: string
}

// export interface DepartmentCreateFormOld extends DepartmentForm {}

// export interface DepartmentUpdateFormOld extends DepartmentForm {}

export interface DepartmentOld extends DepartmentForm {
  id: number
}

export interface DepartmentQueryParamsOld {
  page?: number
  page_size?: number
  search?: string
  department_code?: string
  department_name?: string
  [key: string]: string | number | boolean | null | undefined
}

export interface DepartmentListResponseOld {
  success: boolean
  count: number
  next: string | null
  previous: string | null
  results: DepartmentOld[]
}

// ==================== Excel 导入类型 ====================

/**
 * Excel 批量导入部门的原始行数据
 * 键名与模板表头的中文字段对应
 */
export interface ExcelDepartmentData {
  /** 部门编码 */
  部门编码?: string
  /** 部门名称 */
  部门名称?: string
  /** 部门信息员 */
  部门信息员?: string
}

/**
 * 验证后的部门数据
 * 用于 Excel 批量导入后的验证结果
 */
export interface ValidatedDepartmentData {
  /** 部门编码 */
  department_code: string
  /** 部门名称 */
  department_name: string
  /** 部门信息员 */
  department_information: string
  /** 验证状态：success 或 error */
  validationStatus: 'success' | 'error'
  /** 验证错误信息 */
  validationError: string
}
