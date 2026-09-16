import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useUserStore } from '../userStore'

vi.mock('@/api/user', () => ({
  userAPI: {
    getUserList: vi.fn(),
    getUserByCode: vi.fn(),
    getUserByName: vi.fn(),
    createUser: vi.fn(),
    updateUser: vi.fn(),
    deleteUser: vi.fn(),
    batchDeleteUsers: vi.fn(),
    getFuzzySearch: vi.fn(),
    batchUpdateSort: vi.fn(),
  },
}))

vi.mock('element-plus', () => ({
  ElMessage: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
  },
}))

describe('UserStore', () => {
  let store: ReturnType<typeof useUserStore>

  beforeEach(() => {
    const pinia = createPinia()
    setActivePinia(pinia)
    store = useUserStore()
    vi.clearAllMocks()
  })

  describe('初始化状态', () => {
    it('应该初始化为空列表', () => {
      expect(store.list).toEqual([])
      expect(store.loading).toBe(false)
      expect(store.pagination.total).toBe(0)
    })
  })

  describe('获取列表', () => {
    it('应该调用API获取员工列表', async () => {
      const mockResponse = {
        count: 1,
        next: null,
        previous: null,
        results: [
          {
            employee_jobcode: 'EMP001',
            employee_name: '张三',
            employee_status: 'active',
            employee_phone: '13800138000',
            employee_location: '北京',
            employee_department_code: 'DEP001',
          },
        ],
      }

      const { userAPI } = await import('@/api/user')
      vi.mocked(userAPI.getUserList).mockResolvedValue(mockResponse)

      await store.getList()

      expect(store.list).toHaveLength(1)
      expect(store.list[0].employee_jobcode).toBe('EMP001')
      expect(store.list[0].employee_name).toBe('张三')
    })

    it('应该更新分页状态', async () => {
      const { userAPI } = await import('@/api/user')
      vi.mocked(userAPI.getUserList).mockResolvedValue({
        count: 50,
        next: null,
        previous: null,
        results: [],
      })

      await store.getList({ page: 3, page_size: 10 })

      expect(store.pagination.total).toBe(50)
      expect(store.pagination.page).toBe(3)
    })

    it('应该处理API错误', async () => {
      const { userAPI } = await import('@/api/user')
      vi.mocked(userAPI.getUserList).mockRejectedValue(new Error('网络错误'))

      await expect(store.getList()).rejects.toThrow('网络错误')
    })
  })

  describe('创建记录', () => {
    it('应该调用API创建员工', async () => {
      const mockCreated = {
        employee_jobcode: 'EMP001',
        employee_name: '张三',
        employee_status: 'active',
        employee_phone: '13800138000',
        employee_location: '北京',
        employee_department_code: 'DEP001',
      }

      const { userAPI } = await import('@/api/user')
      vi.mocked(userAPI.createUser).mockResolvedValue(mockCreated as any)

      await store.create({
        employee_jobcode: 'EMP001',
        employee_name: '张三',
        employee_status: 'active',
        employee_phone: '13800138000',
        employee_location: '北京',
        employee_department_code: 'DEP001',
      })

      expect(store.list).toHaveLength(1)
      expect(store.list[0].employee_jobcode).toBe('EMP001')
    })

    it('应该校验必填字段并抛出错误', async () => {
      await expect(store.create({ employee_name: '张三' })).rejects.toThrow(
        'employee_jobcode 不能为空',
      )
    })

    it('应该校验员工状态', async () => {
      await expect(
        store.create({
          employee_jobcode: 'EMP001',
          employee_name: '张三',
          employee_status: 'invalid_status',
          employee_phone: '13800138000',
          employee_location: '北京',
          employee_department_code: 'DEP001',
        }),
      ).rejects.toThrow('员工状态')
    })

    it('应该处理创建失败', async () => {
      const { userAPI } = await import('@/api/user')
      vi.mocked(userAPI.createUser).mockRejectedValue(new Error('创建失败'))

      await expect(
        store.create({
          employee_jobcode: 'EMP001',
          employee_name: '张三',
          employee_status: 'active',
          employee_phone: '13800138000',
          employee_location: '北京',
          employee_department_code: 'DEP001',
        }),
      ).rejects.toThrow('创建失败')
    })
  })

  describe('删除记录', () => {
    it('应该调用API删除员工', async () => {
      const { userAPI } = await import('@/api/user')
      vi.mocked(userAPI.deleteUser).mockResolvedValue()

      await store.remove('EMP001')

      expect(userAPI.deleteUser).toHaveBeenCalledWith('EMP001')
    })

    it('应该校验工号不能为空', async () => {
      await expect(store.remove('')).rejects.toThrow('删除员工失败：工号不能为空')
    })
  })

  describe('获取详情', () => {
    it('应该调用getById获取员工详情', async () => {
      const { userAPI } = await import('@/api/user')
      vi.mocked(userAPI.getUserByCode).mockResolvedValue({
        employee_jobcode: 'EMP001',
        employee_name: '张三',
      } as any)

      const result = await store.getById('EMP001')
      expect(result).toBeDefined()
      expect(userAPI.getUserByCode).toHaveBeenCalledWith('EMP001')
    })
  })

  describe('按名称查询', () => {
    it('应该调用getByName获取员工', async () => {
      const { userAPI } = await import('@/api/user')
      vi.mocked(userAPI.getUserByName).mockResolvedValue({
        results: [{ employee_jobcode: 'EMP001', employee_name: '张三' }],
      } as any)

      const result = await store.getByName('张三')
      expect(result).toHaveLength(1)
      expect(result[0].employee_name).toBe('张三')
    })
  })

  describe('批量删除', () => {
    it('应该调用batchDeleteUsers批量删除', async () => {
      const { userAPI } = await import('@/api/user')
      vi.mocked(userAPI.batchDeleteUsers).mockResolvedValue({
        total: 2,
        success_count: 2,
        fail_count: 0,
        success_ids: ['EMP001', 'EMP002'],
        fail_items: [],
      } as any)

      const result = await store.removeBatch(['EMP001', 'EMP002'])
      expect(result.success_count).toBe(2)
      expect(userAPI.batchDeleteUsers).toHaveBeenCalledWith(['EMP001', 'EMP002'])
    })

    it('空数组应直接返回', async () => {
      const result = await store.removeBatch([])
      expect(result.total).toBe(0)
    })
  })

  describe('模糊搜索', () => {
    it('应该调用getFuzzySearch并透传完整分页响应', async () => {
      const mockResponse = {
        count: 2,
        results: [
          { employee_jobcode: 'EMP001', employee_name: '张三' },
          { employee_jobcode: 'EMP002', employee_name: '李四' },
        ],
      }
      const { userAPI } = await import('@/api/user')
      vi.mocked(userAPI.getFuzzySearch).mockResolvedValue(mockResponse as any)

      const result = await store.getFuzzySearch({ keyword: '张', page: 1, page_size: 20 })

      expect(userAPI.getFuzzySearch).toHaveBeenCalledWith({
        keyword: '张',
        page: 1,
        page_size: 20,
      })
      expect(result.count).toBe(2)
      expect(result.results).toHaveLength(2)
    })

    it('getFuzzySearch API失败时应抛出异常', async () => {
      const { userAPI } = await import('@/api/user')
      vi.mocked(userAPI.getFuzzySearch).mockRejectedValue(new Error('搜索失败'))

      await expect(store.getFuzzySearch({ keyword: '张' })).rejects.toThrow('搜索失败')
    })
  })

  describe('批量排序', () => {
    it('应该调用batchUpdateSort并透传排序数据', async () => {
      const mockEmployees = [
        { employee_jobcode: 'EMP001', sort_order: 0 },
        { employee_jobcode: 'EMP002', sort_order: 1 },
      ]
      const { userAPI } = await import('@/api/user')
      vi.mocked(userAPI.batchUpdateSort).mockResolvedValue(mockEmployees as any)

      const result = await store.batchUpdateSort([
        { employee_jobcode: 'EMP001', sort_order: 0 },
        { employee_jobcode: 'EMP002', sort_order: 1 },
      ])

      expect(userAPI.batchUpdateSort).toHaveBeenCalledWith([
        { employee_jobcode: 'EMP001', sort_order: 0 },
        { employee_jobcode: 'EMP002', sort_order: 1 },
      ])
      expect(result).toHaveLength(2)
    })

    it('batchUpdateSort API失败时应抛出异常', async () => {
      const { userAPI } = await import('@/api/user')
      vi.mocked(userAPI.batchUpdateSort).mockRejectedValue(new Error('保存排序失败'))

      await expect(
        store.batchUpdateSort([{ employee_jobcode: 'EMP001', sort_order: 0 }]),
      ).rejects.toThrow('保存排序失败')
    })
  })

  describe('扩展方法复用', () => {
    it('同一Pinia实例下二次调用应复用已有扩展action', async () => {
      const { userAPI } = await import('@/api/user')
      vi.mocked(userAPI.getFuzzySearch).mockResolvedValue({ count: 0, results: [] } as any)

      const second = useUserStore()
      await second.getFuzzySearch({ keyword: '张' })

      expect(second).toBeDefined()
      expect(second.getFuzzySearch).toBe(store.getFuzzySearch)
      expect(second.batchUpdateSort).toBe(store.batchUpdateSort)
    })
  })
})
