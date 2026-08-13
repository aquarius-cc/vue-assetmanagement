/**
 * @file AuthUser 管理 API，提供认证用户的增删改查、角色绑定等接口
 * @module api/authusers
 * @exports
 *   - authUserAPI: AuthUser 管理 API 对象（包含所有认证用户相关方法）
 *   - EmployeeBrief: 员工简要信息接口
 *   - UserRole: 用户角色关联接口
 * @callers
 *   - views/system/AuthUserManage: 认证用户管理视图
 * @dependsOn
 *   - api/request.ts: 使用 request 实例
 *   - types/authuser: 认证用户相关类型定义
 */
import { request, unwrapResponse } from '@/api/index'
import type { AuthUser, AuthUserCreateForm, AuthUserListResponse } from '@/types/authuser'

/** 员工简要信息（用于绑定查询） */
export interface EmployeeBrief {
  employee_jobcode: string
  employee_name: string
  employee_status: string
  auth_user: number | null
  auth_user_username: string | null
}

/** 角色简要信息（用于角色分配） */
// export interface RoleBrief {
//   id: number
//   role_code: string
//   role_name: string
// }

/** 用户-角色关联（与后端 UserRoleSerializer 字段对齐） */
export interface UserRole {
  id: number
  auth_user: number
  role: number
  role_name: string
  role_code: string
  data_scope: Record<string, unknown>
  created_at: string
}

export const authUserAPI = {
  // ==================== AuthUser CRUD ====================

  /** 获取 AuthUser 列表 */
  getAuthUsers: (params?: Record<string, string | number | boolean | null | undefined>) => {
    return unwrapResponse(request.get<AuthUserListResponse>('/auth/users/', params))
  },

  /** 获取 AuthUser 详情 */
  getAuthUser: (id: number) => {
    return unwrapResponse(request.get<AuthUser>(`/auth/users/${id}/`))
  },

  /** 创建 AuthUser */
  createAuthUser: (data: AuthUserCreateForm) => {
    return unwrapResponse(request.post<AuthUser>('/auth/users/', data))
  },

  /** 更新 AuthUser */
  updateAuthUser: (id: number, data: Partial<AuthUserCreateForm>) => {
    return unwrapResponse(request.put<AuthUser>(`/auth/users/${id}/`, data))
  },

  /** 删除 AuthUser */
  deleteAuthUser: (id: number) => {
    return unwrapResponse(request.delete(`/auth/users/${id}/`))
  },

  // ==================== 绑定 Employee ↔ AuthUser ====================

  /** 根据 AuthUser ID 查询绑定的 Employee */
  getBoundEmployee: (authId: number) => {
    return unwrapResponse(request.get<EmployeeBrief>(`/users/employees/by-auth-user/${authId}/`))
  },

  /** 绑定 Employee 到 AuthUser */
  bindAuthUser: (jobcode: string, authUsername: string) => {
    return unwrapResponse(
      request.post(`/users/employees/${jobcode}/bind-auth-user/`, { auth_username: authUsername }),
    )
  },

  /** 解绑 Employee 的 AuthUser */
  unbindAuthUser: (jobcode: string) => {
    return unwrapResponse(request.post(`/users/employees/${jobcode}/unbind-auth-user/`))
  },

  /** 替换 Employee 的 AuthUser */
  replaceAuthUser: (jobcode: string, newAuthUsername: string) => {
    return unwrapResponse(
      request.post(`/users/employees/${jobcode}/replace-auth-user/`, {
        auth_username: newAuthUsername,
      }),
    )
  },

  // ==================== 用户角色分配 ====================

  /** 获取用户的所有角色 */
  /** @param userId 用户ID
   * 后端 UserRoleViewSet 设置了 pagination_class = None，
   * 但 ResponseWrapperMixin.list() 无分页时仍包装为 {count, results} 结构。
   * unwrapResponse 提取 res.data 后得到一个对象而非数组，需要声明正确的返回类型。
   */
  getUserRoles: (userId: number) => {
    return unwrapResponse(
      request.get<{ count: number; results: UserRole[] }>(`/users/${userId}/roles/`),
    )
  },

  /** 为用户分配角色 */
  assignUserRole: (userId: number, roleId: number) => {
    return unwrapResponse(request.post(`/users/${userId}/roles/`, { role_id: roleId }))
  },

  /** 撤销用户角色 */
  removeUserRole: (userId: number, rolePk: number) => {
    return unwrapResponse(request.delete(`/users/${userId}/roles/${rolePk}/`))
  },

  // ==================== 搜索员工（绑定弹窗用） ====================

  /** 模糊搜索员工 */
  searchEmployees: (keyword: string) => {
    return unwrapResponse(
      request.get<EmployeeBrief[]>('/users/employees/search/', { keyword, page_size: 20 }),
    )
  },
}
