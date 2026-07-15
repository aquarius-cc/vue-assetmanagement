/**
 * 部门数据模型
 * 对应后端数据库表: am_department
 *
 * 树形关联设计（方案 D）：
 * - parent: FK 指向父级 recordcode
 * - parent_department_code: 父级业务编码（方便用户操作）
 * - path: 物化路径，如 /ROOT/IT/DEV
 */

import type { EmployeeExtended } from '@/types/user'

// ==================== 基础接口定义 ====================

/**
 * 部门创建表单接口
 * 用于创建新部门时的表单数据
 */
export interface DepartmentCreateForm {
  /** 部门编码 (唯一标识) */
  department_code: string
  /** 部门名称 */
  department_name: string
  /** 部门信息员 */
  department_information: string
  /** 排序顺序 (可选，不填时后端默认为 0，值越小越靠前) */
  sort_order?: number
  /** 上级部门业务编码 (可选，null 表示根部门) */
  parent_department_code?: string | null
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
 * 对应后端数据库表 am_department 的基础字段
 */
export interface Department {
  /** recordcode (唯一标识) */
  recordcode: string
  /** 部门编码 */
  department_code: string
  /** 部门名称 */
  department_name: string
  /** 部门信息员 */
  department_information: string
  /** 上级部门 FK ID (recordcode) */
  parent: string | null
  /** 上级部门业务编码 */
  parent_department_code: string | null
  /** 物化路径 */
  path: string
  /** 部门层级 (0=根部门, 1=一级部门, 最大6层) */
  level: number
  /** 排序顺序 */
  sort_order: number
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
  recordcode: string
  department_code: string
  department_name: string
  level: number
  parent_department_code: string | null
  path: string
}

// ==================== 查询参数接口 ====================

/**
 * 部门查询参数接口
 */
export interface DepartmentQueryParams {
  page?: number
  page_size?: number
  search?: string
  department_code?: string
  department_name?: string
  ordering?: string
  [key: string]: string | number | boolean | null | undefined
}

// ==================== 响应接口 ====================

/**
 * 部门列表响应接口
 */
export interface DepartmentListResponse {
  count: number
  next: string | null
  previous: string | null
  results: Department[]
}

/**
 * 部门简化接口
 */
export interface DepartmentItem {
  value: string
  department_name: string
  department_code: string
}

// ==================== 部门树形结构接口 ====================

/**
 * 部门树节点接口
 */
export interface DepartmentTreeNode extends Department {
  label?: string
  value?: string
  isLeaf?: boolean
  isExpanded?: boolean
  children?: DepartmentTreeNode[]
}

/**
 * 部门树查询参数
 */
export interface DepartmentTreeQueryParams {
  with_employee_count?: boolean
  root_code?: string
  [key: string]: string | number | boolean | null | undefined
}

/**
 * 部门排序项
 */
export interface DepartmentSortItem {
  department_code: string
  sort_order: number
}

/**
 * 移动部门请求参数
 * 后端字段名为 target_parent_department_code
 */
export interface MoveDepartmentParams {
  /** 目标父部门业务编码（null 表示移动到根） */
  target_parent_department_code: string | null
}

// ==================== 部门员工列表响应类型 ====================

export interface DepartmentEmployeeListResponse {
  department: Department
  employees_count: number
  employees: EmployeeExtended[]
}

export interface DepartmentEmployeeListQueryParams {
  status?: 'active' | 'left' | 'retirement' | ''
  [key: string]: string | number | boolean | null | undefined
}

// ==================== 兼容性接口 ====================

export interface DepartmentForm {
  department_code: string
  department_name: string
  department_information: string
}

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

export interface ExcelDepartmentData {
  部门编码?: string
  部门名称?: string
  部门信息员?: string
}

export interface ValidatedDepartmentData {
  department_code: string
  department_name: string
  department_information: string
  validationStatus: 'success' | 'error'
  validationError: string
}
