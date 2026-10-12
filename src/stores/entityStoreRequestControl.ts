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

type RequestOptions = { cacheable?: boolean; debounced?: boolean }

/** 缓存写入：仅当 cacheable 且 config.enableCache 时写入 */
function applyCache<R, T>(
  ctx: RequestControlContext<T>,
  key: string,
  result: R,
  options: RequestOptions,
): void {
  if (options.cacheable && ctx.config.enableCache) {
    setCache(ctx.cache, key, result)
  }
}

/** 防抖执行路径：延迟执行 fn，成功后缓存并 resolve */
function buildDebouncedPromise<R, T>(
  ctx: RequestControlContext<T>,
  key: string,
  fn: () => Promise<R>,
  options: RequestOptions,
): Promise<R> {
  return new Promise<R>((resolve, reject) => {
    runDebounced(
      ctx.debounceMap,
      key,
      async () => {
        try {
          const result = await fn()
          applyCache(ctx, key, result, options)
          resolve(result)
        } catch (error) {
          reject(error)
        }
      },
      ctx.config.debounceDelay,
    )
  })
}

/** 立即执行路径：直接运行 fn，成功后缓存 */
function buildImmediatePromise<R, T>(
  ctx: RequestControlContext<T>,
  key: string,
  fn: () => Promise<R>,
  options: RequestOptions,
): Promise<R> {
  return (async () => {
    const result = await fn()
    applyCache(ctx, key, result, options)
    return result
  })()
}

/** 从缓存读取：命中返回数据，未命中返回 null（分页请求不缓存） */
function tryGetCached<R, T>(
  ctx: RequestControlContext<T>,
  key: string,
  cacheable: boolean,
): R | null {
  const { config, cache } = ctx
  const isPaginationRequest = key.startsWith('list:')
  if (!(cacheable && config.enableCache && !isPaginationRequest)) return null
  return getCached<R>(cache, key, config.cacheTTL)
}

/** pending 去重：存在相同进行中请求则返回其 Promise，否则返回 null */
function getExistingPendingPromise<R, T>(
  ctx: RequestControlContext<T>,
  key: string,
): Promise<R> | null {
  if (!isRequestPending(ctx.pendingSet, key)) return null
  return (globalPendingPromises.get(ctx.config.storeId)?.get(key) as Promise<R> | undefined) ?? null
}

/** 注册新请求：设置 pending 标记、loading 引用计数递增、保存 Promise 供后续复用 */
function registerPendingRequest<R, T>(
  ctx: RequestControlContext<T>,
  key: string,
  promise: Promise<R>,
): void {
  const { config, entityState, loadingCount, pendingSet } = ctx
  setRequestPending(pendingSet, key, true)
  entityState.value.loading = true
  loadingCount.value++
  if (!globalPendingPromises.has(config.storeId)) {
    globalPendingPromises.set(config.storeId, new Map())
  }
  globalPendingPromises.get(config.storeId)!.set(key, promise)
}

/** 请求结束后清理：loading 引用计数递减（归零时关闭 loading）、清除 pending 标记与 Promise 缓存 */
function cleanupPendingRequest<T>(ctx: RequestControlContext<T>, key: string): void {
  const { config, entityState, loadingCount, pendingSet } = ctx
  loadingCount.value--
  if (loadingCount.value <= 0) {
    entityState.value.loading = false
    loadingCount.value = 0
  }
  setRequestPending(pendingSet, key, false)
  globalPendingPromises.get(config.storeId)?.delete(key)
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
  const { config } = ctx
  const { cacheable = false, debounced = false } = options

  // 1. 尝试从缓存读取（仅非分页请求）
  const cached = tryGetCached<R, T>(ctx, key, cacheable)
  if (cached !== null) return cached

  // 2. 如果已有相同请求正在进行，直接返回它的 Promise
  const existing = getExistingPendingPromise<R, T>(ctx, key)
  if (existing !== null) return existing

  // 3. 准备执行新请求（防抖或立即执行）
  const promise: Promise<R> =
    debounced && config.enableDebounce
      ? buildDebouncedPromise(ctx, key, fn, options)
      : buildImmediatePromise(ctx, key, fn, options)

  // 4. 注册到 pending 管理器与 loading 引用计数
  registerPendingRequest(ctx, key, promise)

  try {
    return await promise
  } finally {
    cleanupPendingRequest(ctx, key)
  }
}
