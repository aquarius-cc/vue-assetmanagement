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

import { authAPI } from '@/api/auth'

describe('authAPI', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('login', () => {
    it('calls POST /auth/login/ with credentials', async () => {
      mockRequest.post.mockResolvedValueOnce({ code: 0, data: { user: { username: 'admin' } }, message: '' })
      await authAPI.login({ auth_username: 'admin', password: '123' })
      expect(mockRequest.post).toHaveBeenCalledWith('/auth/login/', { auth_username: 'admin', password: '123' })
    })

    it('throws when code is not 0', async () => {
      mockRequest.post.mockResolvedValueOnce({ code: 401, data: null, message: '用户名错误' })
      await expect(authAPI.login({ auth_username: 'admin', password: 'wrong' })).rejects.toThrow('用户名错误')
    })
  })

  describe('logout', () => {
    it('calls POST /auth/logout/ with refresh token', async () => {
      await authAPI.logout('refresh-token-123')
      expect(mockRequest.post).toHaveBeenCalledWith('/auth/logout/', { refresh: 'refresh-token-123' })
    })
  })

  describe('verifyToken', () => {
    it('calls POST /auth/token/verify/', async () => {
      await authAPI.verifyToken()
      expect(mockRequest.post).toHaveBeenCalledWith('/auth/token/verify/')
    })
  })

  describe('getCurrentUserProfile', () => {
    it('calls GET /auth/profile/', async () => {
      await authAPI.getCurrentUserProfile()
      expect(mockRequest.get).toHaveBeenCalledWith('/auth/profile/')
    })
  })

  describe('updateCurrentUserProfile', () => {
    it('calls PUT /auth/profile/ with data', async () => {
      await authAPI.updateCurrentUserProfile({ auth_nickname: 'Test' })
      expect(mockRequest.put).toHaveBeenCalledWith('/auth/profile/', { auth_nickname: 'Test' })
    })
  })

  describe('register', () => {
    it('calls POST /auth/register/ with data', async () => {
      await authAPI.register({ auth_username: 'new', email: 'a@b.com', password: 'pass' })
      expect(mockRequest.post).toHaveBeenCalledWith('/auth/register/', {
        auth_username: 'new',
        email: 'a@b.com',
        password: 'pass',
      })
    })
  })
})
