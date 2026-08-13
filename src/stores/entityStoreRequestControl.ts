/**
 * @file 请求控制封装器，提供缓存、防重、防抖、loading 引用计数管理
 * @module stores/entityStoreRequestControl
 * @exports
 *   - withRequestControl: 带缓存/防重/防抖的请求包装器
 *   - RequestControlConfig: 请求控制配置接口
 *   - RequestControlContext: 请求控制上下文接口
 * @callers
 *   - stores/createEntityStore.ts
 * @dependsOn
 *   - stores/entityStoreCache: 缓存与防重工具函数
 *   - stores/entityStoreTypes: EntityState 类型定义
 */
import type { Ref } from 'vue'
import type { EntityState } from './entityStoreTypes'
import {
  getCached,
  setCache,
  isRequestPending,
  setRequestPending,
  runDebounced,
  globalPendingPromises,
} from './entityStoreCache'

export interface RequestControlConfig {
  enableCache: boolean
  cacheTTL: number
  enableDebounce: boolean
  debounceDelay: number
  storeId: string
}

export interface RequestControlContext<T> {
  config: RequestControlConfig
  entityState: Ref<EntityState<T>>
  loadingCount: Ref<number>
  cache: Map<string, { data: unknown; timestamp: number }>
  pendingSet: Set<string>
  debounceMap: Map<string, number>
}

/**
 * 带缓存/防重/防抖的请求包装器
 * 使用引用计数管理 loading 状态，避免并发请求时提前关闭 loading
 */
export async function withRequestControl<R, T = unknown>(
  ctx: RequestControlContext<T>,
  key: string,
  fn: () => Promise<R>,
  options: { cacheable?: boolean; debounced?: boolean } = {},
): Promise<R> {
  const { config, entityState, loadingCount, cache, pendingSet, debounceMap } = ctx
  const { cacheable = false, debounced = false } = options

  // ✅ 优化：分页请求不缓存（避免数据不更新问题）
  const isPaginationRequest = key.startsWith('list:')
  const shouldCache = cacheable && config.enableCache && !isPaginationRequest
  // 1. 尝试从缓存读取（仅非分页请求）
  if (shouldCache) {
    const cached = getCached<R>(cache, key, config.cacheTTL)
    if (cached !== null) return cached
  }

  // 2. 如果已有相同请求正在进行，直接返回它的 Promise
  if (isRequestPending(pendingSet, key)) {
    const existingPromise = globalPendingPromises.get(config.storeId)?.get(key)
    if (existingPromise) {
      return existingPromise as Promise<R>
    }
  }

  // 3. 准备执行新请求
  let promise: Promise<R>

  if (debounced && config.enableDebounce) {
    // 防抖：延迟执行 fn
    promise = new Promise<R>((resolve, reject) => {
      runDebounced(
        debounceMap,
        key,
        async () => {
          try {
            const result = await fn()
            if (cacheable && config.enableCache) {
              setCache(cache, key, result)
            }
            resolve(result)
          } catch (error) {
            reject(error)
          }
        },
        config.debounceDelay,
      )
    })
  } else {
    // 立即执行
    promise = (async () => {
      const result = await fn()
      if (cacheable && config.enableCache) {
        setCache(cache, key, result)
      }
      return result
    })()
  }

  // 4. 注册到 pending 管理器
  setRequestPending(pendingSet, key, true)

  // 使用引用计数管理loading状态，避免并发请求时提前关闭loading
  entityState.value.loading = true
  loadingCount.value++

  // 保存 Promise 引用（用于后续复用）
  if (!globalPendingPromises.has(config.storeId)) {
    globalPendingPromises.set(config.storeId, new Map())
  }
  globalPendingPromises.get(config.storeId)!.set(key, promise)

  try {
    const result = await promise
    return result
  } finally {
    loadingCount.value--
    // 仅当所有请求都完成时才关闭loading
    if (loadingCount.value <= 0) {
      entityState.value.loading = false
      loadingCount.value = 0
    }
    setRequestPending(pendingSet, key, false)
    globalPendingPromises.get(config.storeId)?.delete(key)
  }
}
