import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const { mockRequest } = vi.hoisted(() => ({
  mockRequest: {
    get: vi.fn().mockResolvedValue({ code: 0, data: {}, message: '' }),
    post: vi.fn().mockResolvedValue({ code: 0, data: {}, message: '' }),
    put: vi.fn().mockResolvedValue({ code: 0, data: {}, message: '' }),
    patch: vi.fn().mockResolvedValue({ code: 0, data: {}, message: '' }),
    delete: vi.fn().mockResolvedValue({ code: 0, data: {}, message: '' }),
  },
}))

vi.mock('@/api/index', () => ({
  request: mockRequest,
  unwrapResponse: vi.fn(async (p: Promise<{ code: number; data: unknown }>) => {
    const res = await p
    return res.data
  }),
}))

vi.mock('axios', () => ({
  isAxiosError: vi.fn((err: unknown) => {
    return err instanceof Error && 'isAxiosError' in err
  }),
}))

import { networkAPI } from '@/api/network'

describe('networkAPI', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('testConnection returns success when GET / succeeds', async () => {
    mockRequest.get.mockResolvedValueOnce({ data: 'ok' })
    const result = await networkAPI.testConnection()
    expect(result.status).toBe('success')
    expect(mockRequest.get).toHaveBeenCalledWith('/')
  })

  it('testConnection returns error when GET / fails with ERR_NETWORK', async () => {
    const error = Object.assign(new Error('Network Error'), {
      isAxiosError: true,
      code: 'ERR_NETWORK',
      response: undefined,
    })
    mockRequest.get.mockRejectedValueOnce(error)
    const result = await networkAPI.testConnection()
    expect(result.status).toBe('error')
  })

  it('testConnection returns success when server responds with error status', async () => {
    const error = Object.assign(new Error('Request failed'), {
      isAxiosError: true,
      response: { status: 500 },
    })
    mockRequest.get.mockRejectedValueOnce(error)
    const result = await networkAPI.testConnection()
    expect(result.status).toBe('success')
  })

  it('testLoginAPI calls fetch with OPTIONS method', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: new Headers({ 'content-type': 'application/json' }),
    })
    vi.stubGlobal('fetch', mockFetch)
    const result = await networkAPI.testLoginAPI()
    expect(result.status).toBe('success')
    expect(mockFetch).toHaveBeenCalled()
  })

  it('testLoginAPI returns error when fetch fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')))
    const result = await networkAPI.testLoginAPI()
    expect(result.status).toBe('error')
  })
})
