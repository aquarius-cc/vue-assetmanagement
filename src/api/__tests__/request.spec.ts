import { describe, it, expect, vi, beforeEach } from 'vitest'

const mocks = vi.hoisted(() => ({
  instanceGet: vi.fn(),
  instancePost: vi.fn(),
  instancePut: vi.fn(),
  instancePatch: vi.fn(),
  instanceDelete: vi.fn(),
  staticPost: vi.fn(),
}))

vi.mock('axios', () => {
  const interceptors = {
    request: { use: vi.fn(), eject: vi.fn() },
    response: { use: vi.fn(), eject: vi.fn() },
  }
  const instance = {
    interceptors,
    get: mocks.instanceGet,
    post: mocks.instancePost,
    put: mocks.instancePut,
    patch: mocks.instancePatch,
    delete: mocks.instanceDelete,
  }
  return {
    default: {
      create: vi.fn(() => instance),
      post: mocks.staticPost,
    },
    isAxiosError: vi.fn((err: unknown) => err instanceof Error),
  }
})

vi.mock('element-plus', () => ({
  ElMessage: { error: vi.fn(), success: vi.fn() },
}))

vi.mock('@/utils/tokenCrypto', () => ({
  setEncryptedToken: vi.fn(),
  getDecryptedToken: vi.fn().mockReturnValue(null),
  clearAllAuthTokens: vi.fn(),
}))

import {
  unwrapResponse,
  get,
  post,
  put,
  patch,
  del,
} from '@/api/request'

describe('request', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('unwrapResponse', () => {
    it('returns data when code is 0', async () => {
      const result = await unwrapResponse(Promise.resolve({ code: 0, data: { id: 1 }, message: '' }))
      expect(result).toEqual({ id: 1 })
    })

    it('throws error when code is not 0', async () => {
      await expect(
        unwrapResponse(Promise.resolve({ code: 400, data: null, message: 'Bad Request' })),
      ).rejects.toThrow('Bad Request')
    })

    it('throws default message when code is not 0 and message is empty', async () => {
      await expect(
        unwrapResponse(Promise.resolve({ code: 500, data: null, message: '' })),
      ).rejects.toThrow('请求失败')
    })
  })

  describe('get', () => {
    it('returns response data on success', async () => {
      const responseData = { code: 0, data: { id: 1 }, message: 'ok' }
      mocks.instanceGet.mockResolvedValueOnce({ data: responseData })

      const result = await get('/test/url')
      expect(result).toEqual(responseData)
      expect(mocks.instanceGet).toHaveBeenCalledWith('/test/url', { params: undefined })
    })

    it('passes params correctly', async () => {
      const responseData = { code: 0, data: {}, message: '' }
      mocks.instanceGet.mockResolvedValueOnce({ data: responseData })

      await get('/test/url', { page: 1, search: 'test' })
      expect(mocks.instanceGet).toHaveBeenCalledWith('/test/url', {
        params: { page: 1, search: 'test' },
      })
    })

    it('filters out null/undefined params', async () => {
      const responseData = { code: 0, data: {}, message: '' }
      mocks.instanceGet.mockResolvedValueOnce({ data: responseData })

      await get('/test/url', { page: 1, search: null, name: undefined, active: true })
      expect(mocks.instanceGet).toHaveBeenCalledWith('/test/url', {
        params: { page: 1, active: true },
      })
    })

    it('passes options object with useCache', async () => {
      const responseData = { code: 0, data: { items: [] }, message: '' }
      mocks.instanceGet.mockResolvedValueOnce({ data: responseData })

      const result = await get('/cached/url', { page: 1 }, { useCache: true, cacheTTL: 60000 })
      expect(result).toEqual(responseData)
    })

    it('supports legacy boolean cache parameter', async () => {
      const responseData = { code: 0, data: {}, message: '' }
      mocks.instanceGet.mockResolvedValueOnce({ data: responseData })

      const result = await get('/legacy/url', undefined, true, 300000)
      expect(result).toEqual(responseData)
      expect(mocks.instanceGet).toHaveBeenCalled()
    })

    it('passes no params when params is undefined', async () => {
      const responseData = { code: 0, data: null, message: '' }
      mocks.instanceGet.mockResolvedValueOnce({ data: responseData })

      await get('/test/url')
      expect(mocks.instanceGet).toHaveBeenCalledWith('/test/url', { params: undefined })
    })
  })

  describe('post', () => {
    it('returns response data', async () => {
      const responseData = { code: 0, data: { id: 1 }, message: 'created' }
      mocks.instancePost.mockResolvedValueOnce({ data: responseData })

      const result = await post('/test/url', { name: 'test' })
      expect(result).toEqual(responseData)
      expect(mocks.instancePost).toHaveBeenCalledWith('/test/url', { name: 'test' })
    })

    it('sends without data', async () => {
      const responseData = { code: 0, data: null, message: '' }
      mocks.instancePost.mockResolvedValueOnce({ data: responseData })

      await post('/test/url')
      expect(mocks.instancePost).toHaveBeenCalledWith('/test/url', undefined)
    })
  })

  describe('put', () => {
    it('returns response data', async () => {
      const responseData = { code: 0, data: { id: 1 }, message: 'updated' }
      mocks.instancePut.mockResolvedValueOnce({ data: responseData })

      const result = await put('/test/url/1', { name: 'updated' })
      expect(result).toEqual(responseData)
      expect(mocks.instancePut).toHaveBeenCalledWith('/test/url/1', { name: 'updated' })
    })

    it('sends without data', async () => {
      const responseData = { code: 0, data: null, message: '' }
      mocks.instancePut.mockResolvedValueOnce({ data: responseData })

      await put('/test/url/1')
      expect(mocks.instancePut).toHaveBeenCalledWith('/test/url/1', undefined)
    })
  })

  describe('patch', () => {
    it('returns response data', async () => {
      const responseData = { code: 0, data: { id: 1 }, message: 'patched' }
      mocks.instancePatch.mockResolvedValueOnce({ data: responseData })

      const result = await patch('/test/url/1', { name: 'patched' })
      expect(result).toEqual(responseData)
      expect(mocks.instancePatch).toHaveBeenCalledWith('/test/url/1', { name: 'patched' })
    })

    it('sends without data', async () => {
      const responseData = { code: 0, data: null, message: '' }
      mocks.instancePatch.mockResolvedValueOnce({ data: responseData })

      await patch('/test/url/1')
      expect(mocks.instancePatch).toHaveBeenCalledWith('/test/url/1', undefined)
    })
  })

  describe('del', () => {
    it('returns response data', async () => {
      const responseData = { code: 0, data: null, message: 'deleted' }
      mocks.instanceDelete.mockResolvedValueOnce({ data: responseData })

      const result = await del('/test/url/1')
      expect(result).toEqual(responseData)
      expect(mocks.instanceDelete).toHaveBeenCalledWith('/test/url/1')
    })
  })
})
