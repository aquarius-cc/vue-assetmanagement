import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryCache } from '@/api/cache'

describe('MemoryCache', () => {
  let cache: MemoryCache

  beforeEach(() => {
    vi.useFakeTimers()
    cache = new MemoryCache(5)
  })

  it('stores and retrieves a value', () => {
    cache.set('key1', 'value1')
    expect(cache.get('key1')).toBe('value1')
  })

  it('returns undefined for missing key', () => {
    expect(cache.get('nonexistent')).toBeUndefined()
  })

  it('returns undefined for expired entry', () => {
    cache.set('key1', 'value1', 1000)
    vi.advanceTimersByTime(1001)
    expect(cache.get('key1')).toBeUndefined()
  })

  it('clears all entries', () => {
    cache.set('key1', 'value1')
    cache.set('key2', 'value2')
    cache.clear()
    expect(cache.get('key1')).toBeUndefined()
    expect(cache.get('key2')).toBeUndefined()
  })

  it('clears expired entries', () => {
    cache.set('key1', 'value1', 1000)
    cache.set('key2', 'value2', 5000)
    vi.advanceTimersByTime(1500)
    cache.clearExpired()
    expect(cache.get('key1')).toBeUndefined()
    expect(cache.get('key2')).toBe('value2')
  })

  it('clears by URL pattern', () => {
    cache.set('/assets/assets/?page=1', 'data1')
    cache.set('/assets/contracts/?page=1', 'data2')
    cache.set('/assets/assets/?page=2', 'data3')
    cache.clearByPattern('/assets/assets/')
    expect(cache.get('/assets/assets/?page=1')).toBeUndefined()
    expect(cache.get('/assets/assets/?page=2')).toBeUndefined()
    expect(cache.get('/assets/contracts/?page=1')).toBe('data2')
  })

  it('evicts oldest entry when maxSize is reached', () => {
    const smallCache = new MemoryCache(2)
    smallCache.set('a', 1)
    smallCache.set('b', 2)
    smallCache.set('c', 3) // should evict 'a'
    expect(smallCache.get('a')).toBeUndefined()
    expect(smallCache.get('b')).toBe(2)
    expect(smallCache.get('c')).toBe(3)
  })

  it('uses default TTL of 5 minutes', () => {
    cache.set('key1', 'value1')
    vi.advanceTimersByTime(299_999)
    expect(cache.get('key1')).toBe('value1')
    vi.advanceTimersByTime(1)
    expect(cache.get('key1')).toBeUndefined()
  })
})
