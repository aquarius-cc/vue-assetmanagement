/**
 * @file entityStoreRequestControl / entityStoreCache 单测
 * @module stores/__tests__/entityStoreRequestControl
 * @description 覆盖防抖 + 可缓存的请求控制分支，以及防抖定时器重置分支。
 */
import { describe, it, expect, vi, afterEach } from 'vitest'
import { ref } from 'vue'
import { withRequestControl } from '../entityStoreRequestControl'
import type { RequestControlContext } from '../entityStoreRequestControl'
import { getCache, getPendingSet, getDebounceMap, runDebounced } from '../entityStoreCache'
import type { EntityState } from '../entityStoreTypes'

interface Item {
  id: string
}

const makeCtx = (
  storeId: string,
  overrides: { enableCache?: boolean; enableDebounce?: boolean } = {},
): RequestControlContext<Item> => ({
  config: {
    enableCache: true,
    cacheTTL: 60_000,
    enableDebounce: true,
    debounceDelay: 10,
    storeId,
    ...overrides,
  },
  entityState: ref<EntityState<Item>>({ entities: {}, ids: [], loading: false }),
  loadingCount: ref(0),
  cache: getCache(storeId),
  pendingSet: getPendingSet(storeId),
  debounceMap: getDebounceMap(storeId),
})

describe('withRequestControl 防抖分支', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('防抖且可缓存时应执行一次并写入缓存', async () => {
    vi.useFakeTimers()
    const ctx = makeCtx('rc-debounce-cache')
    const fn = vi.fn().mockResolvedValue({ id: '1' })

    const promise = withRequestControl(ctx, 'get:1', fn, { cacheable: true, debounced: true })
    await vi.advanceTimersByTimeAsync(20)

    await expect(promise).resolves.toEqual({ id: '1' })
    expect(fn).toHaveBeenCalledTimes(1)
    expect(ctx.cache.has('get:1')).toBe(true)
  })

  it('防抖执行体失败时应抛出且不写缓存', async () => {
    vi.useFakeTimers()
    const ctx = makeCtx('rc-debounce-reject')
    const fn = vi.fn().mockRejectedValue(new Error('boom'))

    const promise = withRequestControl(ctx, 'get:2', fn, { cacheable: true, debounced: true })
    const assertion = expect(promise).rejects.toThrow('boom')
    await vi.advanceTimersByTimeAsync(20)
    await assertion

    expect(ctx.cache.has('get:2')).toBe(false)
  })

  it('防抖未启用时立即执行', async () => {
    const ctx = makeCtx('rc-no-debounce', { enableDebounce: false })
    const fn = vi.fn().mockResolvedValue({ id: '3' })

    await expect(
      withRequestControl(ctx, 'get:3', fn, { cacheable: true, debounced: true }),
    ).resolves.toEqual({ id: '3' })
    expect(fn).toHaveBeenCalledTimes(1)
  })
})

describe('runDebounced', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('同 key 重复调用应重置定时器只执行一次', () => {
    vi.useFakeTimers()
    const map = getDebounceMap('rc-run-debounce')
    const fn = vi.fn().mockResolvedValue(undefined)

    runDebounced(map, 'k', fn, 10)
    runDebounced(map, 'k', fn, 10)
    vi.advanceTimersByTime(20)

    expect(fn).toHaveBeenCalledTimes(1)
  })
})
