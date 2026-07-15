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
      await expect(
        store.create({ employee_name: '张三' }),
      ).rejects.toThrow('employee_jobcode 不能为空')
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

  describe('创建校验', () => {
    it('employee_name为空时应抛出错误', async () => {
      await expect(
        store.create({
          employee_jobcode: 'EMP001',
          employee_name: '',
          employee_status: 'active',
          employee_phone: '13800138000',
          employee_location: '北京',
          employee_department_code: 'DEP001',
        }),
      ).rejects.toThrow('employee_name 不能为空')
    })

    it('employee_phone为空时应抛出错误', async () => {
      await expect(
        store.create({
          employee_jobcode: 'EMP001',
          employee_name: '张三',
          employee_status: 'active',
          employee_phone: '',
          employee_location: '北京',
          employee_department_code: 'DEP001',
        }),
      ).rejects.toThrow('employee_phone 不能为空')
    })

    it('employee_location为空时应抛出错误', async () => {
      await expect(
        store.create({
          employee_jobcode: 'EMP001',
          employee_name: '张三',
          employee_status: 'active',
          employee_phone: '13800138000',
          employee_location: '',
          employee_department_code: 'DEP001',
        }),
      ).rejects.toThrow('employee_location 不能为空')
    })

    it('employee_department_code为空时应抛出错误', async () => {
      await expect(
        store.create({
          employee_jobcode: 'EMP001',
          employee_name: '张三',
          employee_status: 'active',
          employee_phone: '13800138000',
          employee_location: '北京',
          employee_department_code: '',
        }),
      ).rejects.toThrow('employee_department_code 不能为空')
    })

    it('employee_status为left时应通过校验', async () => {
      const { userAPI } = await import('@/api/user')
      vi.mocked(userAPI.createUser).mockResolvedValue({
        employee_jobcode: 'EMP001',
        employee_name: '张三',
        employee_status: 'left',
        employee_phone: '13800138000',
        employee_location: '北京',
        employee_department_code: 'DEP001',
      } as any)

      await expect(
        store.create({
          employee_jobcode: 'EMP001',
          employee_name: '张三',
          employee_status: 'left',
          employee_phone: '13800138000',
          employee_location: '北京',
          employee_department_code: 'DEP001',
        }),
      ).resolves.toBeDefined()
    })

    it('employee_status为retirement时应通过校验', async () => {
      const { userAPI } = await import('@/api/user')
      vi.mocked(userAPI.createUser).mockResolvedValue({
        employee_jobcode: 'EMP001',
        employee_name: '张三',
        employee_status: 'retirement',
        employee_phone: '13800138000',
        employee_location: '北京',
        employee_department_code: 'DEP001',
      } as any)

      await expect(
        store.create({
          employee_jobcode: 'EMP001',
          employee_name: '张三',
          employee_status: 'retirement',
          employee_phone: '13800138000',
          employee_location: '北京',
          employee_department_code: 'DEP001',
        }),
      ).resolves.toBeDefined()
    })

    it('employee_description为可选字段，不传时应通过校验', async () => {
      const { userAPI } = await import('@/api/user')
      vi.mocked(userAPI.createUser).mockResolvedValue({
        employee_jobcode: 'EMP001',
        employee_name: '张三',
        employee_status: 'active',
        employee_phone: '13800138000',
        employee_location: '北京',
        employee_department_code: 'DEP001',
      } as any)

      await expect(
        store.create({
          employee_jobcode: 'EMP001',
          employee_name: '张三',
          employee_status: 'active',
          employee_phone: '13800138000',
          employee_location: '北京',
          employee_department_code: 'DEP001',
        }),
      ).resolves.toBeDefined()
    })

    it('必填字段前后有空格时应自动trim', async () => {
      const { userAPI } = await import('@/api/user')
      vi.mocked(userAPI.createUser).mockResolvedValue({
        employee_jobcode: 'EMP001',
        employee_name: '张三',
        employee_status: 'active',
        employee_phone: '13800138000',
        employee_location: '北京',
        employee_department_code: 'DEP001',
      } as any)

      await store.create({
        employee_jobcode: ' EMP001 ',
        employee_name: ' 张三 ',
        employee_status: 'active',
        employee_phone: ' 13800138000 ',
        employee_location: ' 北京 ',
        employee_department_code: ' DEP001 ',
      })

      expect(userAPI.createUser).toHaveBeenCalledWith(
        expect.objectContaining({
          employee_jobcode: 'EMP001',
          employee_name: '张三',
          employee_phone: '13800138000',
          employee_location: '北京',
          employee_department_code: 'DEP001',
        }),
      )
    })
  })

  describe('更新校验', () => {
    it('更新缺少employee_jobcode时应抛出异常', async () => {
      await expect(
        store.update({ employee_name: '张三' }),
      ).rejects.toThrow('Missing ID for update')
    })

    it('更新无效状态时应抛出异常', async () => {
      await expect(
        store.update({
          employee_jobcode: 'EMP001',
          employee_status: 'unknown',
        }),
      ).rejects.toThrow('员工状态')
    })

    it('更新有效状态时应通过校验', async () => {
      const { userAPI } = await import('@/api/user')
      vi.mocked(userAPI.updateUser).mockResolvedValue({} as any)

      await expect(
        store.update({
          employee_jobcode: 'EMP001',
          employee_status: 'active',
        }),
      ).resolves.toBeDefined()
    })

    it('更新时只传部分字段应只包含已传字段', async () => {
      const { userAPI } = await import('@/api/user')
      vi.mocked(userAPI.updateUser).mockResolvedValue({} as any)

      await store.update({
        employee_jobcode: 'EMP001',
        employee_name: '新名字',
      })

      expect(userAPI.updateUser).toHaveBeenCalledWith(
        expect.objectContaining({
          employee_jobcode: 'EMP001',
          employee_name: '新名字',
        }),
      )
    })

    it('更新employee_description时应正确处理null值', async () => {
      const { userAPI } = await import('@/api/user')
      vi.mocked(userAPI.updateUser).mockResolvedValue({} as any)

      await store.update({
        employee_jobcode: 'EMP001',
        employee_description: null,
      })

      expect(userAPI.updateUser).toHaveBeenCalledWith(
        expect.objectContaining({
          employee_jobcode: 'EMP001',
          employee_description: null,
        }),
      )
    })

    it('更新employee_description时应trim空格', async () => {
      const { userAPI } = await import('@/api/user')
      vi.mocked(userAPI.updateUser).mockResolvedValue({} as any)

      await store.update({
        employee_jobcode: 'EMP001',
        employee_description: ' 描述信息 ',
      })

      expect(userAPI.updateUser).toHaveBeenCalledWith(
        expect.objectContaining({
          employee_description: '描述信息',
        }),
      )
    })

    it('更新sort_order时应透传', async () => {
      const { userAPI } = await import('@/api/user')
      vi.mocked(userAPI.updateUser).mockResolvedValue({} as any)

      await store.update({
        employee_jobcode: 'EMP001',
        sort_order: 5,
      })

      expect(userAPI.updateUser).toHaveBeenCalledWith(
        expect.objectContaining({
          employee_jobcode: 'EMP001',
          sort_order: 5,
        }),
      )
    })

    it('更新所有字段时应trim所有字符串字段', async () => {
      const { userAPI } = await import('@/api/user')
      vi.mocked(userAPI.updateUser).mockResolvedValue({} as any)

      await store.update({
        employee_jobcode: 'EMP001',
        employee_name: ' 张三 ',
        employee_phone: ' 13800138000 ',
        employee_location: ' 北京 ',
        employee_department_code: ' DEP001 ',
        employee_description: ' 描述 ',
        sort_order: 1,
      })

      expect(userAPI.updateUser).toHaveBeenCalledWith(
        expect.objectContaining({
          employee_jobcode: 'EMP001',
          employee_name: '张三',
          employee_phone: '13800138000',
          employee_location: '北京',
          employee_department_code: 'DEP001',
          employee_description: '描述',
          sort_order: 1,
        }),
      )
    })

    it('更新left状态时应通过校验', async () => {
      const { userAPI } = await import('@/api/user')
      vi.mocked(userAPI.updateUser).mockResolvedValue({} as any)

      await expect(
        store.update({
          employee_jobcode: 'EMP001',
          employee_status: 'left',
        }),
      ).resolves.toBeDefined()
    })

    it('更新retirement状态时应通过校验', async () => {
      const { userAPI } = await import('@/api/user')
      vi.mocked(userAPI.updateUser).mockResolvedValue({} as any)

      await expect(
        store.update({
          employee_jobcode: 'EMP001',
          employee_status: 'retirement',
        }),
      ).resolves.toBeDefined()
    })

    it('更新employee_description为空字符串时应转换为null', async () => {
      const { userAPI } = await import('@/api/user')
      vi.mocked(userAPI.updateUser).mockResolvedValue({} as any)

      await store.update({
        employee_jobcode: 'EMP001',
        employee_description: '',
      })

      expect(userAPI.updateUser).toHaveBeenCalledWith(
        expect.objectContaining({
          employee_description: null,
        }),
      )
    })

    it('未传employee_description时不应包含在更新数据中', async () => {
      const { userAPI } = await import('@/api/user')
      vi.mocked(userAPI.updateUser).mockResolvedValue({} as any)

      await store.update({
        employee_jobcode: 'EMP001',
        employee_name: '张三',
      })

      const calledWith = vi.mocked(userAPI.updateUser).mock.calls[0][0]
      expect(calledWith).not.toHaveProperty('employee_description')
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
        results: [
          { employee_jobcode: 'EMP001', employee_name: '张三' },
        ],
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

  describe('创建校验扩展', () => {
    it('employee_description含空格时应trim', async () => {
      const { userAPI } = await import('@/api/user')
      vi.mocked(userAPI.createUser).mockResolvedValue({
        employee_jobcode: 'EMP001',
        employee_name: '张三',
        employee_status: 'active',
        employee_phone: '13800138000',
        employee_location: '北京',
        employee_department_code: 'DEP001',
        employee_description: '描述信息',
      } as any)

      await store.create({
        employee_jobcode: 'EMP001',
        employee_name: '张三',
        employee_status: 'active',
        employee_phone: '13800138000',
        employee_location: '北京',
        employee_department_code: 'DEP001',
        employee_description: ' 描述信息 ',
      } as any)

      expect(userAPI.createUser).toHaveBeenCalledWith(
        expect.objectContaining({
          employee_description: '描述信息',
        }),
      )
    })

    it('employee_description为空字符串时应传null', async () => {
      const { userAPI } = await import('@/api/user')
      vi.mocked(userAPI.createUser).mockResolvedValue({
        employee_jobcode: 'EMP001',
        employee_name: '张三',
        employee_status: 'active',
        employee_phone: '13800138000',
        employee_location: '北京',
        employee_department_code: 'DEP001',
        employee_description: null,
      } as any)

      await store.create({
        employee_jobcode: 'EMP001',
        employee_name: '张三',
        employee_status: 'active',
        employee_phone: '13800138000',
        employee_location: '北京',
        employee_department_code: 'DEP001',
        employee_description: '',
      } as any)

      expect(userAPI.createUser).toHaveBeenCalledWith(
        expect.objectContaining({
          employee_description: null,
        }),
      )
    })

    it('sort_order未传时默认为0', async () => {
      const { userAPI } = await import('@/api/user')
      vi.mocked(userAPI.createUser).mockResolvedValue({
        employee_jobcode: 'EMP001',
        employee_name: '张三',
        employee_status: 'active',
        employee_phone: '13800138000',
        employee_location: '北京',
        employee_department_code: 'DEP001',
        sort_order: 0,
      } as any)

      await store.create({
        employee_jobcode: 'EMP001',
        employee_name: '张三',
        employee_status: 'active',
        employee_phone: '13800138000',
        employee_location: '北京',
        employee_department_code: 'DEP001',
      } as any)

      expect(userAPI.createUser).toHaveBeenCalledWith(
        expect.objectContaining({
          sort_order: 0,
        }),
      )
    })

    it('sort_order有值时应透传', async () => {
      const { userAPI } = await import('@/api/user')
      vi.mocked(userAPI.createUser).mockResolvedValue({
        employee_jobcode: 'EMP001',
        employee_name: '张三',
        employee_status: 'active',
        employee_phone: '13800138000',
        employee_location: '北京',
        employee_department_code: 'DEP001',
        sort_order: 3,
      } as any)

      await store.create({
        employee_jobcode: 'EMP001',
        employee_name: '张三',
        employee_status: 'active',
        employee_phone: '13800138000',
        employee_location: '北京',
        employee_department_code: 'DEP001',
        sort_order: 3,
      } as any)

      expect(userAPI.createUser).toHaveBeenCalledWith(
        expect.objectContaining({
          sort_order: 3,
        }),
      )
    })
  })
})
