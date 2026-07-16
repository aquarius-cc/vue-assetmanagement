/**
 * 员工管理 API
 * 对应后端接口: /api/users/employees/
 * 所有字段名采用 snake_case 与后端序列化器保持一致
 */
import { request, unwrapResponse } from '@/api/index'
import type {
  EmployeeListResponse,
  EmployeeExtended,
  EmployeeCreateForm,
  EmployeeUpdateForm,
} from '@/utils/User'
import type { DepartmentBrief } from '@/utils/Department'
import type { BatchDeleteResult } from '@/stores/createEntityStore'

/**
 * 批量创建员工响应
 * 对应后端 EmployeeViewSet.batch_create action 返回格式
 * fail_items 格式与后端 BatchOperationMixin.batch_execute 对齐
 */
export interface EmployeeBatchCreateResult {
  total: number
  success_count: number
  fail_count: number
  success_items: EmployeeExtended[]
  fail_items: Array<{
    index: number
    error_code: string
    error_message: string
    input_data: EmployeeCreateForm
    row_number?: number
  }>
}

/**
 * 员工管理 API
 */
export const userAPI = {
  /**
   * 获取员工列表
   * @param params 分页参数
   * @returns 员工列表响应
   */
  getUserList: (params: {
    page: number
    page_size: number
    department_code?: string
  }): Promise<EmployeeListResponse> => {
    return unwrapResponse(request.get<EmployeeListResponse>('/users/employees/', params))
  },

  /**
   * 全局模糊搜索员工
   * @param params 搜索参数（keyword 为必填）
   * @returns 员工列表响应
   */
  getFuzzySearch: (params: {
    keyword: string
    department_code?: string
    page?: number
    page_size?: number
  }): Promise<EmployeeListResponse> => {
    return unwrapResponse(request.get<EmployeeListResponse>('/users/employees/search/', params))
  },

  /**
   * 根据工号获取员工详情（启用缓存）
   * @param employee_jobcode 员工工号
   * @returns 员工详情
   */
  getUserByCode: async (employee_jobcode: string): Promise<EmployeeExtended> => {
    try {
      return unwrapResponse(
        request.get<EmployeeExtended>(
          `/users/employees/${employee_jobcode}/`,
          undefined,
          true, // 使用缓存
          300000, // 缓存时间 5 分钟
        ),
      )
    } catch (error) {
      console.error('获取员工详情失败:', error)
      throw error
    }
  },

  /**
   * [LR-03] 按姓名搜索员工（补充末尾斜杠，使用 params 对象传参）
   * @param employee_name 员工姓名
   * @returns 员工列表响应
   */
  getUserByName: async (employee_name: string): Promise<EmployeeListResponse> => {
    try {
      return unwrapResponse(
        request.get<EmployeeListResponse>(`/users/employees/search/`, {
          keyword: employee_name,
        } as Record<string, string>),
      )
    } catch (error) {
      console.error('根据姓名搜索员工失败:', error)
      throw error
    }
  },

  /**
   * 获取在职员工列表
   * @returns 在职员工列表
   */
  getUserActivity: (): Promise<EmployeeExtended[]> => {
    return unwrapResponse(request.get<EmployeeExtended[]>('/users/employees/active_employees/'))
  },

  /**
   * 创建员工
   * @param data 员工创建表单数据
   * @returns 创建的员工信息
   */
  createUser: (data: EmployeeCreateForm): Promise<EmployeeExtended> => {
    return unwrapResponse(request.post<EmployeeExtended>('/users/employees/', data))
  },

  /**
   * 更新员工信息（通过工号）
   * @param data 员工更新表单数据（需包含 employee_jobcode）
   * @returns 更新后的员工信息
   */
  updateUser: (data: Partial<EmployeeUpdateForm>): Promise<EmployeeExtended> => {
    if (!data.employee_jobcode) {
      throw new Error('employee_jobcode is required for update')
    }
    return unwrapResponse(
      request.put<EmployeeExtended>(`/users/employees/${data.employee_jobcode}/`, data),
    )
  },

  /**
   * 删除员工（通过工号）
   * @param employee_jobcode 员工工号
   */
  deleteUser: (employee_jobcode: string): Promise<void> => {
    return unwrapResponse(request.delete<void>(`/users/employees/${employee_jobcode}/`))
  },

  /**
   * 批量删除员工
   * POST /api/users/employees/batch-delete/
   * 对应后端 EmployeeViewSet.batch_delete action
   */
  batchDeleteUsers: (employee_jobcodes: string[]): Promise<BatchDeleteResult> => {
    return unwrapResponse(
      request.post<BatchDeleteResult>('/users/employees/batch-delete/', {
        ids: employee_jobcodes,
      }),
    )
  },

  /**
   * 批量创建员工
   * POST /api/users/employees/batch-create/
   * 对应后端 EmployeeViewSet.batch_create action
   * 一次性提交多条员工数据，后端逐条处理并返回成功/失败明细
   */
  batchCreateUsers: (items: EmployeeCreateForm[]): Promise<EmployeeBatchCreateResult> => {
    return unwrapResponse(
      request.post<EmployeeBatchCreateResult>('/users/employees/batch-create/', {
        items,
      }),
    )
  },

  /**
   * 更改员工状态
   * @param employee_jobcode 员工工号
   * @param status 新状态（active/left/retirement）
   * @returns 更新后的员工信息
   */
  changeUserStatus: (employee_jobcode: string, status: string): Promise<EmployeeExtended> => {
    return unwrapResponse(
      request.post<EmployeeExtended>(`/users/employees/${employee_jobcode}/change_status/`, {
        status,
      }),
    )
  },

  /**
   * 批量更新员工排序
   * [MR-04] 后端 v1.1.0 要求请求体为 { items: [...] } 包装对象
   * @param sortData 排序数据列表 { employee_jobcode, sort_order }
   * @returns 更新后的员工列表
   */
  batchUpdateSort: (
    sortData: { employee_jobcode: string; sort_order: number }[],
  ): Promise<EmployeeExtended[]> => {
    return unwrapResponse(
      request.put<EmployeeExtended[]>('/users/employees/sort/', { items: sortData }),
    )
  },

  /**
   * 根据工号查询员工所在部门
   * GET /api/users/employees/{employee_jobcode}/department/
   * @param employee_jobcode 员工工号
   * @returns 部门简要信息（department_code, department_name, level, parent_department_code）
   */
  getEmployeeDepartment: (employee_jobcode: string): Promise<DepartmentBrief> => {
    return unwrapResponse(
      request.get<DepartmentBrief>(
        `/users/employees/${employee_jobcode}/department/`,
        undefined,
        true, // 使用缓存
        300000,
      ),
    )
  },
}
