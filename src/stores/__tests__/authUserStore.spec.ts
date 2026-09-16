import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAuthUserStore } from '../authUserStore'

vi.mock('@/api/authusers', () => ({
  authUserAPI: {
    getAuthUsers: vi.fn(),
    getAuthUser: vi.fn(),
    createAuthUser: vi.fn(),
    updateAuthUser: vi.fn(),
    deleteAuthUser: vi.fn(),
    searchEmployees: vi.fn(),
    getBoundEmployee: vi.fn(),
    bindAuthUser: vi.fn(),
    unbindAuthUser: vi.fn(),
    replaceAuthUser: vi.fn(),
    getUserRoles: vi.fn(),
    assignUserRole: vi.fn(),
    removeUserRole: vi.fn(),
  },
}))

vi.mock('element-plus', () => ({
  ElMessage: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
  },
}))

describe('AuthUserStore', () => {
  let store: ReturnType<typeof useAuthUserStore>

  beforeEach(() => {
    const pinia = createPinia()
    setActivePinia(pinia)
    store = useAuthUserStore()
    vi.clearAllMocks()
  })

  const mockAuthUsers = [
    {
      auth_id: 1,
      auth_username: 'admin',
      email: 'admin@example.com',
      auth_is_active: true,
      auth_is_staff: true,
      auth_phone: '13800138000',
      auth_date_create: '2026-07-01T10:00:00Z',
      auth_date_update: '2026-07-01T10:00:00Z',
      sort_order: 0,
      last_login: null,
    },
    {
      auth_id: 2,
      auth_username: 'zhangsan',
      email: 'zhangsan@example.com',
      auth_is_active: true,
      auth_is_staff: false,
      auth_phone: '13900139000',
      auth_date_create: '2026-07-01T10:00:00Z',
      auth_date_update: '2026-07-01T10:00:00Z',
      sort_order: 1,
      last_login: null,
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
    it('应该调用API获取认证用户列表', async () => {
      const mockResponse = {
        count: 2,
        next: null,
        previous: null,
        results: mockAuthUsers,
      }

      const { authUserAPI } = await import('@/api/authusers')
      vi.mocked(authUserAPI.getAuthUsers).mockResolvedValue(mockResponse as never)

      await store.getList()

      expect(store.list).toHaveLength(2)
      expect(store.list[0].auth_username).toBe('admin')
      expect(store.pagination.total).toBe(2)
    })

    it('无参数时应使用默认分页', async () => {
      const { authUserAPI } = await import('@/api/authusers')
      vi.mocked(authUserAPI.getAuthUsers).mockResolvedValue({ count: 0, results: [] } as never)

      await store.getList()

      expect(authUserAPI.getAuthUsers).toHaveBeenCalledWith({
        page: 1,
        page_size: 20,
      })
    })
  })

  describe('创建记录', () => {
    it('应该调用API创建认证用户', async () => {
      const { authUserAPI } = await import('@/api/authusers')
      vi.mocked(authUserAPI.createAuthUser).mockResolvedValue(mockAuthUsers[0] as never)

      await store.create({
        auth_username: 'admin',
        password: 'password123',
        email: 'admin@example.com',
        auth_phone: '13800138000',
        auth_is_active: true,
        auth_is_staff: true,
      })

      expect(authUserAPI.createAuthUser).toHaveBeenCalledWith(
        expect.objectContaining({
          auth_username: 'admin',
          password: 'password123',
        }),
      )
    })

    it('创建API失败时应抛出异常', async () => {
      const { authUserAPI } = await import('@/api/authusers')
      vi.mocked(authUserAPI.createAuthUser).mockRejectedValue(new Error('创建失败'))

      await expect(
        store.create({ auth_username: 'x', password: 'p', auth_phone: '1' }),
      ).rejects.toThrow('创建失败')
    })
  })

  describe('更新记录', () => {
    it('应提取auth_id并调用API更新用户', async () => {
      const { authUserAPI } = await import('@/api/authusers')
      vi.mocked(authUserAPI.updateAuthUser).mockResolvedValue({
        ...mockAuthUsers[0],
        auth_is_active: false,
      } as never)

      await store.update({
        auth_id: 1,
        auth_username: 'admin',
        auth_is_active: false,
        auth_phone: '13800138000',
      })

      expect(authUserAPI.updateAuthUser).toHaveBeenCalledWith(1, {
        auth_username: 'admin',
        auth_is_active: false,
        auth_phone: '13800138000',
      })
    })

    it('缺少auth_id时应抛出异常', async () => {
      await expect(store.update({ auth_username: 'admin' })).rejects.toThrow(
        'Missing ID for update',
      )
    })
  })

  describe('删除记录', () => {
    it('应将字符串id转数字并调用API删除用户', async () => {
      const { authUserAPI } = await import('@/api/authusers')
      vi.mocked(authUserAPI.deleteAuthUser).mockResolvedValue(undefined as never)

      await store.remove('2')

      expect(authUserAPI.deleteAuthUser).toHaveBeenCalledWith(2)
    })

    it('删除API失败时应抛出异常', async () => {
      const { authUserAPI } = await import('@/api/authusers')
      vi.mocked(authUserAPI.deleteAuthUser).mockRejectedValue(new Error('删除失败'))

      await expect(store.remove('1')).rejects.toThrow('删除失败')
    })
  })

  describe('绑定扩展方法', () => {
    it('searchEmployees应调用API并透传关键词', async () => {
      const mockEmployees = [
        {
          employee_jobcode: 'EMP001',
          employee_name: '张三',
          employee_status: 'active',
          auth_user: null,
          auth_user_username: null,
        },
      ]
      const { authUserAPI } = await import('@/api/authusers')
      vi.mocked(authUserAPI.searchEmployees).mockResolvedValue(mockEmployees as never)

      const result = await store.searchEmployees('张三')

      expect(authUserAPI.searchEmployees).toHaveBeenCalledWith('张三')
      expect(result).toHaveLength(1)
    })

    it('getBoundEmployee应调用API并透传authId', async () => {
      const mockBound = {
        employee_jobcode: 'EMP001',
        employee_name: '张三',
        employee_status: 'active',
        auth_user: 1,
        auth_user_username: 'admin',
      }
      const { authUserAPI } = await import('@/api/authusers')
      vi.mocked(authUserAPI.getBoundEmployee).mockResolvedValue(mockBound as never)

      const result = await store.getBoundEmployee(1)

      expect(authUserAPI.getBoundEmployee).toHaveBeenCalledWith(1)
      expect(result.employee_jobcode).toBe('EMP001')
    })

    it('bindAuthUser应调用API并透传参数', async () => {
      const { authUserAPI } = await import('@/api/authusers')
      vi.mocked(authUserAPI.bindAuthUser).mockResolvedValue(undefined as never)

      await store.bindAuthUser('EMP001', 'admin')

      expect(authUserAPI.bindAuthUser).toHaveBeenCalledWith('EMP001', 'admin')
    })

    it('unbindAuthUser应调用API并透传工号', async () => {
      const { authUserAPI } = await import('@/api/authusers')
      vi.mocked(authUserAPI.unbindAuthUser).mockResolvedValue(undefined as never)

      await store.unbindAuthUser('EMP001')

      expect(authUserAPI.unbindAuthUser).toHaveBeenCalledWith('EMP001')
    })

    it('replaceAuthUser应调用API并透传参数', async () => {
      const { authUserAPI } = await import('@/api/authusers')
      vi.mocked(authUserAPI.replaceAuthUser).mockResolvedValue(undefined as never)

      await store.replaceAuthUser('EMP001', 'new_admin')

      expect(authUserAPI.replaceAuthUser).toHaveBeenCalledWith('EMP001', 'new_admin')
    })
  })

  describe('角色分配扩展方法', () => {
    it('getUserRoles应调用API并透传userId', async () => {
      const mockRoles = {
        count: 1,
        results: [
          {
            id: 10,
            auth_user: 1,
            role: 2,
            role_name: '资产管理员',
            role_code: 'asset_admin',
            data_scope: { scope_type: 'all' },
            created_at: '2026-07-01T10:00:00Z',
          },
        ],
      }
      const { authUserAPI } = await import('@/api/authusers')
      vi.mocked(authUserAPI.getUserRoles).mockResolvedValue(mockRoles as never)

      const result = await store.getUserRoles(1)

      expect(authUserAPI.getUserRoles).toHaveBeenCalledWith(1)
      expect(result.count).toBe(1)
      expect(result.results[0].role_name).toBe('资产管理员')
    })

    it('assignUserRole应调用API并透传参数', async () => {
      const { authUserAPI } = await import('@/api/authusers')
      vi.mocked(authUserAPI.assignUserRole).mockResolvedValue(undefined as never)

      await store.assignUserRole(1, 2)

      expect(authUserAPI.assignUserRole).toHaveBeenCalledWith(1, 2)
    })

    it('removeUserRole应调用API并透传参数', async () => {
      const { authUserAPI } = await import('@/api/authusers')
      vi.mocked(authUserAPI.removeUserRole).mockResolvedValue(undefined as never)

      await store.removeUserRole(1, 10)

      expect(authUserAPI.removeUserRole).toHaveBeenCalledWith(1, 10)
    })

    it('同一个Pinia实例下二次调用应复用已有扩展action', async () => {
      const second = useAuthUserStore()

      expect(second).toBeDefined()
      expect(second.searchEmployees).toBe(store.searchEmployees)
      expect(second.assignUserRole).toBe(store.assignUserRole)
    })
  })
})
