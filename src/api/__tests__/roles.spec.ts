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

import { roleAPI } from '@/api/roles'

describe('roleAPI', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('getRoles calls GET /users/roles/ with params', async () => {
    await roleAPI.getRoles({ page: 1 })
    expect(mockRequest.get).toHaveBeenCalledWith('/users/roles/', { page: 1 })
  })

  it('getRole calls GET /users/roles/{id}/', async () => {
    await roleAPI.getRole(2)
    expect(mockRequest.get).toHaveBeenCalledWith('/users/roles/2/')
  })

  it('createRole calls POST /users/roles/', async () => {
    await roleAPI.createRole({ role_name: '管理员' } as never)
    expect(mockRequest.post).toHaveBeenCalledWith('/users/roles/', { role_name: '管理员' })
  })

  it('updateRole calls PUT /users/roles/{id}/', async () => {
    await roleAPI.updateRole(2, { role_name: '超级管理员' } as never)
    expect(mockRequest.put).toHaveBeenCalledWith('/users/roles/2/', { role_name: '超级管理员' })
  })

  it('deleteRole calls DELETE /users/roles/{id}/', async () => {
    await roleAPI.deleteRole(2)
    expect(mockRequest.delete).toHaveBeenCalledWith('/users/roles/2/')
  })

  it('getRolePermissions calls GET /users/roles/{id}/permissions/', async () => {
    await roleAPI.getRolePermissions(2)
    expect(mockRequest.get).toHaveBeenCalledWith('/users/roles/2/permissions/')
  })

  it('setRolePermissions calls POST /users/roles/{id}/permissions/ with codes', async () => {
    await roleAPI.setRolePermissions(2, { permission_codes: ['asset:read'] })
    expect(mockRequest.post).toHaveBeenCalledWith('/users/roles/2/permissions/', {
      permission_codes: ['asset:read'],
    })
  })
})
