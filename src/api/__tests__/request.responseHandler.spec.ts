import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { AxiosResponse } from 'axios'
import { get } from '@/api/request'
import { ElMessage } from 'element-plus'
import { clearAllAuthTokens } from '@/utils/tokenCrypto'
import { refreshAccessToken, MissingRefreshTokenError } from '@/utils/tokenRefresh'
import { isTransientError } from '@/utils/requestErrors'

type ReqOk = (config: { method?: string; headers: Record<string, string> }) => {
  headers: Record<string, string>
}
type ReqErr = (error: unknown) => unknown
type ResOk = (response: AxiosResponse) => unknown
type ResErr = (error: unknown) => unknown

const handlers = vi.hoisted(() => ({
  reqOk: null as ReqOk | null,
  reqErr: null as ReqErr | null,
  resOk: null as ResOk | null,
  resErr: null as ResErr | null,
}))

const mocks = vi.hoisted(() => ({
  instanceGet: vi.fn(),
  instancePost: vi.fn(),
  instancePut: vi.fn(),
  instancePatch: vi.fn(),
  instanceDelete: vi.fn(),
}))

vi.mock('axios', () => {
  const mockInstance = Object.assign(
    vi.fn((config: { method?: string }) => {
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
        request: {
          use: vi.fn((ok: unknown, err: unknown) => {
            handlers.reqOk = ok as ReqOk
            handlers.reqErr = err as ReqErr
          }),
          eject: vi.fn(),
        },
        response: {
          use: vi.fn((ok: unknown, err: unknown) => {
            handlers.resOk = ok as ResOk
            handlers.resErr = err as ResErr
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
    default: { create: vi.fn(() => mockInstance) },
    isAxiosError: vi.fn((e: unknown) => (e as { isAxiosError?: boolean })?.isAxiosError === true),
  }
})

vi.mock('element-plus', () => ({
  ElMessage: { error: vi.fn(), success: vi.fn() },
}))

vi.mock('@/utils/tokenCrypto', () => ({
  getDecryptedToken: vi.fn(),
  clearAllAuthTokens: vi.fn(),
}))

vi.mock('@/utils/device', () => ({ detectAuthChannel: vi.fn(() => 'bearer') }))

vi.mock('@/utils/csrf', () => ({ getCsrfToken: vi.fn(() => null) }))

vi.mock('@/utils/traceId', () => ({ generateTraceId: vi.fn(() => 'trace-1') }))

vi.mock('@/utils/tokenRefresh', () => {
  class MissingRefreshTokenError extends Error {}
  return { refreshAccessToken: vi.fn(), MissingRefreshTokenError }
})

vi.mock('@/utils/requestErrors', () => ({ isTransientError: vi.fn(() => false) }))

type MockConfig = {
  url?: string
  method?: string
  _retry?: boolean
  _retryCount?: number
  headers?: Record<string, string>
}

type MockError = Error & {
  isAxiosError: boolean
  config: MockConfig
  response?: { status: number; data: unknown }
  request?: unknown
}

function makeHttpError(status: number, data: unknown = {}, url = '/api/guarded'): MockError {
  const error = new Error(`Request failed with status code ${status}`) as MockError
  error.isAxiosError = true
  error.config = { url, method: 'get', headers: {} }
  error.response = { status, data }
  return error
}

function makeNetworkError(message = 'Network Error'): MockError {
  const error = new Error(message) as MockError
  error.isAxiosError = true
  error.config = { url: '/api/guarded', method: 'get', headers: {} }
  error.response = undefined
  error.request = {}
  return error
}

function makeRes(method: string | undefined, url: string): AxiosResponse {
  return { config: { url, method, headers: {} }, data: {} } as unknown as AxiosResponse
}

describe('request responseHandler', () => {
  beforeEach(() => {
    mocks.instanceGet.mockReset()
    mocks.instancePost.mockReset()
    mocks.instancePut.mockReset()
    mocks.instancePatch.mockReset()
    mocks.instanceDelete.mockReset()
    vi.mocked(refreshAccessToken).mockReset()
    vi.mocked(clearAllAuthTokens).mockClear()
    vi.mocked(ElMessage.error).mockClear()
    vi.mocked(isTransientError).mockReset()
    vi.mocked(isTransientError).mockReturnValue(false)
    Object.defineProperty(window, 'location', {
      value: { href: '' },
      writable: true,
      configurable: true,
    })
    vi.spyOn(global, 'setTimeout').mockImplementation((fn: () => void) => {
      fn()
      return 0 as unknown as ReturnType<typeof setTimeout>
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('response fulfilled handler - cache invalidation', () => {
    it.each(['post', 'put', 'patch', 'delete'])(
      '%s response clears cache by URL pattern so next get hits API',
      async (method) => {
        const firstData = { code: 0, data: { v: 'first' }, message: '' }
        const secondData = { code: 0, data: { v: 'second' }, message: '' }
        mocks.instanceGet.mockResolvedValueOnce({ data: firstData })
        await get(`/rw-clears-${method}`, { q: 1 }, { useCache: true })
        handlers.resOk?.(makeRes(method, `/rw-clears-${method}?page=2`))
        mocks.instanceGet.mockResolvedValueOnce({ data: secondData })
        const result = await get(`/rw-clears-${method}`, { q: 1 }, { useCache: true })
        expect(result).toEqual(secondData)
        expect(mocks.instanceGet).toHaveBeenCalledTimes(2)
      },
    )

    it('GET response keeps cached entry usable', async () => {
      const data = { code: 0, data: { v: 'cached' }, message: '' }
      mocks.instanceGet.mockResolvedValueOnce({ data })
      await get('/rg-no-clear', { q: 1 }, { useCache: true })
      handlers.resOk?.(makeRes('get', '/rg-no-clear'))
      const result = await get('/rg-no-clear', { q: 1 }, { useCache: true })
      expect(result).toEqual(data)
      expect(mocks.instanceGet).toHaveBeenCalledTimes(1)
    })

    it('response without method does not touch cache', async () => {
      const data = { code: 0, data: { v: 'kept' }, message: '' }
      mocks.instanceGet.mockResolvedValueOnce({ data })
      await get('/rg-no-method', { q: 1 }, { useCache: true })
      handlers.resOk?.(makeRes(undefined, '/rg-no-method'))
      const result = await get('/rg-no-method', { q: 1 }, { useCache: true })
      expect(result).toEqual(data)
      expect(mocks.instanceGet).toHaveBeenCalledTimes(1)
    })
  })

  describe('response rejected handler - error messages', () => {
    it('403 shows no-permission message', async () => {
      const error = makeHttpError(403, { detail: 'forbidden' })
      await expect(handlers.resErr?.(error)).rejects.toBe(error)
      expect(vi.mocked(ElMessage.error)).toHaveBeenCalledWith('没有权限访问该资源')
    })

    it('404 shows not-found message', async () => {
      const error = makeHttpError(404, { detail: 'missing' })
      await expect(handlers.resErr?.(error)).rejects.toBe(error)
      expect(vi.mocked(ElMessage.error)).toHaveBeenCalledWith('请求的资源不存在或您无权访问')
    })

    it('500 prefixes server error with picked message', async () => {
      const error = makeHttpError(500, { detail: '数据库连接失败' })
      await expect(handlers.resErr?.(error)).rejects.toBe(error)
      expect(vi.mocked(ElMessage.error)).toHaveBeenCalledWith('服务器内部错误: 数据库连接失败')
    })

    it('500 with field-errors message joins first element of arrays', async () => {
      const error = makeHttpError(500, {
        message: '参数验证失败',
        data: { username: ['用户名已存在', 'taken'], code: 'bad' },
      })
      await expect(handlers.resErr?.(error)).rejects.toBe(error)
      expect(vi.mocked(ElMessage.error)).toHaveBeenCalledWith(
        '服务器内部错误: username: 用户名已存在 | code: bad',
      )
    })

    it('default status picks detail field', async () => {
      const error = makeHttpError(400, { detail: 'detail-msg' })
      await expect(handlers.resErr?.(error)).rejects.toBe(error)
      expect(vi.mocked(ElMessage.error)).toHaveBeenCalledWith('detail-msg')
    })

    it('default status picks message field', async () => {
      const error = makeHttpError(400, { message: 'message-msg' })
      await expect(handlers.resErr?.(error)).rejects.toBe(error)
      expect(vi.mocked(ElMessage.error)).toHaveBeenCalledWith('message-msg')
    })

    it('default status picks error field', async () => {
      const error = makeHttpError(400, { error: 'error-msg' })
      await expect(handlers.resErr?.(error)).rejects.toBe(error)
      expect(vi.mocked(ElMessage.error)).toHaveBeenCalledWith('error-msg')
    })

    it('validation-failed message without field-errors falls back to message', async () => {
      const error = makeHttpError(400, { message: '参数验证失败' })
      await expect(handlers.resErr?.(error)).rejects.toBe(error)
      expect(vi.mocked(ElMessage.error)).toHaveBeenCalledWith('参数验证失败')
    })

    it('unknown data payload falls back to generic message', async () => {
      const error = makeHttpError(400, {})
      await expect(handlers.resErr?.(error)).rejects.toBe(error)
      expect(vi.mocked(ElMessage.error)).toHaveBeenCalledWith('请求失败')
    })

    it('non-string message with empty field-errors falls back to generic', async () => {
      const error = makeHttpError(400, { detail: 42, data: {} })
      await expect(handlers.resErr?.(error)).rejects.toBe(error)
      expect(vi.mocked(ElMessage.error)).toHaveBeenCalledWith('请求失败')
    })

    it('error without status but with request shows network message', async () => {
      const error = makeNetworkError()
      await expect(handlers.resErr?.(error)).rejects.toBe(error)
      expect(vi.mocked(ElMessage.error)).toHaveBeenCalledWith('请求无响应，请检查网络连接')
    })

    it('error without status and request shows config error message', async () => {
      const error = new Error('bad request config') as MockError
      error.isAxiosError = true
      error.config = { method: 'get', headers: {} }
      await expect(handlers.resErr?.(error)).rejects.toBe(error)
      expect(vi.mocked(ElMessage.error)).toHaveBeenCalledWith('请求配置错误: bad request config')
    })
  })

  describe('response rejected handler - non axios errors', () => {
    it('rejects non-axios error and logs it', async () => {
      const error = new Error('plain failure')
      const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      await expect(handlers.resErr?.(error)).rejects.toBe(error)
      expect(errSpy).toHaveBeenCalledWith('非 Axios 错误:', error)
    })
  })

  describe('request interceptor error handler', () => {
    it('logs request config error and rejects', async () => {
      const error = new Error('bad config')
      const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      await expect(handlers.reqErr?.(error)).rejects.toBe(error)
      expect(errSpy).toHaveBeenCalledWith('请求配置错误:', error)
    })
  })

  describe('get() cache behaviors', () => {
    it('returns cached value on second call without hitting API', async () => {
      const data = { code: 0, data: { v: 1 }, message: '' }
      mocks.instanceGet.mockResolvedValue({ data })
      const first = await get('/rc-hit', { q: 1 }, { useCache: true })
      const second = await get('/rc-hit', { q: 1 }, { useCache: true })
      expect(first).toEqual(data)
      expect(second).toEqual(data)
      expect(mocks.instanceGet).toHaveBeenCalledTimes(1)
    })

    it('returns stale cached data with warning when a failed request refills cache', async () => {
      const stale = { code: 0, data: { v: 'stale' }, message: '' }
      mocks.instanceGet
        .mockImplementationOnce(async () => {
          await get('/rdg-stale', { v: 1 }, { useCache: true, cacheTTL: 30_000 })
          throw new Error('network down')
        })
        .mockResolvedValueOnce({ data: stale })
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const result = await get('/rdg-stale', { v: 1 }, { useCache: true })
      expect(result).toEqual(stale)
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('/rdg-stale'))
    })

    it('throws when cache is empty and request fails', async () => {
      mocks.instanceGet.mockRejectedValue(new Error('down'))
      await expect(get('/rdg-empty', { v: 1 }, { useCache: true })).rejects.toThrow('down')
    })
  })

  describe('401 handling', () => {
    it('login endpoint rejects without refresh', async () => {
      const error = makeHttpError(401, {}, '/auth/login/custom')
      await expect(handlers.resErr?.(error)).rejects.toBe(error)
      expect(vi.mocked(refreshAccessToken)).not.toHaveBeenCalled()
      expect(mocks.instanceGet).not.toHaveBeenCalled()
    })

    it('retry count exhausted clears tokens and redirects without refresh', async () => {
      const error = makeHttpError(401, {}, '/api/guarded')
      error.config._retryCount = 2
      await expect(handlers.resErr?.(error)).rejects.toBe(error)
      expect(vi.mocked(refreshAccessToken)).not.toHaveBeenCalled()
      expect(vi.mocked(clearAllAuthTokens)).toHaveBeenCalled()
      expect(vi.mocked(ElMessage.error)).toHaveBeenCalledWith('登录已过期，请重新登录')
      expect(window.location.href).toBe('/login')
    })

    it('transient refresh failure keeps session and rejects', async () => {
      const error = makeHttpError(401, {}, '/api/guarded')
      const refreshError = makeNetworkError()
      vi.mocked(refreshAccessToken).mockRejectedValue(refreshError)
      vi.mocked(isTransientError).mockReturnValue(true)
      const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      await expect(handlers.resErr?.(error)).rejects.toBe(refreshError)
      expect(errSpy).toHaveBeenCalledWith(expect.stringContaining('瞬时失败'))
      expect(vi.mocked(ElMessage.error)).toHaveBeenCalledWith('网络异常，请稍后重试')
      expect(vi.mocked(clearAllAuthTokens)).not.toHaveBeenCalled()
    })

    it('rotation race refresh failure replays original request', async () => {
      const error = makeHttpError(401, {}, '/api/guarded')
      vi.mocked(refreshAccessToken).mockRejectedValue(new Error('race'))
      mocks.instanceGet.mockResolvedValue({ data: { code: 0, data: {}, message: '' } })
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      await handlers.resErr?.(error)
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('轮换竞态'))
      expect(mocks.instanceGet).toHaveBeenCalled()
      expect(vi.mocked(clearAllAuthTokens)).not.toHaveBeenCalled()
    })

    it('MissingRefreshTokenError clears tokens and redirects to login', async () => {
      const error = makeHttpError(401, {}, '/api/guarded')
      vi.mocked(refreshAccessToken).mockRejectedValue(new MissingRefreshTokenError('no refresh'))
      await expect(handlers.resErr?.(error)).rejects.toBeInstanceOf(MissingRefreshTokenError)
      expect(vi.mocked(clearAllAuthTokens)).toHaveBeenCalled()
      expect(vi.mocked(ElMessage.error)).toHaveBeenCalledWith('登录已过期，请重新登录')
      expect(window.location.href).toBe('/login')
    })
  })
})
