// 部门 Store 核心功能测试
// 扩展方法（树形/员工/批量创建）见 departmentStoreExtended.spec.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useDepartmentStore, batchCreateDepartments } from '../departmentStore'

vi.mock('@/api/department', () => ({
  departmentAPI: {
    getDepartmentList: vi.fn(),
    getDepartment: vi.fn(),
    createDepartment: vi.fn(),
    updateDepartment: vi.fn(),
    deleteDepartment: vi.fn(),
    batchDeleteDepartments: vi.fn(),
    getDepartmentTree: vi.fn(),
    getDepartmentChildren: vi.fn(),
    getDepartmentEmployeeList: vi.fn(),
    moveDepartment: vi.fn(),
    sortDepartments: vi.fn(),
    batchCreateDepartments: vi.fn(),
  },
}))

vi.mock('element-plus', () => ({
  ElMessage: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
  },
}))

describe('DepartmentStore', () => {
  let store: ReturnType<typeof useDepartmentStore>

  beforeEach(() => {
    const pinia = createPinia()
    setActivePinia(pinia)
    store = useDepartmentStore()
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
    it('应该调用API获取部门列表', async () => {
      const mockResponse = {
        count: 1,
        next: null,
        previous: null,
        results: [
          {
            department_code: 'DEP001',
            department_name: '技术部',
            department_information: '负责技术开发',
          },
        ],
      }

      const { departmentAPI } = await import('@/api/department')
      vi.mocked(departmentAPI.getDepartmentList).mockResolvedValue(mockResponse)

      await store.getList()

      expect(store.list).toHaveLength(1)
      expect(store.list[0].department_code).toBe('DEP001')
      expect(store.list[0].department_name).toBe('技术部')
    })

    it('应该更新分页状态', async () => {
      const { departmentAPI } = await import('@/api/department')
      vi.mocked(departmentAPI.getDepartmentList).mockResolvedValue({
        count: 20,
        next: null,
        previous: null,
        results: [],
      })

      await store.getList({ page: 2, page_size: 10 })

      expect(store.pagination.total).toBe(20)
      expect(store.pagination.page).toBe(2)
    })

    it('应该处理API错误', async () => {
      const { departmentAPI } = await import('@/api/department')
      vi.mocked(departmentAPI.getDepartmentList).mockRejectedValue(new Error('网络错误'))

      await expect(store.getList()).rejects.toThrow('网络错误')
    })
  })

  describe('创建记录', () => {
    it('应该调用API创建部门', async () => {
      const mockCreated = {
        department_code: 'DEP001',
        department_name: '技术部',
        department_information: '负责技术开发',
      }

      const { departmentAPI } = await import('@/api/department')
      vi.mocked(departmentAPI.createDepartment).mockResolvedValue(mockCreated as any)

      await store.create({
        department_code: 'DEP001',
        department_name: '技术部',
        department_information: '负责技术开发',
      })

      expect(store.list).toHaveLength(1)
      expect(store.list[0].department_code).toBe('DEP001')
    })

    it('应该校验必填字段', async () => {
      await expect(store.create({ department_name: '技术部' })).rejects.toThrow(
        'department_code is required',
      )
    })

    it('department_name为空时应抛出错误', async () => {
      await expect(
        store.create({ department_code: 'DEP001', department_information: '信息' }),
      ).rejects.toThrow('department_name is required')
    })

    it('department_information为空时应抛出错误', async () => {
      await expect(
        store.create({ department_code: 'DEP001', department_name: '技术部' }),
      ).rejects.toThrow('department_information is required')
    })

    it('创建时字段前后有空格应自动trim', async () => {
      const { departmentAPI } = await import('@/api/department')
      vi.mocked(departmentAPI.createDepartment).mockResolvedValue({
        department_code: 'DEP001',
        department_name: '技术部',
        department_information: '负责技术开发',
      } as any)

      await store.create({
        department_code: ' DEP001 ',
        department_name: ' 技术部 ',
        department_information: ' 负责技术开发 ',
      })

      expect(departmentAPI.createDepartment).toHaveBeenCalledWith(
        expect.objectContaining({
          department_code: 'DEP001',
          department_name: '技术部',
          department_information: '负责技术开发',
        }),
      )
    })

    it('应该处理创建失败', async () => {
      const { departmentAPI } = await import('@/api/department')
      vi.mocked(departmentAPI.createDepartment).mockRejectedValue(new Error('创建失败'))

      await expect(
        store.create({
          department_code: 'DEP001',
          department_name: '技术部',
          department_information: '负责技术开发',
        }),
      ).rejects.toThrow('创建失败')
    })
  })

  describe('更新记录', () => {
    it('缺少department_code时应抛出异常', async () => {
      await expect(store.update({ department_name: '新名字' } as any)).rejects.toThrow(
        'Missing ID for update',
      )
    })

    it('更新成功时应调用API', async () => {
      const { departmentAPI } = await import('@/api/department')
      vi.mocked(departmentAPI.updateDepartment).mockResolvedValue({} as any)

      await store.update({
        department_code: 'DEP001',
        department_name: '新名字',
      })

      expect(departmentAPI.updateDepartment).toHaveBeenCalled()
    })
  })

  describe('删除记录', () => {
    it('应该调用API删除部门', async () => {
      const { departmentAPI } = await import('@/api/department')
      vi.mocked(departmentAPI.deleteDepartment).mockResolvedValue()

      await store.remove('DEP001')

      expect(departmentAPI.deleteDepartment).toHaveBeenCalledWith('DEP001')
    })

    it('应该校验部门编码不能为空', async () => {
      await expect(store.remove('')).rejects.toThrow('删除部门失败：部门编码不能为空')
    })
  })

  describe('创建记录扩展', () => {
    it('sort_order未传时默认为0', async () => {
      const { departmentAPI } = await import('@/api/department')
      vi.mocked(departmentAPI.createDepartment).mockResolvedValue({
        department_code: 'DEP001',
        department_name: '技术部',
        department_information: '负责技术开发',
      } as any)

      await store.create({
        department_code: 'DEP001',
        department_name: '技术部',
        department_information: '负责技术开发',
      })

      expect(departmentAPI.createDepartment).toHaveBeenCalledWith(
        expect.objectContaining({
          sort_order: 0,
        }),
      )
    })

    it('sort_order有值时应透传', async () => {
      const { departmentAPI } = await import('@/api/department')
      vi.mocked(departmentAPI.createDepartment).mockResolvedValue({
        department_code: 'DEP001',
        department_name: '技术部',
        department_information: '负责技术开发',
      } as any)

      await store.create({
        department_code: 'DEP001',
        department_name: '技术部',
        department_information: '负责技术开发',
        sort_order: 5,
      })

      expect(departmentAPI.createDepartment).toHaveBeenCalledWith(
        expect.objectContaining({
          sort_order: 5,
        }),
      )
    })

    it('parent_department_code有值时应透传', async () => {
      const { departmentAPI } = await import('@/api/department')
      vi.mocked(departmentAPI.createDepartment).mockResolvedValue({
        department_code: 'DEP002',
        department_name: '前端组',
        department_information: '负责前端开发',
      } as any)

      await store.create({
        department_code: 'DEP002',
        department_name: '前端组',
        department_information: '负责前端开发',
        parent_department_code: 'DEP001',
      })

      expect(departmentAPI.createDepartment).toHaveBeenCalledWith(
        expect.objectContaining({
          parent_department_code: 'DEP001',
        }),
      )
    })

    it('parent_department_code未传时不应包含该字段', async () => {
      const { departmentAPI } = await import('@/api/department')
      vi.mocked(departmentAPI.createDepartment).mockResolvedValue({
        department_code: 'DEP001',
        department_name: '技术部',
        department_information: '负责技术开发',
      } as any)

      await store.create({
        department_code: 'DEP001',
        department_name: '技术部',
        department_information: '负责技术开发',
      })

      const calledWith = vi.mocked(departmentAPI.createDepartment).mock.calls[0][0]
      expect(calledWith).not.toHaveProperty('parent_department_code')
    })
  })

  describe('更新记录扩展', () => {
    it('更新时应trim所有字符串字段', async () => {
      const { departmentAPI } = await import('@/api/department')
      vi.mocked(departmentAPI.updateDepartment).mockResolvedValue({} as any)

      await store.update({
        department_code: 'DEP001',
        department_name: ' 新名字 ',
        department_information: ' 新信息 ',
      })

      expect(departmentAPI.updateDepartment).toHaveBeenCalledWith(
        expect.objectContaining({
          department_code: 'DEP001',
          department_name: '新名字',
          department_information: '新信息',
        }),
      )
    })

    it('更新时未传department_name应保留为undefined', async () => {
      const { departmentAPI } = await import('@/api/department')
      vi.mocked(departmentAPI.updateDepartment).mockResolvedValue({} as any)

      await store.update({
        department_code: 'DEP001',
        department_information: '新信息',
      })

      const calledWith = vi.mocked(departmentAPI.updateDepartment).mock.calls[0][0]
      expect(calledWith.department_code).toBe('DEP001')
      expect(calledWith.department_information).toBe('新信息')
    })

    it('更新时sort_order有值应透传', async () => {
      const { departmentAPI } = await import('@/api/department')
      vi.mocked(departmentAPI.updateDepartment).mockResolvedValue({} as any)

      await store.update({
        department_code: 'DEP001',
        sort_order: 10,
      })

      expect(departmentAPI.updateDepartment).toHaveBeenCalledWith(
        expect.objectContaining({ sort_order: 10 }),
      )
    })

    it('更新时sort_order为undefined不应包含在更新数据中', async () => {
      const { departmentAPI } = await import('@/api/department')
      vi.mocked(departmentAPI.updateDepartment).mockResolvedValue({} as any)

      await store.update({
        department_code: 'DEP001',
        department_name: '新名字',
      })

      const calledWith = vi.mocked(departmentAPI.updateDepartment).mock.calls[0][0]
      expect(calledWith).not.toHaveProperty('sort_order')
    })

    it('更新成功后应显示成功消息', async () => {
      const { ElMessage } = await import('element-plus')
      const { departmentAPI } = await import('@/api/department')
      vi.mocked(departmentAPI.updateDepartment).mockResolvedValue({} as any)

      await store.update({
        department_code: 'DEP001',
        department_name: '新名字',
      })

      expect(ElMessage.success).toHaveBeenCalled()
    })
  })

  describe('批量删除', () => {
    it('应该调用batchDeleteDepartments批量删除', async () => {
      const { departmentAPI } = await import('@/api/department')
      vi.mocked(departmentAPI.batchDeleteDepartments).mockResolvedValue({
        total: 2,
        success_count: 2,
        fail_count: 0,
        success_ids: ['DEP001', 'DEP002'],
        fail_items: [],
      } as any)

      const result = await store.removeBatch(['DEP001', 'DEP002'])
      expect(result.success_count).toBe(2)
      expect(departmentAPI.batchDeleteDepartments).toHaveBeenCalledWith(['DEP001', 'DEP002'])
    })

    it('空数组应直接返回', async () => {
      const result = await store.removeBatch([])
      expect(result.total).toBe(0)
    })
  })

  describe('批量创建', () => {
    it('应该调用batchCreateDepartments批量创建', async () => {
      const mockResult = {
        total: 2,
        success_count: 2,
        fail_count: 0,
        success_ids: ['DEP001', 'DEP002'],
        fail_items: [],
      }

      const { departmentAPI } = await import('@/api/department')
      vi.mocked(departmentAPI.batchCreateDepartments).mockResolvedValue(mockResult as any)

      const items = [
        {
          department_code: 'DEP001',
          department_name: '技术部',
          department_information: '负责技术开发',
        },
        {
          department_code: 'DEP002',
          department_name: '前端组',
          department_information: '负责前端开发',
        },
      ]
      const result = await batchCreateDepartments(items)

      expect(departmentAPI.batchCreateDepartments).toHaveBeenCalledWith(items)
      expect(result.success_count).toBe(2)
    })

    it('空数组应直接返回空结果', async () => {
      const { departmentAPI } = await import('@/api/department')
      vi.mocked(departmentAPI.batchCreateDepartments).mockResolvedValue({
        total: 0,
        success_count: 0,
        fail_count: 0,
        success_ids: [],
        fail_items: [],
      } as any)

      const result = await batchCreateDepartments([])

      expect(result.total).toBe(0)
      expect(departmentAPI.batchCreateDepartments).toHaveBeenCalledWith([])
    })
  })
})
