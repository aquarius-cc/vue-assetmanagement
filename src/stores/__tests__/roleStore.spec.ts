import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useRoleStore } from '../roleStore'

vi.mock('@/api/roles', () => ({
  roleAPI: {
    getRoles: vi.fn(),
    getRole: vi.fn(),
    createRole: vi.fn(),
    updateRole: vi.fn(),
    deleteRole: vi.fn(),
    getRolePermissions: vi.fn(),
    setRolePermissions: vi.fn(),
  },
}))

vi.mock('@/api/permissions', () => ({
  permissionsAPI: {
    getAllPermissions: vi.fn(),
  },
}))

vi.mock('element-plus', () => ({
  ElMessage: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
  },
}))

describe('RoleStore', () => {
  let store: ReturnType<typeof useRoleStore>

  beforeEach(() => {
    const pinia = createPinia()
    setActivePinia(pinia)
    store = useRoleStore()
    vi.clearAllMocks()
  })

  const mockRoles = [
    {
      id: 1,
      recordcode: 'role-001',
      role_code: 'system_admin',
      role_name: '系统管理员',
      role_level: 1,
      description: '系统管理',
      is_system: true,
      sort_order: 0,
      created_at: '2026-07-01T10:00:00Z',
      updated_at: '2026-07-01T10:00:00Z',
    },
    {
      id: 2,
      recordcode: 'role-002',
      role_code: 'asset_admin',
      role_name: '资产管理',
      role_level: 2,
      description: '资产管理员',
      is_system: false,
      sort_order: 1,
      created_at: '2026-07-01T10:00:00Z',
      updated_at: '2026-07-01T10:00:00Z',
    },
  ]

  describe('初始化状态', () => {
    it('应该初始化为空列表', () => {
      expect(store.list).toEqual([])
      expect(store.loading).toBe(false)
      expect(store.pagination.total).toBe(0)
    })
  })

  describe('获取列表', () => {
    it('应该调用API获取角色列表', async () => {
      const mockResponse = {
        count: 2,
        next: null,
        previous: null,
        results: mockRoles,
      }

      const { roleAPI } = await import('@/api/roles')
      vi.mocked(roleAPI.getRoles).mockResolvedValue(mockResponse as never)

      await store.getList()

      expect(store.list).toHaveLength(2)
      expect(store.list[0].role_name).toBe('系统管理员')
      expect(store.pagination.total).toBe(2)
    })

    it('无参数时应使用默认分页', async () => {
      const { roleAPI } = await import('@/api/roles')
      vi.mocked(roleAPI.getRoles).mockResolvedValue({ count: 0, results: [] } as never)

      await store.getList()

      expect(roleAPI.getRoles).toHaveBeenCalledWith({
        page: 1,
        page_size: 20,
      })
    })
  })

  describe('创建记录', () => {
    it('应该调用API创建角色', async () => {
      const { roleAPI } = await import('@/api/roles')
      vi.mocked(roleAPI.createRole).mockResolvedValue(mockRoles[0] as never)

      await store.create({
        role_code: 'system_admin',
        role_name: '系统管理员',
        role_level: 1,
      })

      expect(roleAPI.createRole).toHaveBeenCalledWith({
        role_code: 'system_admin',
        role_name: '系统管理员',
        role_level: 1,
      })
    })

    it('创建API失败时应抛出异常', async () => {
      const { roleAPI } = await import('@/api/roles')
      vi.mocked(roleAPI.createRole).mockRejectedValue(new Error('创建失败'))

      await expect(store.create({ role_code: 'x', role_name: 'x', role_level: 1 })).rejects.toThrow(
        '创建失败',
      )
    })
  })

  describe('更新记录', () => {
    it('应提取id并调用API更新角色', async () => {
      const { roleAPI } = await import('@/api/roles')
      vi.mocked(roleAPI.updateRole).mockResolvedValue({
        ...mockRoles[0],
        role_name: '超级管理员',
      } as never)

      await store.update({
        id: 1,
        role_code: 'system_admin',
        role_name: '超级管理员',
        role_level: 1,
      })

      expect(roleAPI.updateRole).toHaveBeenCalledWith(1, {
        role_code: 'system_admin',
        role_name: '超级管理员',
        role_level: 1,
      })
    })

    it('缺少id时应抛出异常', async () => {
      await expect(store.update({ role_name: '新角色' })).rejects.toThrow('Missing ID for update')
    })

    it('更新API失败时应抛出异常', async () => {
      const { roleAPI } = await import('@/api/roles')
      vi.mocked(roleAPI.updateRole).mockRejectedValue(new Error('更新失败'))

      await expect(store.update({ id: 1, role_name: 'x' })).rejects.toThrow('更新失败')
    })
  })

  describe('删除记录', () => {
    it('应将字符串id转数字并调用API删除角色', async () => {
      const { roleAPI } = await import('@/api/roles')
      vi.mocked(roleAPI.deleteRole).mockResolvedValue(undefined as never)

      await store.remove('2')

      expect(roleAPI.deleteRole).toHaveBeenCalledWith(2)
    })

    it('删除API失败时应抛出异常', async () => {
      const { roleAPI } = await import('@/api/roles')
      vi.mocked(roleAPI.deleteRole).mockRejectedValue(new Error('删除失败'))

      await expect(store.remove('1')).rejects.toThrow('删除失败')
    })
  })

  describe('获取详情', () => {
    it('应将字符串id转数字并调用API获取详情', async () => {
      const { roleAPI } = await import('@/api/roles')
      vi.mocked(roleAPI.getRole).mockResolvedValue(mockRoles[0] as never)

      const result = await store.getById('1')

      expect(roleAPI.getRole).toHaveBeenCalledWith(1)
      expect(result?.role_code).toBe('system_admin')
    })
  })

  describe('扩展方法', () => {
    it('getRoles应透传roleAPI.getRoles并返回分页响应', async () => {
      const mockResponse = { count: 2, results: mockRoles } as never
      const { roleAPI } = await import('@/api/roles')
      vi.mocked(roleAPI.getRoles).mockResolvedValue(mockResponse)

      const result = await store.getRoles()

      expect(roleAPI.getRoles).toHaveBeenCalledTimes(1)
      expect(result).toEqual(mockResponse)
    })

    it('getRolePermissions应调用API并透传权限码列表', async () => {
      const mockPermRes = { role_code: 'system_admin', permissions: ['asset:read', 'asset:create'] }
      const { roleAPI } = await import('@/api/roles')
      vi.mocked(roleAPI.getRolePermissions).mockResolvedValue(mockPermRes as never)

      const result = await store.getRolePermissions(1)

      expect(roleAPI.getRolePermissions).toHaveBeenCalledWith(1)
      expect(result.permissions).toContain('asset:read')
    })

    it('setRolePermissions应调用API并透传权限码', async () => {
      const { roleAPI } = await import('@/api/roles')
      vi.mocked(roleAPI.setRolePermissions).mockResolvedValue(undefined as never)

      await store.setRolePermissions(1, { permission_codes: ['asset:read'] })

      expect(roleAPI.setRolePermissions).toHaveBeenCalledWith(1, {
        permission_codes: ['asset:read'],
      })
    })

    it('getAllPermissions应调用permissionsAPI.getAllPermissions', async () => {
      const mockPerms = [
        { id: 1, permission_code: 'asset:read', module: 'asset', action: 'read', description: '' },
      ]
      const { permissionsAPI } = await import('@/api/permissions')
      vi.mocked(permissionsAPI.getAllPermissions).mockResolvedValue(mockPerms as never)

      const result = await store.getAllPermissions()

      expect(permissionsAPI.getAllPermissions).toHaveBeenCalledTimes(1)
      expect(result).toHaveLength(1)
      expect(result[0].permission_code).toBe('asset:read')
    })

    it('同一个Pinia实例下二次调用应复用已有扩展action', async () => {
      const { roleAPI } = await import('@/api/roles')
      vi.mocked(roleAPI.getRoles).mockResolvedValue({ count: 0, results: [] } as never)

      const second = useRoleStore()
      await second.getRoles()

      expect(second).toBeDefined()
      expect(second.getRoles).toBe(store.getRoles)
      expect(second.getAllPermissions).toBe(store.getAllPermissions)
    })
  })
})
