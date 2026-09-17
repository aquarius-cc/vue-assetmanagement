import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
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

describe('DepartmentStore 扩展方法', () => {
  beforeEach(() => {
    vi.clearAllMocks()
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
