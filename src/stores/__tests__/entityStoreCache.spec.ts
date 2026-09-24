import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import {
  getCache,
  getPendingSet,
  getDebounceMap,
  getCached,
  setCache,
  isRequestPending,
  setRequestPending,
  runDebounced,
} from '../entityStoreCache'

describe('entityStoreCache', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(1000))
  })

  afterEach(() => {
    vi.clearAllTimers()
    vi.useRealTimers()
  })

  describe('按 storeId 隔离的容器', () => {
    it('getCache 应返回同一 storeId 的同一缓存实例', () => {
      const a = getCache('alpha')
      const b = getCache('alpha')
      const other = getCache('beta')

      expect(b).toBe(a)
      expect(other).not.toBe(a)
    })

    it('getPendingSet 应返回同一 storeId 的同一防重实例', () => {
      const a = getPendingSet('alpha')
      const b = getPendingSet('alpha')
      const other = getPendingSet('beta')

      expect(b).toBe(a)
      expect(other).not.toBe(a)
    })

    it('getDebounceMap 应返回同一 storeId 的同一防抖实例', () => {
      const a = getDebounceMap('alpha')
      const b = getDebounceMap('alpha')
      const other = getDebounceMap('beta')

      expect(b).toBe(a)
      expect(other).not.toBe(a)
    })
  })

  describe('缓存读写', () => {
    it('未过期数据应命中，过期数据应删除并返回 null', () => {
      const cache = new Map()
      setCache(cache, 'k', { x: 1 })

      expect(getCached(cache, 'k', 5000)).toEqual({ x: 1 })

      vi.setSystemTime(new Date(7000))
      expect(getCached(cache, 'k', 5000)).toBeNull()
      expect(cache.has('k')).toBe(false)
    })

    it('恰好到达 TTL 边界应视为过期', () => {
      const cache = new Map()
      setCache(cache, 'k', { x: 1 })

      vi.setSystemTime(new Date(6000))
      expect(getCached(cache, 'k', 5000)).toBeNull()
      expect(cache.has('k')).toBe(false)
    })

    it('不存在的 key 应返回 null', () => {
      const cache = new Map()
      expect(getCached(cache, 'missing', 5000)).toBeNull()
    })

    it('setCache 应覆盖已有缓存', () => {
      const cache = new Map()
      setCache(cache, 'k', { x: 1 })
      setCache(cache, 'k', { x: 2 })

      expect(getCached(cache, 'k', 5000)).toEqual({ x: 2 })
    })
  })

  describe('防重与防抖', () => {
    it('setRequestPending 应支持启动与取消', () => {
      const pending = getPendingSet('alpha')

      setRequestPending(pending, 'k', true)
      expect(isRequestPending(pending, 'k')).toBe(true)

      setRequestPending(pending, 'k', false)
      expect(isRequestPending(pending, 'k')).toBe(false)
    })

    it('runDebounced 延迟后执行并清理计时器', async () => {
      const debounceMap = getDebounceMap('alpha')
      const fn = vi.fn().mockResolvedValue(undefined)

      runDebounced(debounceMap, 'k', fn, 100)
      expect(debounceMap.has('k')).toBe(true)

      await vi.advanceTimersByTimeAsync(100)
      expect(fn).toHaveBeenCalledTimes(1)
      expect(debounceMap.has('k')).toBe(false)
    })

    it('runDebounced 重复调用应清除前一次计时器', async () => {
      const debounceMap = getDebounceMap('alpha')
      const first = vi.fn().mockResolvedValue(undefined)
      const second = vi.fn().mockResolvedValue(undefined)

      runDebounced(debounceMap, 'k', first, 100)
      runDebounced(debounceMap, 'k', second, 100)

      await vi.advanceTimersByTimeAsync(100)
      expect(first).not.toHaveBeenCalled()
      expect(second).toHaveBeenCalledTimes(1)
      expect(debounceMap.has('k')).toBe(false)
    })
  })
})
