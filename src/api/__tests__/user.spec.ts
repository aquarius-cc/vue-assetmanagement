import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockRequest, mockUnwrapResponse } = vi.hoisted(() => ({
  mockRequest: {
    get: vi.fn().mockResolvedValue({ code: 0, data: {}, message: '' }),
    post: vi.fn().mockResolvedValue({ code: 0, data: {}, message: '' }),
    put: vi.fn().mockResolvedValue({ code: 0, data: {}, message: '' }),
    patch: vi.fn().mockResolvedValue({ code: 0, data: {}, message: '' }),
    delete: vi.fn().mockResolvedValue({ code: 0, data: {}, message: '' }),
  },
  mockUnwrapResponse: vi.fn(async (promise: Promise<{ code: number; data: unknown; message: string }>) => {
    const res = await promise
    if (res.code !== 0) throw new Error(res.message || '请求失败')
    return res.data
  }),
}))

vi.mock('@/api/index', () => ({
  request: mockRequest,
  unwrapResponse: mockUnwrapResponse,
}))

import { userAPI } from '@/api/user'

describe('userAPI', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('getUserList calls GET /users/employees/', async () => {
    await userAPI.getUserList({ page: 1, page_size: 10 })
    expect(mockRequest.get).toHaveBeenCalledWith('/users/employees/', { page: 1, page_size: 10 })
  })

  it('getFuzzySearch calls GET /users/employees/search/', async () => {
    await userAPI.getFuzzySearch({ keyword: 'test' })
    expect(mockRequest.get).toHaveBeenCalledWith('/users/employees/search/', { keyword: 'test' })
  })

  it('getUserByCode calls GET /users/employees/{code}/', async () => {
    await userAPI.getUserByCode('E001')
    expect(mockRequest.get).toHaveBeenCalledWith('/users/employees/E001/', undefined, true, 300000)
  })

  it('getUserByName calls GET /users/employees/search/ with keyword', async () => {
    await userAPI.getUserByName('张三')
    expect(mockRequest.get).toHaveBeenCalledWith('/users/employees/search/', { keyword: '张三' })
  })

  it('getUserActivity calls GET /users/employees/active_employees/', async () => {
    await userAPI.getUserActivity()
    expect(mockRequest.get).toHaveBeenCalledWith('/users/employees/active_employees/')
  })

  it('createUser calls POST /users/employees/', async () => {
    await userAPI.createUser({ employee_name: 'New' } as never)
    expect(mockRequest.post).toHaveBeenCalledWith('/users/employees/', { employee_name: 'New' })
  })

  it('updateUser calls PUT /users/employees/{code}/', async () => {
    await userAPI.updateUser({ employee_jobcode: 'E001', employee_name: 'Updated' })
    expect(mockRequest.put).toHaveBeenCalledWith('/users/employees/E001/', { employee_jobcode: 'E001', employee_name: 'Updated' })
  })

  it('updateUser throws when employee_jobcode is missing', () => {
    expect(() => userAPI.updateUser({ employee_name: 'Test' })).toThrow('employee_jobcode is required')
  })

  it('deleteUser calls DELETE /users/employees/{code}/', async () => {
    await userAPI.deleteUser('E001')
    expect(mockRequest.delete).toHaveBeenCalledWith('/users/employees/E001/')
  })

  it('batchDeleteUsers calls POST /users/employees/batch-delete/', async () => {
    await userAPI.batchDeleteUsers(['E001', 'E002'])
    expect(mockRequest.post).toHaveBeenCalledWith('/users/employees/batch-delete/', { ids: ['E001', 'E002'] })
  })

  it('batchCreateUsers calls POST /users/employees/batch-create/', async () => {
    await userAPI.batchCreateUsers([{ employee_name: 'X' } as never])
    expect(mockRequest.post).toHaveBeenCalledWith('/users/employees/batch-create/', { items: [{ employee_name: 'X' }] })
  })

  it('changeUserStatus calls POST /users/employees/{code}/change_status/', async () => {
    await userAPI.changeUserStatus('E001', 'active')
    expect(mockRequest.post).toHaveBeenCalledWith('/users/employees/E001/change_status/', { status: 'active' })
  })

  it('batchUpdateSort calls PUT /users/employees/sort/', async () => {
    await userAPI.batchUpdateSort([{ employee_jobcode: 'E001', sort_order: 1 }])
    expect(mockRequest.put).toHaveBeenCalledWith('/users/employees/sort/', { items: [{ employee_jobcode: 'E001', sort_order: 1 }] })
  })

  it('getEmployeeDepartment calls GET /users/employees/{code}/department/', async () => {
    await userAPI.getEmployeeDepartment('E001')
    expect(mockRequest.get).toHaveBeenCalledWith('/users/employees/E001/department/', undefined, true, 300000)
  })
})
