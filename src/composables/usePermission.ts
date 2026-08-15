/**
 * @file RBAC 权限判断（角色层级、模块级权限、通用方法）
 * @module composables/usePermission
 * @exports
 *   - usePermission: 权限 composable
 * @callers
 *   - views/system/AuthUserManage.vue
 *   - views/system/RoleManage.vue
 * @dependsOn
 *   - stores/auth: 认证状态与角色信息
 */
import { computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { ROLE_HIERARCHY, ROLE_CODES } from '@/constants/roles'

// 角色层级定义已统一提取到 constants/roles.ts中
// 从高到低，系统管理员 > 部门经理 > 资产管理员 > 审计员 > 普通用户
// 例如：system_admin 有所有权限，regular_user 无任何权限
// 例如：dept_manager 有部门相关权限，无资产相关权限
// const ROLE_HIERARCHY: Record<string, number> = {
//   system_admin: 5,
//   dept_manager: 4,
//   asset_admin: 3,
//   regular_user: 1,
//   auditor: 2,
// }

export function usePermission() {
  const authStore = useAuthStore()

  const role = computed(() => authStore.userRole)
  const departmentCode = computed(() => authStore.userDepartmentCode)

  /**
   * 是否超级管理员（读 authStore，DR-1）
   * bearer 通道：initAuthState/login 从 JWT is_superuser 解析
   * cookie 通道：getAuthInfo 从 /auth/profile/ 的 is_superuser 字段解析
   */
  const isSuperuser = computed(() => authStore.isSuperuser)

  /** 角色层级值（越大权限越高），超级管理员视为最高层级 */
  const roleLevel = computed(() => {
    if (isSuperuser.value) return ROLE_HIERARCHY.system_admin
    return ROLE_HIERARCHY[role.value] ?? 0
  })

  /** 是否系统管理员 */
  const isAdmin = computed(() => isSuperuser.value || role.value === ROLE_CODES.SYSTEM_ADMIN)

  /** 是否部门经理及以上 */
  const isDeptManagerOrAbove = computed(() => roleLevel.value >= ROLE_HIERARCHY.dept_manager)

  /** 是否资产管理员及以上 */
  const isAssetAdminOrAbove = computed(() => roleLevel.value >= ROLE_HIERARCHY.asset_admin)

  /** 是否审计员 */
  const isAuditor = computed(() => role.value === 'auditor')

  /** 是否普通用户（最低权限） */
  const isRegularUser = computed(() => role.value === 'regular_user')

  /**
   * 判断当前用户是否有指定角色
   * @param allowedRoles 允许的角色列表
   */
  function hasRole(allowedRoles: string[]): boolean {
    return allowedRoles.includes(role.value)
  }

  /**
   * 判断当前用户是否至少达到指定角色层级
   * @param minRole 最低要求的角色
   */
  function hasMinRole(minRole: string): boolean {
    return roleLevel.value >= (ROLE_HIERARCHY[minRole] ?? 0)
  }

  /**
   * 判断当前用户是否拥有指定权限码
   * @param permissionCode 权限码，格式 module:action，如 'asset:create'
   *
   * superuser / system_admin 短路返回 true（修复漏洞 5）
   * 避免后端权限点表未初始化时管理员被锁死
   */
  function hasPermission(permissionCode: string): boolean {
    // 管理员短路：避免权限点表未种子化时管理员被锁死
    if (isSuperuser.value || isAdmin.value) return true
    return authStore.permissions.includes(permissionCode)
  }

  // ========== 按模块的权限判断 ==========

  /** 资产管理：增删改 */
  const canOperateAsset = computed(() => isAssetAdminOrAbove.value)

  /**
   * 资产管理：只读（列表/详情）
   * 所有已认证角色均可访问资产列表入口。
   * 部门级数据隔离由后端 AssetSelector.get_queryset_for_user() 实现，
   * 前端不需要做部门过滤判断。
   */
  const canViewAsset = computed(() => true) // 所有已认证角色可查看本部门

  /** 报废审批 */
  const canApproveDamaged = computed(() => isDeptManagerOrAbove.value)

  /** 未登记资产处理 */
  const canHandleUnregistered = computed(() => isDeptManagerOrAbove.value)

  /** 系统配置（类型/仓库/合同/员工/部门/用户） */
  const canManageSystem = computed(() => isAdmin.value)

  /** 审计日志查看 */
  const canViewAuditLog = computed(() => isAdmin.value || isAuditor.value)

  /** 导出 */
  const canExport = computed(() => isAssetAdminOrAbove.value || isAuditor.value)

  return {
    // 基础状态
    role,
    departmentCode,
    roleLevel,

    // 角色判断
    isAdmin,
    isDeptManagerOrAbove,
    isAssetAdminOrAbove,
    isAuditor,
    isRegularUser,

    // 通用方法
    hasRole,
    hasMinRole,
    hasPermission, // [新增] 权限判断方法

    // 模块级权限
    canOperateAsset,
    canViewAsset,
    canApproveDamaged,
    canHandleUnregistered,
    canManageSystem,
    canViewAuditLog,
    canExport,
  }
}
