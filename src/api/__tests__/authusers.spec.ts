import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockRequest, mockUnwrapResponse } = vi.hoisted(() => ({
  mockRequest: {
    get: vi.fn().mockResolvedValue({ code: 0, data: {}, message: '' }),
    post: vi.fn().mockResolvedValue({ code: 0, data: {}, message: '' }),
    put: vi.fn().mockResolvedValue({ code: 0, data: {}, message: '' }),
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

import { authUserAPI } from '@/api/authusers'

describe('authUserAPI', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('getAuthUsers calls GET /auth/users/ with params', async () => {
    await authUserAPI.getAuthUsers({ page: 1, isactive: true })
    expect(mockRequest.get).toHaveBeenCalledWith('/auth/users/', { page: 1, isactive: true })
  })

  it('getAuthUser calls GET /auth/users/{id}/', async () => {
    await authUserAPI.getAuthUser(3)
    expect(mockRequest.get).toHaveBeenCalledWith('/auth/users/3/')
  })

  it('createAuthUser calls POST /auth/users/', async () => {
    await authUserAPI.createAuthUser({ auth_username: 'newbie' } as never)
    expect(mockRequest.post).toHaveBeenCalledWith('/auth/users/', { auth_username: 'newbie' })
  })

  it('updateAuthUser calls PUT /auth/users/{id}/', async () => {
    await authUserAPI.updateAuthUser(5, { auth_username: 'renamed' } as never)
    expect(mockRequest.put).toHaveBeenCalledWith('/auth/users/5/', { auth_username: 'renamed' })
  })

  it('deleteAuthUser calls DELETE /auth/users/{id}/', async () => {
    await authUserAPI.deleteAuthUser(7)
    expect(mockRequest.delete).toHaveBeenCalledWith('/auth/users/7/')
  })

  it('getBoundEmployee calls GET by-auth-user endpoint', async () => {
    await authUserAPI.getBoundEmployee(2)
    expect(mockRequest.get).toHaveBeenCalledWith('/users/employees/by-auth-user/2/')
  })

  it('bindAuthUser calls POST bind endpoint with auth_username', async () => {
    await authUserAPI.bindAuthUser('EMP001', 'admin')
    expect(mockRequest.post).toHaveBeenCalledWith('/users/employees/EMP001/bind-auth-user/', {
      auth_username: 'admin',
    })
  })

  it('unbindAuthUser calls POST unbind endpoint', async () => {
    await authUserAPI.unbindAuthUser('EMP001')
    expect(mockRequest.post).toHaveBeenCalledWith('/users/employees/EMP001/unbind-auth-user/')
  })

  it('replaceAuthUser calls POST replace endpoint with new username', async () => {
    await authUserAPI.replaceAuthUser('EMP001', 'newadmin')
    expect(mockRequest.post).toHaveBeenCalledWith('/users/employees/EMP001/replace-auth-user/', {
      auth_username: 'newadmin',
    })
  })

  it('getUserRoles calls GET /users/{userId}/roles/', async () => {
    await authUserAPI.getUserRoles(4)
    expect(mockRequest.get).toHaveBeenCalledWith('/users/4/roles/')
  })

  it('assignUserRole calls POST /users/{userId}/roles/ with role_id', async () => {
    await authUserAPI.assignUserRole(4, 9)
    expect(mockRequest.post).toHaveBeenCalledWith('/users/4/roles/', { role_id: 9 })
  })

  it('removeUserRole calls DELETE /users/{userId}/roles/{rolePk}/', async () => {
    await authUserAPI.removeUserRole(4, 9)
    expect(mockRequest.delete).toHaveBeenCalledWith('/users/4/roles/9/')
  })

  it('searchEmployees calls GET search endpoint with keyword and page_size', async () => {
    await authUserAPI.searchEmployees('张')
    expect(mockRequest.get).toHaveBeenCalledWith('/users/employees/search/', {
      keyword: '张',
      page_size: 20,
    })
  })

  it('unwrapResponse 提取 data', async () => {
    mockRequest.get.mockResolvedValue({ code: 0, data: { count: 1 }, message: '' })
    const result = await authUserAPI.getAuthUsers()
    expect(result).toEqual({ count: 1 })
  })
})
