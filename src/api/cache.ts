/**
 * @file 内存缓存模块，提供通用的内存缓存功能
 * @module api/cache
 * @exports
 *   - MemoryCache: 泛型内存缓存类
 * @callers
 *   - api/request.ts: 请求缓存
 * @dependsOn
 *   - 无外部依赖
 */

interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number
}

export class MemoryCache<T = unknown> {
  private store = new Map<string, CacheEntry<T>>()
  private maxSize: number

  constructor(maxSize = 100) {
    this.maxSize = maxSize
  }

  /** 设置缓存项，ttl 单位毫秒，默认 5 分钟 */
  set(key: string, data: T, ttl = 300_000): void {
    if (this.store.size >= this.maxSize) {
      const firstKey = this.store.keys().next().value
      if (firstKey !== undefined) {
        this.store.delete(firstKey)
      }
    }
    this.store.set(key, { data, timestamp: Date.now(), ttl })
  }

  /** 获取缓存项，过期返回 undefined */
  get(key: string): T | undefined {
    const item = this.store.get(key)
    if (!item) return undefined
    if (Date.now() - item.timestamp >= item.ttl) {
      this.store.delete(key)
      return undefined
    }
    return item.data
  }

  /** 清除全部缓存 */
  clear(): void {
    this.store.clear()
  }

  /** 清除过期缓存 */
  clearExpired(): void {
    const now = Date.now()
    for (const [key, item] of this.store.entries()) {
      if (now - item.timestamp >= item.ttl) {
        this.store.delete(key)
      }
    }
  }

  /** 按 URL 模式清除缓存 */
  clearByPattern(pattern: string): void {
    for (const key of this.store.keys()) {
      if (key.includes(pattern)) {
        this.store.delete(key)
      }
    }
  }
}
