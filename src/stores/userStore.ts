/**
 * 员工管理 Store
 * 基于 createEntityStore 工厂创建
 */
import { createEntityStore } from '@/stores/createEntityStore'
import { userAPI } from '@/api/user'
import type { EmployeeExtended, EmployeeCreateForm, EmployeeUpdateForm } from '@/utils/User'
import type { PaginationQuery } from '@/stores/createEntityStore'
import { EmployeeStatus } from '@/utils/User'
import { ElMessage } from 'element-plus'

/**
 * 辅助函数：确保创建数据符合 EmployeeCreateForm
 * @param data 输入数据
 * @returns 符合要求的创建表单数据
 */
const ensureEmployeeCreateForm = (data: Partial<EmployeeExtended>): EmployeeCreateForm => {
  const requiredFields: (keyof EmployeeCreateForm)[] = [
    'employee_jobcode',
    'employee_name',
    'employee_status',
    'employee_phone',
    'employee_location',
    'employee_department_code',
  ]

  for (const field of requiredFields) {
    if (data[field] == null || data[field] === '') {
      throw new Error(`${field} 不能为空`)
    }
  }

  const validStatus = String(data.employee_status)
  if (!Object.values(EmployeeStatus).includes(validStatus as EmployeeStatus)) {
    throw new Error(`员工状态【${data.employee_status}】不合法（仅支持：active/left/retirement）`)
  }

  return {
    employee_jobcode: data.employee_jobcode!.trim(),
    employee_name: data.employee_name!.trim(),
    employee_status: validStatus as EmployeeStatus,
    employee_phone: data.employee_phone!.trim(),
    employee_location: data.employee_location!.trim(),
    employee_department_code: data.employee_department_code!.trim(),
    employee_description: data.employee_description?.trim() || null,
    // 排序顺序：可选字段，未填时默认传 0（与后端默认值一致）
    sort_order: data.sort_order ?? 0,
  }
}

/**
 * 辅助函数：确保更新数据合规
 * @param data 输入数据
 * @returns 符合要求的更新表单数据
 */
const ensureEmployeeUpdateForm = (data: Partial<EmployeeExtended>): EmployeeUpdateForm => {
  const ensureData: EmployeeUpdateForm = {} as EmployeeUpdateForm

  if (data.employee_jobcode) ensureData.employee_jobcode = data.employee_jobcode.trim()
  if (data.employee_name) ensureData.employee_name = data.employee_name.trim()
  if (data.employee_status) {
    const validStatus = String(data.employee_status)
    if (Object.values(EmployeeStatus).includes(validStatus as EmployeeStatus)) {
      ensureData.employee_status = validStatus as EmployeeStatus
    } else {
      throw new Error(`员工状态【${data.employee_status}】不合法`)
    }
  }
  if (data.employee_phone) ensureData.employee_phone = data.employee_phone.trim()
  if (data.employee_location) ensureData.employee_location = data.employee_location.trim()
  if (data.employee_description !== undefined) {
    ensureData.employee_description = data.employee_description?.trim() || null
  }
  if (data.employee_department_code)
    ensureData.employee_department_code = data.employee_department_code.trim()
  // 排序顺序：可选字段，有值则透传，无值则不传（保持后端原值）
  if (data.sort_order !== undefined) ensureData.sort_order = data.sort_order

  return ensureData
}

/**
 * 员工 Store
 */
export const useUserStore = createEntityStore<EmployeeExtended, PaginationQuery>('user', {
  idKey: 'employee_jobcode',
  nameField: 'employee_name',
  displayName: '员工',
  api: {
    getList: async (params?: PaginationQuery) => {
      const safeParams: PaginationQuery = params || {
        page: 1,
        page_size: 20,
      }
      const response = await userAPI.getUserList(safeParams)
      return {
        count: response.count,
        next: response.next,
        previous: response.previous,
        results: response.results as EmployeeExtended[],
      }
    },
    getById: async (employee_jobcode: string) => {
      const response = await userAPI.getUserByCode(employee_jobcode)
      return response
    },
    getByName: async (name: string) => {
      const response = await userAPI.getUserByName(name)
      return response.results as EmployeeExtended[]
    },
    create: (data) => userAPI.createUser(ensureEmployeeCreateForm(data)),
    update: (data) => {
      if (!data.employee_jobcode) throw new Error('更新员工失败：工号不能为空')
      return userAPI.updateUser(ensureEmployeeUpdateForm(data))
    },
    delete: (employee_jobcode: string) => {
      if (!employee_jobcode) throw new Error('删除员工失败：工号不能为空')
      return userAPI.deleteUser(employee_jobcode)
    },
    batchDelete: (codes) => userAPI.batchDeleteUsers(codes),
  },
  message: ElMessage,
  idToString: (id) => String(id),
  autoSync: true,
  enablePagination: true,
  defaultPageSize: 20,
  enableCache: false,
  cacheTTL: 5 * 60 * 1000,
})
