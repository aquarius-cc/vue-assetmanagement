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

import { authAPI } from '@/api/auth'

describe('authAPI', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('login', () => {
    it('calls POST /auth/login/ with credentials', async () => {
      mockRequest.post.mockResolvedValueOnce({
        code: 0,
        data: { user: { username: 'admin' } },
        message: '',
      })
      await authAPI.login({ auth_username: 'admin', password: '123' })
      expect(mockRequest.post).toHaveBeenCalledWith('/auth/login/', {
        auth_username: 'admin',
        password: '123',
      })
    })

    it('throws when code is not 0', async () => {
      mockRequest.post.mockResolvedValueOnce({ code: 401, data: null, message: '用户名错误' })
      await expect(authAPI.login({ auth_username: 'admin', password: 'wrong' })).rejects.toThrow(
        '用户名错误',
      )
    })

    it('throws 登录失败 when business response has no message', async () => {
      mockRequest.post.mockResolvedValueOnce({ code: 400, data: null, message: '' })
      await expect(authAPI.login({ auth_username: 'admin', password: 'wrong' })).rejects.toThrow(
        '登录失败',
      )
    })

    it('rejects with backend message from response.data.message', async () => {
      const err = new Error('原始错误') as Error & {
        response?: { data?: { message?: string } }
      }
      err.response = { data: { message: '凭证无效' } }
      mockRequest.post.mockRejectedValueOnce(err)
      await expect(authAPI.login({ auth_username: 'admin', password: 'x' })).rejects.toThrow(
        '凭证无效',
      )
    })

    it('rejects with Error message when no backend message', async () => {
      mockRequest.post.mockRejectedValueOnce(new Error('网络连接失败'))
      await expect(authAPI.login({ auth_username: 'admin', password: 'x' })).rejects.toThrow(
        '网络连接失败',
      )
    })

    it('rejects with generic message when rejection is a string', async () => {
      mockRequest.post.mockRejectedValueOnce('oops-string')
      await expect(authAPI.login({ auth_username: 'admin', password: 'x' })).rejects.toThrow(
        '登录失败，请稍后重试',
      )
    })

    it('rejects with generic message on unknown rejection', async () => {
      mockRequest.post.mockRejectedValueOnce({ weird: true })
      await expect(authAPI.login({ auth_username: 'admin', password: 'x' })).rejects.toThrow(
        '登录失败，请稍后重试',
      )
    })
  })

  describe('logout', () => {
    it('calls POST /auth/logout/ with refresh token', async () => {
      await authAPI.logout('refresh-token-123')
      expect(mockRequest.post).toHaveBeenCalledWith('/auth/logout/', {
        refresh: 'refresh-token-123',
      })
    })

    it('calls POST /auth/logout/ with empty body when no refresh token', async () => {
      await authAPI.logout()
      expect(mockRequest.post).toHaveBeenCalledWith('/auth/logout/', {})
    })

    it('rethrows Error rejections after logging', async () => {
      mockUnwrapResponse.mockRejectedValueOnce(new Error('logout-failed'))
      await expect(authAPI.logout('refresh-token-123')).rejects.toThrow('logout-failed')
    })

    it('rethrows string rejections', async () => {
      mockUnwrapResponse.mockRejectedValueOnce('err-string')
      await expect(authAPI.logout('refresh-token-123')).rejects.toBe('err-string')
    })
  })

  describe('getCurrentUserProfile', () => {
    it('calls GET /auth/profile/', async () => {
      await authAPI.getCurrentUserProfile()
      expect(mockRequest.get).toHaveBeenCalledWith('/auth/profile/')
    })
  })
})
