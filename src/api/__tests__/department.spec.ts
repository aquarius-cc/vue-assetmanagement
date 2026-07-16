import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockRequest, mockUnwrapResponse } = vi.hoisted(() => ({
  mockRequest: {
    get: vi.fn().mockResolvedValue({ code: 0, data: {}, message: '' }),
    post: vi.fn().mockResolvedValue({ code: 0, data: {}, message: '' }),
    put: vi.fn().mockResolvedValue({ code: 0, data: {}, message: '' }),
    patch: vi.fn().mockResolvedValue({ code: 0, data: {}, message: '' }),
    delete: vi.fn().mockResolvedValue({ code: 0, data: {}, message: '' }),
  },
  mockUnwrapResponse: vi.fn(
    async (promise: Promise<{ code: number; data: unknown; message: string }>) => {
      const res = await promise
      if (res.code !== 0) throw new Error(res.message || '请求失败')
      return res.data
    },
  ),
}))

vi.mock('@/api/index', () => ({
  request: mockRequest,
  unwrapResponse: mockUnwrapResponse,
}))

import { departmentAPI } from '@/api/department'

describe('departmentAPI', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('getDepartmentList calls GET /users/departments/', async () => {
    await departmentAPI.getDepartmentList({ page: 1 })
    expect(mockRequest.get).toHaveBeenCalledWith('/users/departments/', { page: 1 })
  })

  it('getDepartment calls GET /users/departments/{code}/', async () => {
    await departmentAPI.getDepartment('DEP001')
    expect(mockRequest.get).toHaveBeenCalledWith(
      '/users/departments/DEP001/',
      undefined,
      true,
      300000,
    )
  })

  it('createDepartment calls POST /users/departments/', async () => {
    await departmentAPI.createDepartment({ department_name: 'New Dept' } as never)
    expect(mockRequest.post).toHaveBeenCalledWith('/users/departments/', {
      department_name: 'New Dept',
    })
  })

  it('updateDepartment calls PUT /users/departments/{code}/', async () => {
    await departmentAPI.updateDepartment({ department_code: 'DEP001', department_name: 'Updated' })
    expect(mockRequest.put).toHaveBeenCalledWith('/users/departments/DEP001/', {
      department_code: 'DEP001',
      department_name: 'Updated',
    })
  })

  it('updateDepartment throws when department_code is missing', () => {
    expect(() => departmentAPI.updateDepartment({ department_name: 'Test' })).toThrow(
      'department_code is required',
    )
  })

  it('deleteDepartment calls DELETE /users/departments/{code}/', async () => {
    await departmentAPI.deleteDepartment('DEP001')
    expect(mockRequest.delete).toHaveBeenCalledWith('/users/departments/DEP001/')
  })

  it('batchDeleteDepartments calls POST /users/departments/batch-delete/', async () => {
    await departmentAPI.batchDeleteDepartments(['DEP001', 'DEP002'])
    expect(mockRequest.post).toHaveBeenCalledWith('/users/departments/batch-delete/', {
      ids: ['DEP001', 'DEP002'],
    })
  })

  it('batchCreateDepartments calls POST /users/departments/batch-create/', async () => {
    await departmentAPI.batchCreateDepartments([{ department_name: 'X' } as never])
    expect(mockRequest.post).toHaveBeenCalledWith('/users/departments/batch-create/', {
      items: [{ department_name: 'X' }],
    })
  })

  it('getDepartmentEmployeeList calls GET /users/departments/{code}/employees/', async () => {
    await departmentAPI.getDepartmentEmployeeList('DEP001')
    expect(mockRequest.get).toHaveBeenCalledWith('/users/departments/DEP001/employees/', undefined)
  })

  it('getDepartmentTree calls GET /users/departments/tree/', async () => {
    await departmentAPI.getDepartmentTree()
    expect(mockRequest.get).toHaveBeenCalledWith('/users/departments/tree/', undefined)
  })

  it('getDepartmentChildren calls GET /users/departments/{code}/children/', async () => {
    await departmentAPI.getDepartmentChildren('DEP001')
    expect(mockRequest.get).toHaveBeenCalledWith('/users/departments/DEP001/children/')
  })

  it('moveDepartment calls PUT /users/departments/{code}/move/', async () => {
    await departmentAPI.moveDepartment('DEP001', { parent_department_code: 'DEP002' })
    expect(mockRequest.put).toHaveBeenCalledWith('/users/departments/DEP001/move/', {
      parent_department_code: 'DEP002',
    })
  })

  it('sortDepartments calls PUT /users/departments/sort/', async () => {
    await departmentAPI.sortDepartments([{ department_code: 'DEP001', sort_order: 1 }])
    expect(mockRequest.put).toHaveBeenCalledWith('/users/departments/sort/', {
      items: [{ department_code: 'DEP001', sort_order: 1 }],
    })
  })

  it('getParentDepartment calls GET /users/departments/{code}/parent/', async () => {
    await departmentAPI.getParentDepartment('DEP001')
    expect(mockRequest.get).toHaveBeenCalledWith(
      '/users/departments/DEP001/parent/',
      undefined,
      true,
      300000,
    )
  })
})
