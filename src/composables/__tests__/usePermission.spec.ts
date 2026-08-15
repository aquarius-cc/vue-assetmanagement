import { describe, it, expect, vi, beforeEach } from 'vitest'

// Create mock auth store - use plain values to mimic Pinia's auto-unwrapping
const mockAuthStore = {
  userRole: 'regular_user',
  userDepartmentCode: 'DEPT001' as string | null,
  access_token: null as string | null,
  isSuperuser: false,
  permissions: [] as string[], // [新增] mock 权限码列表
}

// Mock auth store
vi.mock('@/stores/auth', () => ({
  useAuthStore: vi.fn(() => mockAuthStore),
}))

describe('usePermission', () => {
  // Import usePermission after mocking
  let usePermission: typeof import('../usePermission').usePermission

  beforeEach(async () => {
    vi.clearAllMocks()

    // Reset mock store values
    mockAuthStore.userRole = 'regular_user'
    mockAuthStore.userDepartmentCode = 'DEPT001'
    mockAuthStore.access_token = null
    mockAuthStore.isSuperuser = false
    mockAuthStore.permissions = [] // [新增] mock 权限码列表

    // Dynamic import to get fresh module with mocked dependencies
    const module = await import('../usePermission')
    usePermission = module.usePermission
  })

  describe('hasRole', () => {
    it('returns true when user has allowed role', () => {
      mockAuthStore.userRole = 'asset_admin'
      const { hasRole } = usePermission()

      expect(hasRole(['asset_admin', 'dept_manager'])).toBe(true)
    })

    it('returns false when user does not have allowed role', () => {
      mockAuthStore.userRole = 'regular_user'
      const { hasRole } = usePermission()

      expect(hasRole(['asset_admin', 'dept_manager'])).toBe(false)
    })

    it('returns true for single role match', () => {
      mockAuthStore.userRole = 'system_admin'
      const { hasRole } = usePermission()

      expect(hasRole(['system_admin'])).toBe(true)
    })

    it('returns false for empty allowed roles array', () => {
      mockAuthStore.userRole = 'system_admin'
      const { hasRole } = usePermission()

      expect(hasRole([])).toBe(false)
    })
  })

  describe('hasMinRole', () => {
    it('returns true when user role level >= required level', () => {
      mockAuthStore.userRole = 'asset_admin'
      const { hasMinRole } = usePermission()

      expect(hasMinRole('regular_user')).toBe(true)
      expect(hasMinRole('auditor')).toBe(true)
      expect(hasMinRole('asset_admin')).toBe(true)
    })

    it('returns false when user role level < required level', () => {
      mockAuthStore.userRole = 'regular_user'
      const { hasMinRole } = usePermission()

      expect(hasMinRole('asset_admin')).toBe(false)
      expect(hasMinRole('dept_manager')).toBe(false)
      expect(hasMinRole('system_admin')).toBe(false)
    })

    it('handles unknown role gracefully - treats as level 0', () => {
      mockAuthStore.userRole = 'regular_user'
      const { hasMinRole } = usePermission()

      // Unknown role defaults to level 0, so any user has minRole >= 0
      expect(hasMinRole('unknown_role')).toBe(true)
    })
  })

  describe('canOperateAsset', () => {
    it('returns true for asset_admin and above', () => {
      mockAuthStore.userRole = 'asset_admin'
      const { canOperateAsset } = usePermission()

      expect(canOperateAsset.value).toBe(true)
    })

    it('returns false for regular_user', () => {
      mockAuthStore.userRole = 'regular_user'
      const { canOperateAsset } = usePermission()

      expect(canOperateAsset.value).toBe(false)
    })

    it('returns true for system_admin', () => {
      mockAuthStore.userRole = 'system_admin'
      const { canOperateAsset } = usePermission()

      expect(canOperateAsset.value).toBe(true)
    })

    it('returns true for dept_manager', () => {
      mockAuthStore.userRole = 'dept_manager'
      const { canOperateAsset } = usePermission()

      expect(canOperateAsset.value).toBe(true)
    })
  })

  describe('role hierarchy', () => {
    it('system_admin has highest level', () => {
      mockAuthStore.userRole = 'system_admin'
      const { roleLevel, isAdmin } = usePermission()

      expect(roleLevel.value).toBe(5)
      expect(isAdmin.value).toBe(true)
    })

    it('dept_manager has correct level', () => {
      mockAuthStore.userRole = 'dept_manager'
      const { roleLevel, isDeptManagerOrAbove } = usePermission()

      expect(roleLevel.value).toBe(4)
      expect(isDeptManagerOrAbove.value).toBe(true)
    })

    it('asset_admin has correct level', () => {
      mockAuthStore.userRole = 'asset_admin'
      const { roleLevel, isAssetAdminOrAbove } = usePermission()

      expect(roleLevel.value).toBe(3)
      expect(isAssetAdminOrAbove.value).toBe(true)
    })

    it('auditor has correct level', () => {
      mockAuthStore.userRole = 'auditor'
      const { roleLevel, isAuditor } = usePermission()

      expect(roleLevel.value).toBe(2)
      expect(isAuditor.value).toBe(true)
    })

    it('regular_user has lowest level', () => {
      mockAuthStore.userRole = 'regular_user'
      const { roleLevel, isRegularUser } = usePermission()

      expect(roleLevel.value).toBe(1)
      expect(isRegularUser.value).toBe(true)
    })
  })

  describe('computed properties', () => {
    it('canViewAsset returns true for all users', () => {
      mockAuthStore.userRole = 'regular_user'
      const { canViewAsset } = usePermission()

      expect(canViewAsset.value).toBe(true)
    })

    it('canApproveDamaged requires dept_manager or above', () => {
      mockAuthStore.userRole = 'regular_user'
      const { canApproveDamaged } = usePermission()

      expect(canApproveDamaged.value).toBe(false)

      mockAuthStore.userRole = 'dept_manager'
      const { canApproveDamaged: canApprove2 } = usePermission()

      expect(canApprove2.value).toBe(true)
    })

    it('canManageSystem requires admin', () => {
      mockAuthStore.userRole = 'asset_admin'
      const { canManageSystem } = usePermission()

      expect(canManageSystem.value).toBe(false)

      mockAuthStore.userRole = 'system_admin'
      const { canManageSystem: canManage2 } = usePermission()

      expect(canManage2.value).toBe(true)
    })

    it('canViewAuditLog requires admin or auditor', () => {
      mockAuthStore.userRole = 'regular_user'
      const { canViewAuditLog } = usePermission()

      expect(canViewAuditLog.value).toBe(false)

      mockAuthStore.userRole = 'auditor'
      const { canViewAuditLog: canView2 } = usePermission()

      expect(canView2.value).toBe(true)

      mockAuthStore.userRole = 'system_admin'
      const { canViewAuditLog: canView3 } = usePermission()

      expect(canView3.value).toBe(true)
    })

    it('canExport requires asset_admin or auditor', () => {
      mockAuthStore.userRole = 'regular_user'
      const { canExport } = usePermission()

      expect(canExport.value).toBe(false)

      mockAuthStore.userRole = 'asset_admin'
      const { canExport: canExport2 } = usePermission()

      expect(canExport2.value).toBe(true)

      mockAuthStore.userRole = 'auditor'
      const { canExport: canExport3 } = usePermission()

      expect(canExport3.value).toBe(true)
    })
  })

  describe('department code', () => {
    it('returns user department code', () => {
      mockAuthStore.userDepartmentCode = 'DEPT001'
      const { departmentCode } = usePermission()

      expect(departmentCode.value).toBe('DEPT001')
    })

    it('returns null when no department code', () => {
      mockAuthStore.userDepartmentCode = null
      const { departmentCode } = usePermission()

      expect(departmentCode.value).toBeNull()
    })
  })

  // [新增] 测试 hasPermission 方法
  describe('hasPermission', () => {
    it('returns true for superuser regardless of permissions list', () => {
      // 模拟 superuser：authStore.isSuperuser（cookie 通道来自 profile / bearer 来自 JWT）
      mockAuthStore.isSuperuser = true
      const { hasPermission } = usePermission()

      expect(hasPermission('asset:create')).toBe(true)
      expect(hasPermission('any:permission')).toBe(true)
    })

    it('returns true for system_admin role', () => {
      mockAuthStore.userRole = 'system_admin'
      mockAuthStore.access_token = null
      const { hasPermission } = usePermission()

      expect(hasPermission('asset:create')).toBe(true)
    })

    it('returns true when permission code exists in list', () => {
      mockAuthStore.userRole = 'asset_admin'
      mockAuthStore.access_token = null
      mockAuthStore.permissions = ['asset:read', 'asset:create']
      const { hasPermission } = usePermission()

      expect(hasPermission('asset:create')).toBe(true)
    })

    it('returns false when permission code not in list', () => {
      mockAuthStore.userRole = 'asset_admin'
      mockAuthStore.access_token = null
      mockAuthStore.permissions = ['asset:read']
      const { hasPermission } = usePermission()

      expect(hasPermission('asset:delete')).toBe(false)
    })

    it('returns false when permissions list is empty', () => {
      mockAuthStore.userRole = 'regular_user'
      mockAuthStore.access_token = null
      mockAuthStore.permissions = []
      const { hasPermission } = usePermission()

      expect(hasPermission('asset:read')).toBe(false)
    })
  })
})
