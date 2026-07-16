/**
 * 部门管理 Store
 * 基于 createEntityStore 工厂创建
 */
import { createEntityStore } from '@/stores/createEntityStore'
import { departmentAPI } from '@/api/department'
import type {
  Department,
  DepartmentCreateForm,
  DepartmentUpdateForm,
  DepartmentEmployeeListResponse,
  DepartmentEmployeeListQueryParams,
} from '@/utils/Department'
import type { EmployeeExtended } from '@/utils/User'
import { ElMessage } from 'element-plus'
import type { PaginationQuery } from '@/stores/createEntityStore'
import type { MoveDepartmentParams } from '@/utils/Department'

/**
 * 辅助函数：确保创建数据符合 DepartmentCreateForm
 * @param data 输入数据
 * @returns 符合要求的创建表单数据
 */
const ensureDepartmentCreateForm = (data: Partial<Department>): DepartmentCreateForm => {
  const requiredFields: (keyof DepartmentCreateForm)[] = [
    'department_code',
    'department_name',
    'department_information',
  ]

  for (const field of requiredFields) {
    if (data[field] == null || data[field] === '') {
      throw new Error(`${field} is required`)
    }
  }

  return {
    department_code: data.department_code!.trim(),
    department_name: data.department_name!.trim(),
    department_information: data.department_information!.trim(),
    // 排序顺序：可选字段，未填时默认传 0（与后端默认值一致）
    sort_order: data.sort_order ?? 0,
  }
}

/**
 * 辅助函数：确保更新数据合规
 * @param data 输入数据
 * @returns 符合要求的更新表单数据
 */
const ensureDepartmentUpdateForm = (data: Partial<Department>): DepartmentUpdateForm => {
  if (!data.department_code) throw new Error('更新部门失败：部门编码不能为空')

  return {
    department_code: data.department_code.trim(),
    department_name: data.department_name?.trim(),
    department_information: data.department_information?.trim(),
    // 排序顺序：可选字段，有值则透传，无值则不传（保持后端原值）
    ...(data.sort_order !== undefined && { sort_order: data.sort_order }),
  }
}

/**
 * 部门 Store
 */
export const useDepartmentStore = createEntityStore<Department, PaginationQuery>('department', {
  idKey: 'department_code',
  nameField: 'department_name',
  displayName: '部门',
  api: {
    getList: async (params?: PaginationQuery) => {
      const safeParams: PaginationQuery = params || {
        page: 1,
        page_size: 10,
      }
      const response = await departmentAPI.getDepartmentList(safeParams)
      return {
        count: response.count,
        next: response.next,
        previous: response.previous,
        results: response.results as Department[],
      }
    },
    getById: (code) => departmentAPI.getDepartment(code),
    create: (data) => departmentAPI.createDepartment(ensureDepartmentCreateForm(data)),
    update: (data) => departmentAPI.updateDepartment(ensureDepartmentUpdateForm(data)),
    delete: (department_code: string) => {
      if (!department_code) throw new Error('删除部门失败：部门编码不能为空')
      return departmentAPI.deleteDepartment(department_code)
    },
    batchDelete: (codes) => departmentAPI.batchDeleteDepartments(codes),
  },
  message: ElMessage,
  enablePagination: true,
  defaultPageSize: 20,
  enableCache: false,
})

// ==================== 部门树形结构扩展方法 ====================

/**
 * 获取部门树
 * @param withEmployeeCount 是否包含员工数量
 * @returns 部门树节点列表
 */
export const getDepartmentTree = async (withEmployeeCount = true) => {
  return departmentAPI.getDepartmentTree({ with_employee_count: withEmployeeCount })
}

/**
 * 获取子部门
 * @param departmentCode 部门编码
 * @returns 子部门列表
 */
export const getDepartmentChildren = async (departmentCode: string) => {
  return departmentAPI.getDepartmentChildren(departmentCode)
}

/**
 * 移动部门
 * @param departmentCode 部门编码
 * @param parentCode 新父部门编码（null 表示根）
 */
export const moveDepartment = async (departmentCode: string, params: MoveDepartmentParams) => {
  return departmentAPI.moveDepartment(departmentCode, params)
}

/**
 * 批量排序部门
 * @param sortData 排序数据
 */
export const sortDepartments = async (
  sortData: { department_code: string; sort_order: number }[],
) => {
  return departmentAPI.sortDepartments(sortData)
}

/**
 * 获取部门下的人员列表
 * 通过 Store 层封装 API 调用，统一数据访问入口
 * 后端返回格式: { department, employees_count, employees }
 *
 * @param departmentCode 部门编码
 * @param params 查询参数（可选：status 状态筛选）
 * @returns 员工列表（按 sort_order 升序）
 *
 * 使用示例：
 *   // 获取全部人员
 *   getDepartmentEmployees('DEP001')
 *   // 只获取在职人员
 *   getDepartmentEmployees('DEP001', { status: 'active' })
 */
export const getDepartmentEmployees = async (
  departmentCode: string,
  params?: DepartmentEmployeeListQueryParams,
): Promise<EmployeeExtended[]> => {
  const response: DepartmentEmployeeListResponse = await departmentAPI.getDepartmentEmployeeList(
    departmentCode,
    params,
  )

  // 从响应中提取 employees 数组（类型安全，无需 as any）
  const list = response?.employees ?? []

  // 按 sort_order 升序排列，null 值排到最后
  return list.sort((a, b) => (a.sort_order ?? 999) - (b.sort_order ?? 999))
}
