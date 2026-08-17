// === employee.d.ts ===
// 员工相关的TypeScript类型定义

// ===== 员工状态枚举 =====
export type EmployeeStatus = 'active' | 'left' | 'retirement'

// ===== 员工基本信息 =====
export interface Employee {
  // 主键
  id: string
  
  // 员工工号
  employeeId: string
  
  // 员工姓名
  name: string
  
  // 所属部门
  department: string
  
  // 职位
  position: string
  
  // 员工状态（使用定义的EmployeeStatus类型）
  status: EmployeeStatus
  
  // 入职日期
  hireDate: string
  
  // 联系电话
  phone: string
  
  // 电子邮件
  email: string
  
  // 备注信息（可选字段）
  remark?: string
  
  // 创建时间（可选字段）
  createdAt?: string
  
  // 更新时间（可选字段）
  updatedAt?: string
}

// ===== 员工表单数据类型 =====
export interface EmployeeFormData {
  name: string
  employeeId: string
  department: string
  position: string
  status: EmployeeStatus
  hireDate: string
  phone: string
  email: string
  remark?: string
}

// ===== 员工查询参数 =====
export interface EmployeeQueryParams {
  page?: number
  pageSize?: number
  status?: EmployeeStatus
  department?: string
  keyword?: string
}

// ===== 员工状态选项 =====
export const EMPLOYEE_STATUS_OPTIONS: Array<{ value: EmployeeStatus; label: string }> = [
  { value: 'active', label: '在职' },
  { value: 'left', label: '离职' },
  { value: 'retirement', label: '退休' },
]

// ===== 验证相关的类型 =====
export interface EmployeeValidationResult {
  isValid: boolean
  errors: Record<keyof EmployeeFormData, string[]>
}