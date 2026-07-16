/**
 * 用户（员工）数据模型
 * 对应后端数据库表: user_database_table
 */

import type { Department } from '@/types/department'

// ==================== 枚举类型定义 ====================

/**
 * 员工状态枚举
 * active: 在职
 * left: 离职
 * retirement: 退休
 */
export enum EmployeeStatus {
  ACTIVE = 'active',
  LEFT = 'left',
  RETIREMENT = 'retirement',
}

// ==================== 基础接口定义 ====================

/**
 * Excel 批量导入的原始行数据
 * 键名与模板表头的中文字段对应
 */
export interface ExcelEmployeeData {
  /** 姓名 */
  姓名?: string
  /** 工号 */
  工号?: string
  /** 电话 */
  电话?: string
  /** 位置 */
  位置?: string
  /** 状态（中文描述或英文值） */
  状态?: string
  /** 排序顺序 */
  排序?: number
  /** 部门代码（可选，优先使用“部门”名称反查） */
  部门代码?: string
  /** 部门名称（用于反查部门代码） */
  部门?: string
  /** 描述 */
  描述?: string
}

/**
 * 员工创建表单接口
 * 用于创建新员工时的表单数据
 */
export interface EmployeeCreateForm {
  /** 员工工号 (唯一标识) */
  employee_jobcode: string
  /** 员工姓名 */
  employee_name: string
  /** 员工状态 */
  employee_status: EmployeeStatus | string
  /** 所属部门编码 (外键关联 department_database_table.department_code) */
  employee_department_code: string
  /** 员工电话 */
  employee_phone: string
  /** 员工位置 */
  employee_location: string
  /** 员工描述 (可选) */
  employee_description?: string | null
  /** 排序顺序 (可选，不填时后端默认为 0，值越小越靠前) */
  sort_order?: number
}

/**
 * 员工更新表单接口
 * 用于更新员工信息时的表单数据
 */
export interface EmployeeUpdateForm extends Partial<EmployeeCreateForm> {
  /** 员工工号 (唯一标识，用于定位要更新的记录) */
  employee_jobcode: string
}

/**
 * 员工基础接口
 * 对应后端数据库表 user_database_table 的基础字段
 */
export interface Employee extends EmployeeCreateForm {
  /** 主键 ID */
  id: number
  /** 创建时间 */
  create_time: string
  /** 更新时间 */
  update_time: string
  /** 是否删除标记 */
  is_delete: boolean
  /** 排序顺序 (后端返回，创建时若未传则默认为 0) */
  sort_order: number
  employee_department_name?: string | null
}

/**
 * 员工扩展接口
 * 包含关联对象的完整数据
 */
export interface EmployeeExtended extends Employee {
  /** 所属部门完整信息 (外键关联对象) */
  employee_department?: Department
  employee_department_name?: string | null
}

// ==================== 查询参数接口 ====================

/**
 * 员工查询参数接口
 * 用于员工列表查询时的筛选条件
 */
export interface EmployeeQueryParams {
  /** 页码 */
  page?: number
  /** 每页数量 */
  page_size?: number
  /** 搜索关键词 */
  search?: string
  /** 员工工号 */
  employee_jobcode?: string
  /** 员工姓名 */
  employee_name?: string
  /** 员工状态 */
  employee_status?: string
  /** 所属部门编码 */
  employee_department_code?: string
  /** 排序字段 */
  ordering?: string
  /** 索引签名：允许任意 string key，但值必须是 string/number/boolean/null/undefined */
  [key: string]: string | number | boolean | null | undefined
}

// ==================== 响应接口 ====================

/**
 * 员工列表响应接口
 */
export interface EmployeeListResponse {
  /** 总记录数 */
  count: number
  /** 下一页链接 */
  next: string | null
  /** 上一页链接 */
  previous: string | null
  /** 员工列表数据 */
  results: Employee[]
}

/**
 * 员工简化接口
 * 用于在组件间引用
 */
export interface EmployeeItem {
  value: string
  employee_name: string
  employee_jobcode: string
}

// ==================== 统计接口（保留原有的兼容性定义以兼容现有代码
export interface EmployeeForm {
  employee_jobcode: string
  employee_name: string
  employee_status: string
  employee_location: string
  employee_department?: string
  employee_phone: string
  employee_description?: string | null
}

export interface EmployeeUpdateFormOld {
  employee_jobcode: string
  employee_name: string
  employee_status: string
  employee_location: string
  employee_department: string
  employee_phone: string
  employee_description: string | null
}

export interface EmployeeOld {
  id: number
  employee_jobcode: string
  employee_name: string
  employee_status: string
  employee_location: string
  employee_department: string
  employee_phone: string
  employee_description: string | null
}

export interface EmployeeOldExtended extends EmployeeOld {
  employee_department_name?: string
}

export interface EmployeeQueryParamsOld {
  page?: number
  page_size?: number
  search?: string
  employee_jobcode?: string
  employee_name?: string
  employee_status?: string
  employee_department?: string
  [key: string]: string | number | boolean | null | undefined
}

export interface EmployeeListResponseOld {
  success: boolean
  count: number
  next: string | null
  previous: string | null
  results: EmployeeOld[]
}

// ==================== Excel 导入验证类型 ====================

/**
 * 验证后的员工数据
 * 用于 Excel 批量导入后的验证结果
 */
export interface ValidatedEmployeeData {
  /** 员工姓名 */
  user_name: string
  /** 员工工号 */
  user_jobcode: string
  /** 员工电话 */
  user_phone: string
  /** 员工位置 */
  user_location: string
  /** 员工状态 */
  user_status: string
  /** 部门代码 */
  user_department_code: string
  /** 部门名称 */
  user_department_name: string
  /** 描述 */
  user_description: string
  /** 验证状态：success 或 error */
  validationStatus: 'success' | 'error'
  /** 验证错误信息 */
  validationError: string
}
