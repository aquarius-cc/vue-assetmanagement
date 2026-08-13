/**
 * @file 权限模块 API，提供用户权限查询、权限列表等接口
 * @module api/permissions
 * @exports
 *   - permissionsAPI: 权限模块 API 对象（包含权限相关方法）
 *   - MyPermissionsResponse: 我的权限响应类型
 * @callers
 *   - stores/authStore: 认证状态管理（权限加载）
 *   - views/system/PermissionManage: 权限管理视图
 * @dependsOn
 *   - api/request.ts: 使用 request 实例
 *   - types/user: 用户相关类型定义（Permission, DataScope）
 */
import { request, unwrapResponse } from '@/api/index'
import type { Permission, DataScope } from '@/types/permission'

/** 我的权限响应数据 */
export interface MyPermissionsResponse {
  permissions: string[] // 权限码字符串列表,如 ['asset:read', 'asset:create']
  data_scope: DataScope // 数据范围对象,如 { scope_type: 'departments', department_codes: ['12345'], include_children: true }
}

export const permissionsAPI = {
  /**
   * 获取当前用户的权限列表和数据范围
   * @description GET /api/v1/auth/my-permissions/
   * @returns Promise<MyPermissionsResponse>
   */
  getMyPermissions: (): Promise<MyPermissionsResponse> => {
    return unwrapResponse(request.get<MyPermissionsResponse>('/auth/my-permissions/'))
  },

  /**
   * 获取所有权限点列表（管理员用）
   * @description GET /api/v1/users/permissions/
   * @returns Promise<Permission[]>
   */
  getAllPermissions: async (): Promise<Permission[]> => {
    const res = await unwrapResponse<{ count: number; results: Permission[] }>(
      request.get<{ count: number; results: Permission[] }>('/users/permissions/'),
    )
    return res.results
  },
}
