/**
 * @file 员工管理 API，提供员工的增删改查、批量操作等接口
 * @module api/user
 * @exports
 *   - userAPI: 员工管理 API 对象（包含所有员工相关方法）
 *   - EmployeeBatchCreateResult: 批量创建员工响应类型
 * @callers
 *   - stores/userStore: 员工状态管理
 *   - composables/useDepartmentCache: 部门缓存组合式函数
 *   - composables/useEmployeeSuggestionFetcher: 员工建议获取组合式函数
 *   - views/ContactsView: 通讯录视图
 * @dependsOn
 *   - api/request.ts: 使用 request 实例
 *   - types/user: 员工相关类型定义
 *   - types/department: 部门相关类型定义
 *   - stores/createEntityStore: 批量删除结果类型
 */
import { request, unwrapResponse } from '@/api/index'
import { logError } from '@/utils/logger'
import type { BlobDownload } from '@/api/request'
import type {
  EmployeeListResponse,
  EmployeeExtended,
  EmployeeCreateForm,
  EmployeeUpdateForm,
} from '@/types/user'
import type { DepartmentBrief } from '@/types/department'
import type { BatchDeleteResult } from '@/stores/createEntityStore'
import type { BatchCreateResult } from '@/types/common'

/**
 * 批量创建员工响应
 * 对应后端 EmployeeViewSet.batch_create action 返回格式
 * fail_items 格式与后端 BatchOperationMixin.batch_execute 对齐
 */
export type EmployeeBatchCreateResult = BatchCreateResult<EmployeeExtended, EmployeeCreateForm>

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
    employee_status?: string
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
      logError('api/user', '获取员工详情失败', error)
      throw error
    }
  },

  /**
   * [LR-03] 按姓名搜索员工（复用 getFuzzySearch 唯一实现，DR-1）
   * @param employee_name 员工姓名
   * @returns 员工列表响应
   */
  getUserByName: async (employee_name: string): Promise<EmployeeListResponse> => {
    try {
      return await userAPI.getFuzzySearch({ keyword: employee_name })
    } catch (error) {
      logError('api/user', '根据姓名搜索员工失败', error)
      throw error
    }
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

  /**
   * 服务端导出员工列表（xlsx）
   *
   * 可见性由后端 EmployeeViewSet.get_queryset() 决定，与列表接口一致；
   * 导出权限走 CanExportExcel 矩阵（regular_user 403）。
   * 导出列不含手机号（后端最小化 PII）。
   *
   * @param params 可选分批参数。省略 limit/offset 时为全量导出，
   *   总行数超过 EXPORT_MAX_ROWS 会被后端拒绝（400）；
   *   传 limit/offset 则走分批导出，limit 被钳制到 EXPORT_MAX_ROWS。
   * @returns 文件内容 + 响应头（含 X-Export-Max-Rows / X-Export-Total-Count）
   */
  exportExcel: (params?: Record<string, unknown>): Promise<BlobDownload> => {
    return request.getBlob('/users/employees/export/', params, 'employees.xlsx')
  },
}
