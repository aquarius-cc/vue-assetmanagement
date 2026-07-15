/**
 * RBAC 权限 composable
 *
 * 基于 authStore 中的 userRole 提供角色判断能力。
 * 用于路由守卫、按钮级权限控制、菜单可见性。
 *
 * 角色层级：
 *   system_admin > dept_manager > asset_admin > regular_user
 *   auditor（独立，只读全量数据）
 */

import { computed } from 'vue'
import { useAuthStore } from '@/stores/auth'

const ROLE_HIERARCHY: Record<string, number> = {
  system_admin: 5,
  dept_manager: 4,
  asset_admin: 3,
  regular_user: 1,
  auditor: 2,
}

export function usePermission() {
  const authStore = useAuthStore()

  const role = computed(() => authStore.userRole)
  const departmentCode = computed(() => authStore.userDepartmentCode)

  /** 是否超级管理员（从 JWT payload 的 is_superuser 字段或 authInfo 判断） */
  const isSuperuser = computed(() => {
    // 方式1：从 JWT payload 检查
    if (authStore.access_token) {
      try {
        const payload = JSON.parse(atob(authStore.access_token.split('.')[1]))
        if (payload.is_superuser) return true
      } catch { /* ignore */ }
    }
    // 方式2：authInfo 中 auth_is_staff 且 is_superuser（兼容旧 token）
    // 旧 token 没有 role 但用户是 superuser，需要 re-login 获取新 token
    return false
  })

  /** 角色层级值（越大权限越高），超级管理员视为最高层级 */
  const roleLevel = computed(() => {
    if (isSuperuser.value) return ROLE_HIERARCHY.system_admin
    return ROLE_HIERARCHY[role.value] ?? 0
  })

  /** 是否系统管理员 */
  const isAdmin = computed(() => isSuperuser.value || role.value === 'system_admin')

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

  // ========== 按模块的权限判断 ==========

  /** 资产管理：增删改 */
  const canOperateAsset = computed(() => isAssetAdminOrAbove.value)

  /** 资产管理：只读（列表/详情） */
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
