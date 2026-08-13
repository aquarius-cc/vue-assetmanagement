import { describe, it, expect, vi, beforeEach } from 'vitest'

type ErrorHandler = (error: unknown) => unknown

const handlerRef = vi.hoisted(() => ({
  fn: null as ErrorHandler | null,
}))

const mocks = vi.hoisted(() => ({
  instanceGet: vi.fn(),
  instancePost: vi.fn(),
  instancePut: vi.fn(),
  instancePatch: vi.fn(),
  instanceDelete: vi.fn(),
  staticPost: vi.fn(),
}))

vi.mock('axios', () => {
  const mockAxiosInstance = Object.assign(
    vi.fn((config: { method?: string; url?: string; headers?: Record<string, string> }) => {
      const method = config?.method?.toLowerCase()
      if (method === 'get') return mocks.instanceGet(config)
      if (method === 'post') return mocks.instancePost(config)
      if (method === 'put') return mocks.instancePut(config)
      if (method === 'patch') return mocks.instancePatch(config)
      if (method === 'delete') return mocks.instanceDelete(config)
      return Promise.resolve({ data: {} })
    }),
    {
      interceptors: {
        request: { use: vi.fn(), eject: vi.fn() },
        response: {
          use: vi.fn((_onFulfilled: unknown, onRejected: unknown) => {
            handlerRef.fn = onRejected as ErrorHandler
          }),
          eject: vi.fn(),
        },
      },
      get: mocks.instanceGet,
      post: mocks.instancePost,
      put: mocks.instancePut,
      patch: mocks.instancePatch,
      delete: mocks.instanceDelete,
    },
  )
  return {
    default: {
      create: vi.fn(() => mockAxiosInstance),
      post: mocks.staticPost,
    },
    isAxiosError: vi.fn(
      (err: unknown) => (err as { isAxiosError?: boolean })?.isAxiosError === true,
    ),
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

vi.mock('@/utils/traceId', () => ({
  generateTraceId: vi.fn(() => 'test-trace-id'),
}))

import { setEncryptedToken, getDecryptedToken, clearAllAuthTokens } from '@/utils/tokenCrypto'
import { generateTraceId } from '@/utils/traceId'
import { ElMessage } from 'element-plus'
import { unwrapResponse, get, post, put, patch, del } from '@/api/request'

function getResponseHandler(): ErrorHandler | null {
  return handlerRef.fn
}

function makeAxiosError(status: number, url = '/test/api', data: Record<string, unknown> = {}) {
  const error = new Error(`Request failed with status code ${status}`) as Error & {
    isAxiosError: boolean
    config: {
      url: string
      method?: string
      _retry?: boolean
      _retryCount?: number
      headers: Record<string, string>
    }
    response: { status: number; data: Record<string, unknown> }
  }
  error.isAxiosError = true
  error.config = { url, method: 'get', headers: {} }
  error.response = { status, data }
  return error
}

function makeNetworkError(url = '/test/api') {
  const error = new Error('Network Error') as Error & {
    isAxiosError: boolean
    config: {
      url: string
      method?: string
      _retry?: boolean
      _retryCount?: number
      headers: Record<string, string>
    }
    response: undefined
    request: XMLHttpRequest
  }
  error.isAxiosError = true
  error.config = { url, method: 'get', headers: {} }
  error.response = undefined
  error.request = {} as XMLHttpRequest
  return error
}

describe('request', () => {
  beforeEach(() => {
    mocks.instanceGet.mockClear()
    mocks.instancePost.mockClear()
    mocks.instancePut.mockClear()
    mocks.instancePatch.mockClear()
    mocks.instanceDelete.mockClear()
    mocks.staticPost.mockClear()
    vi.mocked(setEncryptedToken).mockClear()
    vi.mocked(getDecryptedToken).mockClear()
    vi.mocked(clearAllAuthTokens).mockClear()
    vi.mocked(ElMessage.error).mockClear()
    vi.mocked(generateTraceId).mockClear()
    vi.mocked(getDecryptedToken).mockReturnValue(null)
    vi.spyOn(global, 'setTimeout').mockImplementation((fn: () => void) => {
      fn()
      return 0 as unknown as ReturnType<typeof setTimeout>
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('unwrapResponse', () => {
    it('returns data when code is 0', async () => {
      const result = await unwrapResponse(
        Promise.resolve({ code: 0, data: { id: 1 }, message: '' }),
      )
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

  describe('401 token refresh interceptor', () => {
    it('401 → refresh success → replay with new token', async () => {
      vi.mocked(getDecryptedToken).mockReturnValue('mock-refresh-token')
      const newAccessToken = 'new-access-token'
      const originalUrl = '/test/api'

      mocks.staticPost.mockResolvedValueOnce({
        data: {
          code: 0,
          message: 'Token 刷新成功',
          data: { access: newAccessToken, refresh: 'new-refresh-token' },
        },
      })
      mocks.instanceGet.mockResolvedValueOnce({
        data: { code: 0, data: { success: true }, message: 'ok' },
      })

      const error = makeAxiosError(401, originalUrl)
      await getResponseHandler()?.(error)

      expect(mocks.staticPost).toHaveBeenCalledTimes(1)
      expect(setEncryptedToken).toHaveBeenCalledWith('access_token', newAccessToken)
      expect(mocks.instanceGet).toHaveBeenCalled()

      const replayCallArgs = mocks.instanceGet.mock.calls[0][0] as {
        url: string
        headers: { Authorization: string }
      }
      expect(replayCallArgs.url).toBe(originalUrl)
      expect(replayCallArgs.headers.Authorization).toBe(`Bearer ${newAccessToken}`)
    })

    it('refresh returns code ≠ 0 (business failure) → fatal logout', async () => {
      vi.mocked(getDecryptedToken).mockReturnValue('mock-refresh-token')

      mocks.staticPost.mockResolvedValueOnce({
        data: {
          code: 401,
          message: 'Token 已过期',
          data: null,
        },
      })

      const error = makeAxiosError(401, '/test/api')
      await expect(getResponseHandler()?.(error)).rejects.toBeDefined()

      expect(setEncryptedToken).not.toHaveBeenCalled()
      expect(clearAllAuthTokens).toHaveBeenCalled()
      expect(ElMessage.error).toHaveBeenCalledWith('登录已过期，请重新登录')
    })

    it('refresh returns 401 → fatal logout', async () => {
      vi.mocked(getDecryptedToken).mockReturnValue('mock-refresh-token')

      const refreshError = new Error('Request failed with status code 401') as Error & {
        isAxiosError: boolean
        response: { status: number; data: Record<string, unknown> }
      }
      refreshError.isAxiosError = true
      refreshError.response = { status: 401, data: {} }

      mocks.staticPost.mockRejectedValueOnce(refreshError)

      const error = makeAxiosError(401, '/test/api')
      await expect(getResponseHandler()?.(error)).rejects.toBeDefined()

      expect(clearAllAuthTokens).toHaveBeenCalled()
    })

    it('refresh network error → transient retry once, keep session', async () => {
      vi.mocked(getDecryptedToken).mockReturnValue('mock-refresh-token')

      mocks.staticPost
        .mockRejectedValueOnce(makeNetworkError('/auth/token/refresh/'))
        .mockResolvedValueOnce({
          data: {
            code: 0,
            message: 'Token 刷新成功',
            data: { access: 'recovered-access', refresh: 'recovered-refresh' },
          },
        })

      mocks.instanceGet.mockResolvedValueOnce({
        data: { code: 0, data: { ok: true }, message: 'ok' },
      })

      const error = makeAxiosError(401, '/test/api')
      await getResponseHandler()?.(error)

      expect(mocks.staticPost).toHaveBeenCalledTimes(2)
      expect(setEncryptedToken).toHaveBeenCalledWith('access_token', 'recovered-access')
      expect(clearAllAuthTokens).not.toHaveBeenCalled()
    })

    it('refresh 429 → transient, no logout', async () => {
      vi.mocked(getDecryptedToken).mockReturnValue('mock-refresh-token')

      const rateLimitError = new Error('Request failed with status code 429') as Error & {
        isAxiosError: boolean
        response: { status: number; data: Record<string, unknown> }
      }
      rateLimitError.isAxiosError = true
      rateLimitError.response = { status: 429, data: { detail: 'Too many requests' } }

      mocks.staticPost.mockRejectedValue(rateLimitError)

      const error = makeAxiosError(401, '/test/api')
      await expect(getResponseHandler()?.(error)).rejects.toBeDefined()

      expect(clearAllAuthTokens).not.toHaveBeenCalled()
      expect(ElMessage.error).toHaveBeenCalledWith('网络异常，请稍后重试')
    })

    it('refresh 5xx → transient, no logout', async () => {
      vi.mocked(getDecryptedToken).mockReturnValue('mock-refresh-token')

      const serverError = new Error('Request failed with status code 500') as Error & {
        isAxiosError: boolean
        response: { status: number; data: Record<string, unknown> }
      }
      serverError.isAxiosError = true
      serverError.response = { status: 500, data: { detail: 'Internal Server Error' } }

      mocks.staticPost.mockRejectedValue(serverError)

      const error = makeAxiosError(401, '/test/api')
      await expect(getResponseHandler()?.(error)).rejects.toBeDefined()

      expect(clearAllAuthTokens).not.toHaveBeenCalled()
      expect(ElMessage.error).toHaveBeenCalledWith('网络异常，请稍后重试')
    })

    it('concurrent two 401s → single flight (refresh called once)', async () => {
      vi.mocked(getDecryptedToken).mockReturnValue('mock-refresh-token')

      mocks.staticPost.mockResolvedValue({
        data: {
          code: 0,
          message: 'Token 刷新成功',
          data: { access: 'shared-access', refresh: 'shared-refresh' },
        },
      })

      mocks.instanceGet.mockResolvedValue({
        data: { code: 0, data: { ok: true }, message: 'ok' },
      })

      const error1 = makeAxiosError(401, '/api/a')
      const error2 = makeAxiosError(401, '/api/b')

      const handler = getResponseHandler()
      await Promise.all([handler?.(error1), handler?.(error2)])

      expect(mocks.staticPost).toHaveBeenCalledTimes(1)
    })

    it('no refresh_token → fatal logout', async () => {
      vi.mocked(getDecryptedToken).mockReturnValue(null)

      const error = makeAxiosError(401, '/test/api')
      await expect(getResponseHandler()?.(error)).rejects.toBeDefined()

      expect(mocks.staticPost).not.toHaveBeenCalled()
      expect(clearAllAuthTokens).toHaveBeenCalled()
      expect(ElMessage.error).toHaveBeenCalledWith('登录已过期，请重新登录')
    })

    it('replay preserves original X-Request-ID', async () => {
      const existingTraceId = 'existing-trace-id'
      vi.mocked(getDecryptedToken).mockReturnValue('mock-refresh-token')

      mocks.staticPost.mockResolvedValueOnce({
        data: {
          code: 0,
          message: 'Token 刷新成功',
          data: { access: 'access-token', refresh: 'refresh-token' },
        },
      })
      mocks.instanceGet.mockResolvedValueOnce({
        data: { code: 0, data: {}, message: 'ok' },
      })

      const error = makeAxiosError(401, '/test/api')
      error.config.headers['X-Request-ID'] = existingTraceId

      await getResponseHandler()?.(error)

      const replayHeaders = (
        mocks.instanceGet.mock.calls[0][0] as { headers: Record<string, string> }
      ).headers
      expect(replayHeaders['X-Request-ID']).toBe(existingTraceId)
    })

    it('retry limit exceeded (3rd 401) → no refresh, direct logout', async () => {
      vi.mocked(getDecryptedToken).mockReturnValue('mock-refresh-token')

      const error = makeAxiosError(401, '/test/api')
      error.config._retry = false
      error.config._retryCount = 2

      await expect(getResponseHandler()?.(error)).rejects.toBeDefined()

      expect(mocks.staticPost).not.toHaveBeenCalled()
      expect(clearAllAuthTokens).toHaveBeenCalled()
    })
  })
})
