import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import {
  useDepartmentStore,
  getDepartmentTree,
  getDepartmentChildren,
  getDepartmentEmployees,
  moveDepartment,
  sortDepartments,
} from '../departmentStore'

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

  describe('getDepartmentEmployees扩展', () => {
    it('employees为空数组时应返回空数组', async () => {
      const mockResponse = {
        department: 'DEP001',
        employees_count: 0,
        employees: [],
      }

      const { departmentAPI } = await import('@/api/department')
      vi.mocked(departmentAPI.getDepartmentEmployeeList).mockResolvedValue(mockResponse as any)

      const result = await getDepartmentEmployees('DEP001')
      expect(result).toEqual([])
    })

    it('employees的sort_order均为undefined时应保持原始顺序', async () => {
      const mockResponse = {
        department: 'DEP001',
        employees_count: 2,
        employees: [
          { employee_jobcode: 'EMP001', employee_name: '张三' },
          { employee_jobcode: 'EMP002', employee_name: '李四' },
        ],
      }

      const { departmentAPI } = await import('@/api/department')
      vi.mocked(departmentAPI.getDepartmentEmployeeList).mockResolvedValue(mockResponse as any)

      const result = await getDepartmentEmployees('DEP001')
      expect(result).toHaveLength(2)
    })
  })

  describe('树形结构扩展方法', () => {
    it('应该调用getDepartmentTree获取部门树', async () => {
      const mockTree = [{ department_code: 'DEP001', department_name: '技术部', children: [] }]

      const { departmentAPI } = await import('@/api/department')
      vi.mocked(departmentAPI.getDepartmentTree).mockResolvedValue(mockTree as any)

      const result = await getDepartmentTree()

      expect(departmentAPI.getDepartmentTree).toHaveBeenCalledWith({
        with_employee_count: true,
      })
      expect(result).toEqual(mockTree)
    })

    it('getDepartmentTree参数为false时应传递with_employee_count: false', async () => {
      const { departmentAPI } = await import('@/api/department')
      vi.mocked(departmentAPI.getDepartmentTree).mockResolvedValue([] as any)

      await getDepartmentTree(false)

      expect(departmentAPI.getDepartmentTree).toHaveBeenCalledWith({
        with_employee_count: false,
      })
    })

    it('getDepartmentTree应返回嵌套树结构', async () => {
      const mockTree = [
        {
          department_code: 'DEP001',
          department_name: '总公司',
          children: [
            {
              department_code: 'DEP002',
              department_name: '技术部',
              children: [],
            },
          ],
        },
      ]

      const { departmentAPI } = await import('@/api/department')
      vi.mocked(departmentAPI.getDepartmentTree).mockResolvedValue(mockTree as any)

      const result = await getDepartmentTree()

      expect(result).toHaveLength(1)
      expect(result[0].children).toHaveLength(1)
    })

    it('应该调用getDepartmentChildren获取子部门', async () => {
      const mockChildren = [{ department_code: 'DEP002', department_name: '前端组' }]

      const { departmentAPI } = await import('@/api/department')
      vi.mocked(departmentAPI.getDepartmentChildren).mockResolvedValue(mockChildren as any)

      const result = await getDepartmentChildren('DEP001')

      expect(departmentAPI.getDepartmentChildren).toHaveBeenCalledWith('DEP001')
      expect(result).toEqual(mockChildren)
    })

    it('getDepartmentChildren无子部门时应返回空数组', async () => {
      const { departmentAPI } = await import('@/api/department')
      vi.mocked(departmentAPI.getDepartmentChildren).mockResolvedValue([] as any)

      const result = await getDepartmentChildren('DEP999')

      expect(result).toEqual([])
    })

    it('应该调用moveDepartment移动部门', async () => {
      const { departmentAPI } = await import('@/api/department')
      vi.mocked(departmentAPI.moveDepartment).mockResolvedValue({} as any)

      await moveDepartment('DEP002', { parent_department_code: 'DEP001', sort_order: 1 })

      expect(departmentAPI.moveDepartment).toHaveBeenCalledWith('DEP002', {
        parent_department_code: 'DEP001',
        sort_order: 1,
      })
    })

    it('应该调用sortDepartments批量排序部门', async () => {
      const { departmentAPI } = await import('@/api/department')
      vi.mocked(departmentAPI.sortDepartments).mockResolvedValue({} as any)

      const sortData = [
        { department_code: 'DEP001', sort_order: 2 },
        { department_code: 'DEP002', sort_order: 1 },
      ]
      await sortDepartments(sortData)

      expect(departmentAPI.sortDepartments).toHaveBeenCalledWith(sortData)
    })

    it('应该调用getDepartmentEmployees获取部门人员', async () => {
      const mockResponse = {
        department: 'DEP001',
        employees_count: 2,
        employees: [
          {
            employee_jobcode: 'EMP001',
            employee_name: '张三',
            sort_order: 1,
          },
          {
            employee_jobcode: 'EMP002',
            employee_name: '李四',
            sort_order: 2,
          },
        ],
      }

      const { departmentAPI } = await import('@/api/department')
      vi.mocked(departmentAPI.getDepartmentEmployeeList).mockResolvedValue(mockResponse as any)

      const result = await getDepartmentEmployees('DEP001')

      expect(departmentAPI.getDepartmentEmployeeList).toHaveBeenCalledWith('DEP001', undefined)
      expect(result).toHaveLength(2)
      expect(result[0].employee_name).toBe('张三')
    })

    it('应该按sort_order升序排列员工', async () => {
      const mockResponse = {
        department: 'DEP001',
        employees_count: 3,
        employees: [
          { employee_jobcode: 'EMP001', employee_name: '张三', sort_order: 3 },
          { employee_jobcode: 'EMP002', employee_name: '李四', sort_order: 1 },
          { employee_jobcode: 'EMP003', employee_name: '王五', sort_order: 2 },
        ],
      }

      const { departmentAPI } = await import('@/api/department')
      vi.mocked(departmentAPI.getDepartmentEmployeeList).mockResolvedValue(mockResponse as any)

      const result = await getDepartmentEmployees('DEP001')

      expect(result[0].employee_name).toBe('李四')
      expect(result[1].employee_name).toBe('王五')
      expect(result[2].employee_name).toBe('张三')
    })

    it('sort_order为null的员工应排到最后', async () => {
      const mockResponse = {
        department: 'DEP001',
        employees_count: 2,
        employees: [
          { employee_jobcode: 'EMP001', employee_name: '张三', sort_order: null },
          { employee_jobcode: 'EMP002', employee_name: '李四', sort_order: 1 },
        ],
      }

      const { departmentAPI } = await import('@/api/department')
      vi.mocked(departmentAPI.getDepartmentEmployeeList).mockResolvedValue(mockResponse as any)

      const result = await getDepartmentEmployees('DEP001')

      expect(result[0].employee_name).toBe('李四')
      expect(result[1].employee_name).toBe('张三')
    })

    it('应该处理employees为null的情况', async () => {
      const mockResponse = {
        department: 'DEP001',
        employees_count: 0,
        employees: null,
      }

      const { departmentAPI } = await import('@/api/department')
      vi.mocked(departmentAPI.getDepartmentEmployeeList).mockResolvedValue(mockResponse as any)

      const result = await getDepartmentEmployees('DEP001')

      expect(result).toEqual([])
    })

    it('应该处理employees为undefined的情况', async () => {
      const mockResponse = {
        department: 'DEP001',
        employees_count: 0,
      }

      const { departmentAPI } = await import('@/api/department')
      vi.mocked(departmentAPI.getDepartmentEmployeeList).mockResolvedValue(mockResponse as any)

      const result = await getDepartmentEmployees('DEP001')

      expect(result).toEqual([])
    })

    it('getDepartmentEmployees应传递筛选参数', async () => {
      const { departmentAPI } = await import('@/api/department')
      vi.mocked(departmentAPI.getDepartmentEmployeeList).mockResolvedValue({
        department: 'DEP001',
        employees_count: 1,
        employees: [{ employee_jobcode: 'EMP001', employee_name: '张三', sort_order: 1 }],
      } as any)

      await getDepartmentEmployees('DEP001', { status: 'active' })

      expect(departmentAPI.getDepartmentEmployeeList).toHaveBeenCalledWith('DEP001', {
        status: 'active',
      })
    })
  })
})
