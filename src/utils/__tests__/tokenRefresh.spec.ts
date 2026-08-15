import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { refreshAccessToken, RefreshSessionError, MissingRefreshTokenError } from '../tokenRefresh'

const axiosPost = vi.hoisted(() => vi.fn())
const tokenCrypto = vi.hoisted(() => ({
  setEncryptedToken: vi.fn(),
  getDecryptedToken: vi.fn(),
}))
const csrf = vi.hoisted(() => ({ getCsrfToken: vi.fn() }))

vi.mock('axios', () => ({
  default: { post: axiosPost },
  isAxiosError: (e: unknown) => (e as { isAxiosError?: boolean })?.isAxiosError === true,
}))

vi.mock('@/utils/tokenCrypto', () => tokenCrypto)
vi.mock('@/utils/csrf', () => csrf)
vi.mock('@/utils/traceId', () => ({ generateTraceId: vi.fn(() => 'test-trace-id') }))

function okResponse(access: string, refresh?: string) {
  return { data: { code: 0, message: 'ok', data: { access, refresh } } }
}

function makeTransientError() {
  const error = new Error('Network Error') as Error & {
    isAxiosError: boolean
    response?: unknown
  }
  error.isAxiosError = true
  return error
}

function makeHttpError(status: number) {
  const error = new Error(`Request failed with status code ${status}`) as Error & {
    isAxiosError: boolean
    response: { status: number; data: Record<string, unknown> }
  }
  error.isAxiosError = true
  error.response = { status, data: {} }
  return error
}

describe('refreshAccessToken - bearer channel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    tokenCrypto.getDecryptedToken.mockReturnValue('refresh-token')
  })

  it('should persist new access AND new refresh token on success', async () => {
    axiosPost.mockResolvedValueOnce(okResponse('new-access', 'new-refresh'))

    const access = await refreshAccessToken('bearer')

    expect(access).toBe('new-access')
    expect(tokenCrypto.setEncryptedToken).toHaveBeenCalledWith('access_token', 'new-access')
    // 轮换修复：必须持久化新 refresh，否则下次刷新 400
    expect(tokenCrypto.setEncryptedToken).toHaveBeenCalledWith('refresh_token', 'new-refresh')
  })

  it('should tolerate missing new refresh in response', async () => {
    axiosPost.mockResolvedValueOnce(okResponse('new-access'))

    await refreshAccessToken('bearer')

    expect(tokenCrypto.setEncryptedToken).toHaveBeenCalledWith('access_token', 'new-access')
    expect(tokenCrypto.setEncryptedToken).not.toHaveBeenCalledWith(
      'refresh_token',
      expect.anything(),
    )
  })

  it('should throw MissingRefreshTokenError when no refresh token', async () => {
    tokenCrypto.getDecryptedToken.mockReturnValue(null)

    await expect(refreshAccessToken('bearer')).rejects.toBeInstanceOf(MissingRefreshTokenError)
    expect(axiosPost).not.toHaveBeenCalled()
  })

  it('should throw RefreshSessionError when business code != 0', async () => {
    axiosPost.mockResolvedValueOnce({
      data: { code: 401, message: 'Token 已过期', data: null },
    })

    await expect(refreshAccessToken('bearer')).rejects.toBeInstanceOf(RefreshSessionError)
  })

  it('should throw RefreshSessionError when access missing', async () => {
    axiosPost.mockResolvedValueOnce({ data: { code: 0, message: 'ok', data: {} } })

    await expect(refreshAccessToken('bearer')).rejects.toBeInstanceOf(RefreshSessionError)
  })

  it('should retry once on transient network error then succeed', async () => {
    axiosPost
      .mockRejectedValueOnce(makeTransientError())
      .mockResolvedValueOnce(okResponse('recovered'))

    const access = await refreshAccessToken('bearer')

    expect(access).toBe('recovered')
    expect(axiosPost).toHaveBeenCalledTimes(2)
  })

  it('should NOT retry non-transient HTTP 401', async () => {
    axiosPost.mockRejectedValue(makeHttpError(401))

    await expect(refreshAccessToken('bearer')).rejects.toBeDefined()
    expect(axiosPost).toHaveBeenCalledTimes(1)
  })

  it('should single-flight concurrent calls (refresh once)', async () => {
    axiosPost.mockResolvedValue(okResponse('shared-access'))

    const [a, b, c] = await Promise.all([
      refreshAccessToken('bearer'),
      refreshAccessToken('bearer'),
      refreshAccessToken('bearer'),
    ])

    expect(a).toBe('shared-access')
    expect(b).toBe('shared-access')
    expect(c).toBe('shared-access')
    expect(axiosPost).toHaveBeenCalledTimes(1)
  })

  it('should allow a new refresh after the previous one failed', async () => {
    axiosPost
      .mockRejectedValueOnce(makeHttpError(401))
      .mockResolvedValueOnce(okResponse('second-try'))

    await expect(refreshAccessToken('bearer')).rejects.toBeDefined()
    const access = await refreshAccessToken('bearer')
    expect(access).toBe('second-try')
    expect(axiosPost).toHaveBeenCalledTimes(2)
  })
})

describe('refreshAccessToken - cookie channel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    csrf.getCsrfToken.mockReturnValue('csrf-token')
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('should send empty body with X-CSRFToken and withCredentials', async () => {
    axiosPost.mockResolvedValueOnce(okResponse('cookie-access'))

    const access = await refreshAccessToken('cookie')

    expect(access).toBe('cookie-access')
    const [, body, config] = axiosPost.mock.calls[0] as [string, unknown, Record<string, unknown>]
    expect(body).toBeUndefined()
    expect(config.headers).toMatchObject({
      'X-CSRFToken': 'csrf-token',
      'X-Requested-With': 'XMLHttpRequest',
    })
    expect(config.withCredentials).toBe(true)
    // cookie 通道不写 localStorage
    expect(tokenCrypto.setEncryptedToken).not.toHaveBeenCalled()
  })

  it('should skip X-CSRFToken header when csrf token missing', async () => {
    csrf.getCsrfToken.mockReturnValue(null)
    axiosPost.mockResolvedValueOnce(okResponse('cookie-access'))

    await refreshAccessToken('cookie')

    const [, , config] = axiosPost.mock.calls[0] as [string, unknown, Record<string, string>]
    expect(config.headers['X-CSRFToken']).toBeUndefined()
  })

  it('should throw RefreshSessionError on business failure', async () => {
    axiosPost.mockResolvedValueOnce({ data: { code: 401, message: '无效', data: null } })

    await expect(refreshAccessToken('cookie')).rejects.toBeInstanceOf(RefreshSessionError)
  })

  it('should retry once on transient error then succeed', async () => {
    axiosPost
      .mockRejectedValueOnce(makeTransientError())
      .mockResolvedValueOnce(okResponse('cookie-recovered'))

    const access = await refreshAccessToken('cookie')
    expect(access).toBe('cookie-recovered')
    expect(axiosPost).toHaveBeenCalledTimes(2)
  })
})
