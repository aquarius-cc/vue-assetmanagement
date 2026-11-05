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
  /**
   * [M-13] 失效代际：任一次 clear / clearByPattern 自增。
   * 读取方在发起请求前取快照，回填时比对；不一致说明该响应可能是失效前的快照。
   */
  private epoch = 0

  constructor(maxSize = 100) {
    this.maxSize = maxSize
  }

  /** [M-13] 读取当前失效代际（发请求前取快照） */
  getEpoch(): number {
    return this.epoch
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

  /** 清除全部缓存（失效代际自增，见 getEpoch） */
  clear(): void {
    this.epoch += 1
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

  /** 按 URL 模式清除缓存（失效代际自增，见 getEpoch） */
  clearByPattern(pattern: string): void {
    this.epoch += 1
    for (const key of this.store.keys()) {
      if (key.includes(pattern)) {
        this.store.delete(key)
      }
    }
  }

  /**
   * [M-13] 竞态安全写入：仅当「请求期间未发生失效」且「无更新鲜条目」时落盘。
   * `>=` 为保守判定：同毫秒无法区分新旧时放弃写入（最坏多一次未命中，绝不写入旧数据）。
   * @param requestEpoch 请求发起时的 getEpoch() 快照
   * @param requestStartedAt 请求发起时刻 Date.now()
   * @returns 是否真正写入
   */
  setIfFresh(
    key: string,
    data: T,
    requestEpoch: number,
    requestStartedAt: number,
    ttl = 300_000,
  ): boolean {
    if (requestEpoch !== this.epoch) return false
    const existing = this.store.get(key)
    if (existing !== undefined && existing.timestamp >= requestStartedAt) return false
    this.set(key, data, ttl)
    return true
  }
}
