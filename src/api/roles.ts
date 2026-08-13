/**
 * @file 角色管理 API，提供角色的增删改查、权限分配等接口
 * @module api/system/roles.ts
 * @exports
 *   - roleAPI: 角色管理 API 对象（包含所有角色相关方法）
 *   - RolePermissionForm: 角色-权限关联请求类型
 * @callers
 *   - views/system/RoleManage.vue: 角色管理视图
 *   - views/system/UserManagementPage.vue: 用户管理页面中分配角色
 *   - components/system/UserRoleAssignDialog.vue: 用户角色分配弹窗
 *   - api/userAPI: getUserRoles/assignUserRoles 用户角色相关接口
 *   - api/roleAPI: getAllRoles 获取所有角色接口
 *   - api/roleAPI: getRole 获取角色详情接口
 *   - api/roleAPI: createRole 创建角色接口
 *   - api/roleAPI: updateRole 更新角色接口
 *   - api/roleAPI: deleteRole 删除角色接口
 *   - api/roleAPI: getRolePermissions 获取角色权限码列表接口
 *   - api/roleAPI: setRolePermissions 设置角色权限码接口
 * @dependsOn
 *   - api/request.ts: 使用 request 实例
 *   - api/system/userAPI: 用户角色相关接口
 * @dependsOn
 *   - api/request.ts: 使用 request 实例
 *   - types/roles: 角色相关类型定义
 */
import { request, unwrapResponse } from '@/api/index'
import type { Role, RoleCreateUpdateForm, RoleListResponse } from '@/types/roles'

/** 角色-权限关联请求 */
export interface RolePermissionForm {
  permission_codes: string[]
}

export const roleAPI = {
  /**
   * 获取角色列表
   * @description GET /api/v1/users/roles/
   * @param params 查询参数
   */
  getRoles: (params?: Record<string, string | number | boolean | null | undefined>) => {
    return unwrapResponse(request.get<RoleListResponse>('/users/roles/', params))
  },

  /**
   * 获取角色详情
   * @description GET /api/v1/users/roles/{id}/
   */
  getRole: (id: number) => {
    return unwrapResponse(request.get<Role>(`/users/roles/${id}/`))
  },

  /**
   * 创建角色
   * @description POST /api/v1/users/roles/
   */
  createRole: (data: RoleCreateUpdateForm) => {
    return unwrapResponse(request.post<Role>('/users/roles/', data))
  },

  /**
   * 更新角色
   * @description PUT /api/v1/users/roles/{id}/
   */
  updateRole: (id: number, data: RoleCreateUpdateForm) => {
    return unwrapResponse(request.put<Role>(`/users/roles/${id}/`, data))
  },

  /**
   * 删除角色（软删除）
   * @description DELETE /api/v1/users/roles/{id}/
   */
  deleteRole: (id: number) => {
    return unwrapResponse(request.delete(`/users/roles/${id}/`))
  },

  /**
   * 获取角色的权限码列表
   * @description GET /api/v1/users/roles/{id}/permissions/
   */
  getRolePermissions: (id: number) => {
    return unwrapResponse(
      request.get<{ role_code: string; permissions: string[] }>(`/users/roles/${id}/permissions/`),
    )
  },

  /**
   * 设置角色的权限码（全量替换）
   * @description POST /api/v1/users/roles/{id}/permissions/
   * @param id 角色 ID
   * @param data { permission_codes: string[] }
   */
  setRolePermissions: (id: number, data: RolePermissionForm) => {
    return unwrapResponse(request.post(`/users/roles/${id}/permissions/`, data))
  },
}
