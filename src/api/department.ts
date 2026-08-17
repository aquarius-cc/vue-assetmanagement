/**
 * @file 部门管理 API，提供部门的增删改查、树形结构、批量操作等接口
 * @module api/department
 * @exports
 *   - departmentAPI: 部门管理 API 对象（包含所有部门相关方法）
 *   - DepartmentBatchCreateResult: 批量创建部门响应类型
 * @callers
 *   - stores/departmentStore: 部门状态管理
 *   - views/ContactsView: 通讯录视图
 * @dependsOn
 *   - api/request.ts: 使用 request 实例
 *   - types/department: 部门相关类型定义
 *   - stores/createEntityStore: 批量删除结果类型
 */
import { request, unwrapResponse } from '@/api/index'
import type {
  Department,
  DepartmentQueryParams,
  DepartmentListResponse,
  DepartmentCreateForm,
  DepartmentUpdateForm,
  DepartmentTreeNode,
  DepartmentTreeQueryParams,
  DepartmentSortItem,
  MoveDepartmentParams,
  DepartmentEmployeeListResponse,
  DepartmentEmployeeListQueryParams,
} from '@/types/department'
import type { BatchDeleteResult } from '@/stores/createEntityStore'

/**
 * 批量创建部门响应
 * 对应后端 DepartmentViewSet.batch_create action 返回格式
 * fail_items 格式与后端 BatchOperationMixin.batch_execute 对齐
 */
export interface DepartmentBatchCreateResult {
  total: number
  success_count: number
  fail_count: number
  success_items: Department[]
  fail_items: Array<{
    index: number
    error_code: string
    error_message: string
    input_data: DepartmentCreateForm
    row_number?: number
  }>
}

/**
 * 部门管理 API
 */
export const departmentAPI = {
  /**
   * 获取部门列表
   * @param params 查询参数
   * @returns 部门列表响应
   */
  getDepartmentList: (params?: DepartmentQueryParams): Promise<DepartmentListResponse> => {
    return unwrapResponse(request.get<DepartmentListResponse>('/users/departments/', params))
  },

  /**
   * 获取部门详情（启用缓存）
   * @param department_code 部门编码
   * @returns 部门详情
   */
  getDepartment: (department_code: string): Promise<Department> => {
    return unwrapResponse(
      request.get<Department>(
        `/users/departments/${department_code}/`,
        undefined,
        true, // 使用缓存
        300000, // 缓存时间 5 分钟
      ),
    )
  },

  /**
   * 创建部门
   * @param data 部门创建表单数据
   * @returns 创建的部门信息
   */
  createDepartment: (data: DepartmentCreateForm): Promise<Department> => {
    return unwrapResponse(request.post<Department>('/users/departments/', data))
  },

  /**
   * 更新部门信息
   * @param data 部门更新表单数据（需包含 department_code）
   * @returns 更新后的部门信息
   */
  updateDepartment: (data: Partial<DepartmentUpdateForm>): Promise<Department> => {
    if (!data.department_code) {
      throw new Error('department_code is required for update')
    }
    return unwrapResponse(
      request.put<Department>(`/users/departments/${data.department_code}/`, data),
    )
  },

  /**
   * 删除部门
   * @param department_code 部门编码
   */
  deleteDepartment: (department_code: string): Promise<void> => {
    return unwrapResponse(request.delete<void>(`/users/departments/${department_code}/`))
  },

  /**
   * 批量删除部门
   * POST /api/users/departments/batch-delete/
   * 对应后端 DepartmentViewSet.batch_delete action
   */
  batchDeleteDepartments: (department_codes: string[]): Promise<BatchDeleteResult> => {
    return unwrapResponse(
      request.post<BatchDeleteResult>('/users/departments/batch-delete/', {
        ids: department_codes,
      }),
    )
  },

  /**
   * 批量创建部门
   * POST /api/users/departments/batch-create/
   * 对应后端 DepartmentViewSet.batch_create action
   * 一次性提交多条部门数据，后端逐条处理并返回成功/失败明细
   */
  batchCreateDepartments: (items: DepartmentCreateForm[]): Promise<DepartmentBatchCreateResult> => {
    return unwrapResponse(
      request.post<DepartmentBatchCreateResult>('/users/departments/batch-create/', {
        items,
      }),
    )
  },

  /**
   * 获取部门下的员工列表
   * 后端返回格式: { department: {...}, employees_count: number, employees: [...] }
   *
   * @param department_code 部门编码
   * @param params 查询参数（可选：status 状态筛选）
   * @returns 员工列表响应对象
   *
   * 使用示例：
   *   // 获取全部人员
   *   getDepartmentEmployeeList('DEP001')
   *   // 只获取在职人员
   *   getDepartmentEmployeeList('DEP001', { status: 'active' })
   */
  getDepartmentEmployeeList: (
    department_code: string,
    params?: DepartmentEmployeeListQueryParams,
  ): Promise<DepartmentEmployeeListResponse> => {
    return unwrapResponse(
      request.get<DepartmentEmployeeListResponse>(
        `/users/departments/${department_code}/employees/`,
        params,
      ),
    )
  },

  // ==================== 部门树形结构 API ====================

  /**
   * 获取部门树
   * @param params 查询参数（可选：是否包含员工数量、指定根部门）
   * @returns 部门树节点列表
   */
  getDepartmentTree: (params?: DepartmentTreeQueryParams): Promise<DepartmentTreeNode[]> => {
    return unwrapResponse(request.get<DepartmentTreeNode[]>('/users/departments/tree/', params))
  },

  /**
   * 获取子部门
   * @param department_code 部门编码
   * @returns 直接子部门列表
   */
  getDepartmentChildren: (department_code: string): Promise<DepartmentTreeNode[]> => {
    return unwrapResponse(
      request.get<DepartmentTreeNode[]>(`/users/departments/${department_code}/children/`),
    )
  },

  /**
   * 移动部门（修改父级）
   * @param department_code 部门编码
   * @param params 移动参数（新父部门编码）
   * @returns 移动后的部门信息
   */
  moveDepartment: (department_code: string, params: MoveDepartmentParams): Promise<Department> => {
    return unwrapResponse(
      request.put<Department>(`/users/departments/${department_code}/move/`, params),
    )
  },

  /**
   * 批量更新部门排序
   * [MR-05] 后端 v1.1.0 要求请求体为 { items: [...] } 包装对象
   * @param sortData 排序数据列表
   * @returns 更新后的部门列表
   */
  sortDepartments: (sortData: DepartmentSortItem[]): Promise<Department[]> => {
    return unwrapResponse(
      request.put<Department[]>('/users/departments/sort/', { items: sortData }),
    )
  },
}
