/**
 * 缓存身份隔离测试（A1/MA-01）
 *
 * 口径：
 * - 缓存键含工号 scope 前缀：换号后同 URL 必 miss（绕过前用户行级数据缓存）
 * - resetAuthState 全量失效：epoch 防在途回填 + 清降级信号
 * - 失效 pattern 子串匹配不受前缀影响（clearCacheByPattern 回归）
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

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
    vi.fn((config: { method?: string; url?: string }) => {
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
          use: vi.fn(),
          eject: vi.fn(),
        },
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

import {
  degradedCacheKeys,
  clearAllCache,
  clearCacheByPattern,
  get,
  setCacheIdentityScope,
} from '@/api/request'
import { useAuthStore } from '@/stores/auth'

const RESP = (data: Record<string, unknown>) => ({
  data: { code: 0, data, message: '' },
})

/** 四个启用缓存的详情端点（MA-01 描述的攻击面） */
const DETAIL_URLS = [
  '/assets/asset-types/X/',
  '/assets/storages/X/',
  '/assets/lost-assets/X/',
  '/assets/contracts/X/',
]

beforeEach(() => {
  clearAllCache()
  setCacheIdentityScope('')
  degradedCacheKeys.clear()
  mocks.instanceGet.mockReset()
  mocks.instanceGet.mockResolvedValue(RESP({ id: 1 }))
})

describe('缓存身份隔离（A1/MA-01）', () => {
  it('T1: resetAuthState 后同 key 必 miss（服务端重新请求）', async () => {
    setActivePinia(createPinia())
    const store = useAuthStore()
    setCacheIdentityScope('U001')
    await get('/assets/assets/X/', undefined, { useCache: true })
    expect(mocks.instanceGet).toHaveBeenCalledTimes(1)

    // silentLogout = 生产真实登出路径（内部走 resetAuthState → clearAllCache）
    store.silentLogout()
    await get('/assets/assets/X/', undefined, { useCache: true })
    expect(mocks.instanceGet).toHaveBeenCalledTimes(2)
  })

  it('T2: 用户 A 的缓存不串给用户 B（4 个详情端点全部回源）', async () => {
    setCacheIdentityScope('userA')
    for (const url of DETAIL_URLS) {
      await get(url, undefined, { useCache: true })
    }
    expect(mocks.instanceGet).toHaveBeenCalledTimes(4)

    // 换号：登出（清缓存 + scope 归零）→ 用户 B 登录（scope = userB）
    setCacheIdentityScope('')
    clearAllCache()
    setCacheIdentityScope('userB')
    for (const url of DETAIL_URLS) {
      await get(url, undefined, { useCache: true })
    }
    expect(mocks.instanceGet).toHaveBeenCalledTimes(8)
  })

  it('T3: 在途旧响应在 clearAllCache 后被代际守卫丢弃，不回填缓存', async () => {
    setCacheIdentityScope('U001')
    let resolveInFlight: (v: ReturnType<typeof RESP>) => void = () => {}
    mocks.instanceGet.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveInFlight = resolve
        }),
    )

    const inFlight = get('/assets/assets/X/', undefined, { useCache: true })
    clearAllCache()
    resolveInFlight(RESP({ id: 'stale' }))
    await inFlight

    // 在途回填被 epoch 守卫拦截：随后同 key 请求必打到服务端
    await get('/assets/assets/X/', undefined, { useCache: true })
    expect(mocks.instanceGet).toHaveBeenCalledTimes(2)
  })

  it('T4: scope 切换必 miss，且 clearCacheByPattern 在带前缀 key 上仍命中', async () => {
    setCacheIdentityScope('userA')
    await get('/assets/assets/X/', undefined, { useCache: true })
    expect(mocks.instanceGet).toHaveBeenCalledTimes(1)

    // 换 scope：同 URL miss（前缀不同 → key 不同）
    setCacheIdentityScope('userB')
    await get('/assets/assets/X/', undefined, { useCache: true })
    expect(mocks.instanceGet).toHaveBeenCalledTimes(2)

    // 失效 pattern 子串匹配不受前缀影响：clear 后再次回源
    clearCacheByPattern('/assets/assets/X/')
    await get('/assets/assets/X/', undefined, { useCache: true })
    expect(mocks.instanceGet).toHaveBeenCalledTimes(3)
  })

  it('T5: clearAllCache 清空降级信号（前用户会话的降级 Banner 不残留）', () => {
    degradedCacheKeys.add('/assets/assets/X/?')
    degradedCacheKeys.add('/assets/assets/Y/?')
    expect(degradedCacheKeys.size).toBe(2)

    clearAllCache()
    expect(degradedCacheKeys.size).toBe(0)
  })
})
