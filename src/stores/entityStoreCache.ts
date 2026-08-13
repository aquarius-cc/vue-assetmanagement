/**
 * @file 全局缓存、防重、防抖管理器，按 storeId 隔离
 * @module stores/entityStoreCache
 * @exports
 *   - getCache: 获取指定 storeId 的缓存 Map
 *   - getPendingSet: 获取指定 storeId 的防重 Set
 *   - getDebounceMap: 获取指定 storeId 的防抖 Map
 *   - getCached: 从缓存读取（带 TTL 校验）
 *   - setCache: 写入缓存
 *   - isRequestPending: 判断请求是否正在进行
 *   - setRequestPending: 设置请求防重状态
 *   - runDebounced: 执行防抖函数
 *   - globalPendingPromises: 全局进行中 Promise 存储
 * @callers
 *   - stores/createEntityStore.ts
 *   - stores/entityStoreRequestControl.ts
 * @dependsOn
 *   - 无外部依赖
 */

// ===== 全局缓存 & 防重管理器（按 storeId 隔离）=====
const globalCaches = new Map<string, Map<string, { data: unknown; timestamp: number }>>()
const globalPendingRequests = new Map<string, Set<string>>()
const globalDebounceTimers = new Map<string, Map<string, number>>()
// ===== 新增：全局进行中 Promise 存储 =====
export const globalPendingPromises = new Map<string, Map<string, Promise<unknown>>>()

export const getCache = (storeId: string) => {
  if (!globalCaches.has(storeId)) globalCaches.set(storeId, new Map())
  return globalCaches.get(storeId)!
}

export const getPendingSet = (storeId: string) => {
  if (!globalPendingRequests.has(storeId)) globalPendingRequests.set(storeId, new Set())
  return globalPendingRequests.get(storeId)!
}

export const getDebounceMap = (storeId: string) => {
  if (!globalDebounceTimers.has(storeId)) globalDebounceTimers.set(storeId, new Map())
  return globalDebounceTimers.get(storeId)!
}

export const getCached = <T>(
  cache: Map<string, { data: unknown; timestamp: number }>,
  key: string,
  ttl: number,
): T | null => {
  const item = cache.get(key)
  if (item && Date.now() - item.timestamp < ttl) return item.data as T
  cache.delete(key)
  return null
}

export const setCache = <T>(
  cache: Map<string, { data: unknown; timestamp: number }>,
  key: string,
  data: T,
) => {
  cache.set(key, { data, timestamp: Date.now() })
}

export const isRequestPending = (pendingSet: Set<string>, key: string) => pendingSet.has(key)
export const setRequestPending = (pendingSet: Set<string>, key: string, pending: boolean) => {
  if (pending) pendingSet.add(key)
  else pendingSet.delete(key)
}

export const runDebounced = (
  debounceMap: Map<string, number>,
  key: string,
  fn: () => Promise<void>,
  delay: number,
) => {
  if (debounceMap.has(key)) clearTimeout(debounceMap.get(key)!)
  const timer = setTimeout(() => {
    fn().finally(() => debounceMap.delete(key))
  }, delay) as number
  debounceMap.set(key, timer)
}
