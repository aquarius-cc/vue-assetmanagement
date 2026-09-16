/**
 * @file 角色管理 Store，基于 createEntityStore 工厂创建，含权限查询/配置扩展方法
 * @module stores/roleStore
 * @exports
 *   - useRoleStore: 角色管理状态 Store（含 getRoles/getRolePermissions/setRolePermissions/getAllPermissions 扩展方法）
 * @callers
 *   - views/system/RoleManage.vue
 *   - components/system/RolePermDialog.vue
 *   - components/system/UserRoleAssignDialog.vue
 * @dependsOn
 *   - api/roles: 角色 API 接口
 *   - api/permissions: 权限 API 接口
 *   - types/roles: 角色相关类型定义
 *   - types/permission: 权限相关类型定义
 *   - stores/createEntityStore: 实体 Store 工厂
 */
import { createEntityStore } from '@/stores/createEntityStore'
import { roleAPI, type RolePermissionForm } from '@/api/roles'
import { permissionsAPI } from '@/api/permissions'
import type { Role, RoleCreateUpdateForm, RoleListResponse } from '@/types/roles'
import type { Permission } from '@/types/permission'
import type { PaginationQuery, EntityStore } from '@/stores/createEntityStore'

/**
 * 角色 Store 接口（含权限查询/配置扩展方法）
 * 继承自 EntityStore<Role, PaginationQuery>
 */
interface RoleStore extends EntityStore<Role, PaginationQuery> {
  /**
   * 获取全部角色（角色分配弹窗下拉用，透传 roleAPI.getRoles 分页响应）
   * @param params 查询参数（可选，默认第一页）
   * @returns 角色列表响应
   */
  getRoles: (
    params?: Record<string, string | number | boolean | null | undefined>,
  ) => Promise<RoleListResponse>

  /**
   * 获取角色的权限码列表
   * @param id 角色 ID
   * @returns { role_code, permissions }
   */
  getRolePermissions: (id: number) => Promise<{ role_code: string; permissions: string[] }>

  /**
   * 设置角色的权限码（全量替换）
   * @param id 角色 ID
   * @param data 权限码列表
   */
  setRolePermissions: (id: number, data: RolePermissionForm) => Promise<unknown>

  /**
   * 获取所有权限点列表（权限分配弹窗用）
   * @returns 权限点列表
   */
  getAllPermissions: () => Promise<Permission[]>
}

const baseRoleStoreDef = createEntityStore<Role, PaginationQuery>('role', {
  idKey: 'id',
  nameField: 'role_name',
  displayName: '角色',
  api: {
    getList: async (params?: PaginationQuery) => {
      const safeParams: PaginationQuery = params || {
        page: 1,
        page_size: 20,
      }
      const response = await roleAPI.getRoles(safeParams)
      return {
        count: response.count,
        next: response.next,
        previous: response.previous,
        results: response.results as Role[],
      }
    },
    getById: (id) => roleAPI.getRole(Number(id)),
    create: (data) => roleAPI.createRole(data as RoleCreateUpdateForm),
    update: (data) => {
      const id = data.id
      if (id == null) throw new Error(`更新角色失败：缺失 id`)
      const { id: _id, ...formData } = data
      return roleAPI.updateRole(Number(id), formData as RoleCreateUpdateForm)
    },
    delete: (id) => roleAPI.deleteRole(Number(id)) as Promise<void>,
  },
  enablePagination: true,
  defaultPageSize: 20,
  enableCache: false,
})

/**
 * 使用角色管理 Store（含权限查询/配置扩展方法）
 * @returns RoleStore 实例
 */
export const useRoleStore = (): RoleStore => {
  const store = baseRoleStoreDef()

  if (!('getRoles' in store)) {
    const extendedStore = store as unknown as RoleStore

    /**
     * 获取全部角色
     * 代理 roleAPI.getRoles（角色分配弹窗下拉数据源）
     */
    extendedStore.getRoles = async (
      params?: Record<string, string | number | boolean | null | undefined>,
    ) => {
      return roleAPI.getRoles(params)
    }

    /**
     * 获取角色的权限码列表
     */
    extendedStore.getRolePermissions = async (id: number) => {
      return roleAPI.getRolePermissions(id)
    }

    /**
     * 设置角色的权限码
     */
    extendedStore.setRolePermissions = async (id: number, data: RolePermissionForm) => {
      return roleAPI.setRolePermissions(id, data)
    }

    /**
     * 获取所有权限点列表
     */
    extendedStore.getAllPermissions = async () => {
      return permissionsAPI.getAllPermissions()
    }

    return extendedStore
  }

  return store as unknown as RoleStore
}
