/**
 * @file AuthUser 管理 API，提供认证用户的增删改查、角色绑定等接口
 * @module api/authusers
 * @exports
 *   - authUserAPI: AuthUser 管理 API 对象（包含所有认证用户相关方法）
 *   - BoundEmployee: 已绑定员工信息接口（类型 re-export，定义于 types/authuser）
 *   - UserRole: 用户角色关联接口（类型 re-export，定义于 types/authuser）
 * @callers
 *   - views/system/AuthUserManage: 认证用户管理视图
 * @dependsOn
 *   - api/request.ts: 使用 request 实例
 *   - api/user.ts: searchEmployees 复用 getFuzzySearch 端点实现（DR-1）
 *   - types/authuser: 认证用户相关类型定义（含 BoundEmployee/UserRole）
 *   - types/user: 员工类型定义（search 结果元素 Employee）
 */
import { request, unwrapResponse } from '@/api/index'
import { userAPI } from '@/api/user'
import type {
  AuthUser,
  AuthUserCreateForm,
  AuthUserListResponse,
  BoundEmployee,
  UserRole,
} from '@/types/authuser'
import type { Employee } from '@/types/user'

// 类型 re-export：保持 B 契约下组件可统一从 types/ 导入关联类型
export type { BoundEmployee, UserRole }

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
    return unwrapResponse(request.get<BoundEmployee>(`/users/employees/by-auth-user/${authId}/`))
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

  /**
   * 模糊搜索员工（绑定弹窗用）
   * DR-1：复用 userAPI.getFuzzySearch 唯一端点实现，此处仅做结果集提取
   * @param keyword 搜索关键词
   * @returns 员工列表（search 端点 results 元素为 EmployeeSerializer 输出）
   */
  searchEmployees: async (keyword: string): Promise<Employee[]> => {
    const response = await userAPI.getFuzzySearch({ keyword, page_size: 20 })
    return response.results
  },
}
