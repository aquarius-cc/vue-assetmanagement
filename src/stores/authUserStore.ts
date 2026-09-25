/**
 * @file 认证用户管理 Store，基于 createEntityStore 工厂创建，含绑定/角色分配扩展方法
 * @module stores/authUserStore
 * @exports
 *   - useAuthUserStore: 认证用户管理状态 Store（含员工绑定、角色分配等扩展方法）
 * @callers
 *   - views/system/AuthUserManage.vue
 *   - components/system/BindAuthUserDialog.vue
 *   - components/system/UserRoleAssignDialog.vue
 * @dependsOn
 *   - api/authusers: AuthUser 管理 API 接口
 *   - types/authuser: AuthUser 相关类型定义（含 BoundEmployee/UserRole）
 *   - types/user: 员工类型定义（searchEmployees 结果元素）
 *   - stores/createEntityStore: 实体 Store 工厂
 */
import { createEntityStore } from '@/stores/createEntityStore'
import { authUserAPI } from '@/api/authusers'
import type { AuthUser, AuthUserCreateForm, BoundEmployee, UserRole } from '@/types/authuser'
import type { Employee } from '@/types/user'
import type { PaginationQuery, EntityStore } from '@/stores/createEntityStore'

/**
 * 认证用户 Store 接口（含绑定/角色分配扩展方法）
 * 继承自 EntityStore<AuthUser, PaginationQuery>
 */
interface AuthUserStore extends EntityStore<AuthUser, PaginationQuery> {
  /**
   * 模糊搜索员工（绑定弹窗用）
   * @param keyword 搜索关键词
   * @returns 员工列表（search 端点返回的 Employee 列表）
   */
  searchEmployees: (keyword: string) => Promise<Employee[]>

  /**
   * 根据 AuthUser ID 查询绑定的 Employee
   * @param authId AuthUser ID
   * @returns 已绑定员工信息（含 auth_user 外键）
   */
  getBoundEmployee: (authId: number) => Promise<BoundEmployee>

  /**
   * 绑定 Employee 到 AuthUser
   * @param jobcode 员工工号
   * @param authUsername AuthUser 用户名
   */
  bindAuthUser: (jobcode: string, authUsername: string) => Promise<unknown>

  /**
   * 解绑 Employee 的 AuthUser
   * @param jobcode 员工工号
   */
  unbindAuthUser: (jobcode: string) => Promise<unknown>

  /**
   * 替换 Employee 的 AuthUser
   * @param jobcode 员工工号
   * @param newAuthUsername 新 AuthUser 用户名
   */
  replaceAuthUser: (jobcode: string, newAuthUsername: string) => Promise<unknown>

  /**
   * 获取用户的角色列表
   * @param userId 用户 ID
   * @returns 角色列表响应
   */
  getUserRoles: (userId: number) => Promise<{ count: number; results: UserRole[] }>

  /**
   * 为用户分配角色
   * @param userId 用户 ID
   * @param roleId 角色 ID
   */
  assignUserRole: (userId: number, roleId: number) => Promise<unknown>

  /**
   * 撤销用户角色
   * @param userId 用户 ID
   * @param rolePk 用户角色关联主键
   */
  removeUserRole: (userId: number, rolePk: number) => Promise<unknown>
}

const baseAuthUserStoreDef = createEntityStore<AuthUser, PaginationQuery>('authUser', {
  idKey: 'auth_id',
  nameField: 'auth_username',
  displayName: '认证用户',
  api: {
    getList: async (params?: PaginationQuery) => {
      const safeParams: PaginationQuery = params || {
        page: 1,
        page_size: 20,
      }
      const response = await authUserAPI.getAuthUsers(safeParams)
      return {
        count: response.count,
        results: response.results as AuthUser[],
      }
    },
    getById: (id) => authUserAPI.getAuthUser(Number(id)),
    create: (data) => authUserAPI.createAuthUser(data as AuthUserCreateForm),
    update: (data) => {
      const authId = data.auth_id
      if (authId == null) throw new Error(`更新认证用户失败：缺失 auth_id`)
      const { auth_id: _authId, ...formData } = data
      return authUserAPI.updateAuthUser(Number(authId), formData as Partial<AuthUserCreateForm>)
    },
    delete: (id) => authUserAPI.deleteAuthUser(Number(id)) as Promise<void>,
  },
  enablePagination: true,
  defaultPageSize: 20,
  enableCache: false,
})

/**
 * 使用认证用户管理 Store（含绑定/角色分配扩展方法）
 * @returns AuthUserStore 实例
 */
export const useAuthUserStore = (): AuthUserStore => {
  const store = baseAuthUserStoreDef()

  if (!('searchEmployees' in store)) {
    const extendedStore = store as unknown as AuthUserStore

    /** 模糊搜索员工（绑定弹窗数据源） */
    extendedStore.searchEmployees = async (keyword: string) => {
      return authUserAPI.searchEmployees(keyword)
    }

    /** 查询 AuthUser 绑定员工 */
    extendedStore.getBoundEmployee = async (authId: number) => {
      return authUserAPI.getBoundEmployee(authId)
    }

    /** 绑定 Employee ↔ AuthUser */
    extendedStore.bindAuthUser = async (jobcode: string, authUsername: string) => {
      return authUserAPI.bindAuthUser(jobcode, authUsername)
    }

    /** 解绑 Employee 的 AuthUser */
    extendedStore.unbindAuthUser = async (jobcode: string) => {
      return authUserAPI.unbindAuthUser(jobcode)
    }

    /** 替换 Employee 的 AuthUser */
    extendedStore.replaceAuthUser = async (jobcode: string, newAuthUsername: string) => {
      return authUserAPI.replaceAuthUser(jobcode, newAuthUsername)
    }

    /** 获取用户角色列表 */
    extendedStore.getUserRoles = async (userId: number) => {
      return authUserAPI.getUserRoles(userId)
    }

    /** 为用户分配角色 */
    extendedStore.assignUserRole = async (userId: number, roleId: number) => {
      return authUserAPI.assignUserRole(userId, roleId)
    }

    /** 撤销用户角色 */
    extendedStore.removeUserRole = async (userId: number, rolePk: number) => {
      return authUserAPI.removeUserRole(userId, rolePk)
    }

    return extendedStore
  }

  return store as unknown as AuthUserStore
}
