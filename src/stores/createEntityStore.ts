// src/stores/createEntityStore.ts 工厂函数
// 所有实体（Asset / Contract / Storage / AssetType / OutAsset / RecycleAsset / DamagedAsset / WasteAsset）拆分为独立 Store
// 全部使用 createEntityStore 工厂函数创建，支持缓存 + 防重 + 防抖
// 主键统一：优先使用 code 字段（字符串），若无则用 id（数字）
// 跨实体联动（如出库修改资产状态）通过 assetLifecycleService.ts 实现
// API 层保持不变，仅 Store 层重构

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { ElMessage } from 'element-plus'
import type { ComputedRef, Ref } from 'vue'
// import type { BasePaginationParams } from '@/composables/usePaginationSearch'

// ✅ 重构：分离查询参数和分页状态
export interface PaginationQuery {
  /** 页码 */
  page: number
  /** 每页大小 */
  page_size: number
  /** 其他查询参数 */
  [key: string]: string | number | boolean | null | undefined
}

export interface PaginationState extends PaginationQuery {
  /** 总记录数（后端返回，查询时不传） */
  total: number
  // [key: string]: string | number | boolean | null | undefined
}

// ===== 类型定义 =====
interface EntityState<T> {
  entities: Record<string, T>
  ids: string[]
  loading: boolean
}

// // ✅ 修复：让 Page 的索引签名与实际查询参数（如 AssetQueryParams）兼容
// interface Page {
//   page: number
//   page_size: number
//   total?: number
//   // 允许任意字符串 key，但值必须是可序列化的基础类型（与 AssetQueryParams 一致）
//   [key: string]: string | number | boolean | null | undefined
// }

export interface ListResponse<T> {
  results: T[]
  count: number
}

// ✅ 新增：批量删除结果接口（与后端 success_response 格式对齐）
export interface BatchDeleteResult {
  /** 操作总数 */
  total: number
  /** 成功删除的数量 */
  success_count: number
  /** 失败数量 */
  fail_count: number
  /** 成功删除的 ID 列表 */
  success_ids: string[]
  /** 失败项及原因 */
  fail_items: Array<{ id: string; error_code?: string; error_message: string }>
}
// ✅ 配置接口
interface EntityStoreConfig<
  // T extends Record<string, unknown>,
  T extends object,
  Q extends PaginationQuery = PaginationQuery,
  // P = Record<string, unknown>,
  // K extends keyof T = keyof T,
> {
  idKey: keyof T // 主键字段名（必须是 T 的 key）
  nameField?: keyof T // 可选：名称字段名（用于按名称查询）,✅ 指定哪个字段是"名称"
  displayName?: string // 可选：中文显示名称（用于成功消息，如"资产"、"合同"）
  api: {
    getList?: (params?: Q) => Promise<ListResponse<T>>
    getById?: (code: string) => Promise<T | null> // ✅ 允许返回 null
    getByName?: (name: string) => Promise<T[]> // ✅ 新增：按名称查询，返回数组
    create: (data: Partial<T>) => Promise<T | T[]>
    update: (data: Partial<T>) => Promise<T>
    delete: (id: string) => Promise<void | T>
    // ✅ 新增：批量删除（可选，后端支持时配置）
    batchDelete?: (ids: string[]) => Promise<BatchDeleteResult>
  }
  message?: typeof ElMessage
  disableAutoMessage?: boolean // ✅ 新增：是否禁用自动消息
  idToString?: (id: unknown) => string // 可选的主键转字符串函数
  autoSync?: boolean
  enableCache?: boolean
  cacheTTL?: number // 默认 5 分钟
  enableDebounce?: boolean
  debounceDelay?: number // 默认 300ms
  // ✅ 新增：是否启用分页（默认启用）
  enablePagination?: boolean
  // ✅ 新增：默认每页大小
  defaultPageSize?: number
}

// ===== 新增：统一 Store 接口 =====
// 注意：Pinia setup store 会自动解包 ref/computed，所以：
// - list 在内部是 computed，但通过 store 实例访问时是 T[]（已解包）
// - loading 同理，是 boolean（已解包）
// - pagination 是 Ref，但解包后是 PaginationState 对象
export interface EntityStore<T, Q extends PaginationQuery = PaginationQuery> {
  // 状态（Pinia 自动解包后的类型）
  list: T[]
  currentEntity: T | null
  loading: boolean
  pagination: PaginationState
  refreshFlag: boolean

  // 计算属性 & 方法
  getTotalPages: number
  isValidPage: (page: number) => boolean
  navigateToValidPage: (page: number, page_size?: number) => Promise<T[]>

  // 控制
  currentEntityId: Ref<string | null>
  setRefreshFlag: (flag: boolean) => void
  clear: () => void
  clearCache: () => void

  // CRUD 方法
  getList: (params?: Q) => Promise<T[]>
  getById: (id: string) => Promise<T | null>
  getNameByCode: (code: string) => Promise<string | null>
  getByName: (name: string) => Promise<T[]>
  create: (data: Partial<T>) => Promise<T | T[]>
  update: (data: Partial<T>) => Promise<T>
  remove: (id: string) => Promise<void | T>
  // ✅ 新增：批量删除
  removeBatch: (ids: string[]) => Promise<BatchDeleteResult>
}

// ===== 全局缓存 & 防重管理器（按 storeId 隔离）=====
const globalCaches = new Map<string, Map<string, { data: unknown; timestamp: number }>>()
const globalPendingRequests = new Map<string, Set<string>>()
const globalDebounceTimers = new Map<string, Map<string, number>>()
// ===== 新增：全局进行中 Promise 存储 =====
const globalPendingPromises = new Map<string, Map<string, Promise<unknown>>>()

const getCache = (storeId: string) => {
  if (!globalCaches.has(storeId)) globalCaches.set(storeId, new Map())
  return globalCaches.get(storeId)!
}

const getPendingSet = (storeId: string) => {
  if (!globalPendingRequests.has(storeId)) globalPendingRequests.set(storeId, new Set())
  return globalPendingRequests.get(storeId)!
}

const getDebounceMap = (storeId: string) => {
  if (!globalDebounceTimers.has(storeId)) globalDebounceTimers.set(storeId, new Map())
  return globalDebounceTimers.get(storeId)!
}

const getCached = <T>(
  cache: Map<string, { data: unknown; timestamp: number }>,
  key: string,
  ttl: number,
): T | null => {
  const item = cache.get(key)
  if (item && Date.now() - item.timestamp < ttl) return item.data as T
  cache.delete(key)
  return null
}

const setCache = <T>(
  cache: Map<string, { data: unknown; timestamp: number }>,
  key: string,
  data: T,
) => {
  cache.set(key, { data, timestamp: Date.now() })
}

const isRequestPending = (pendingSet: Set<string>, key: string) => pendingSet.has(key)
const setRequestPending = (pendingSet: Set<string>, key: string, pending: boolean) => {
  if (pending) pendingSet.add(key)
  else pendingSet.delete(key)
}

const runDebounced = (
  debounceMap: Map<string, number>,
  key: string,
  fn: () => Promise<void>,
  delay: number,
) => {
  if (debounceMap.has(key)) clearTimeout(debounceMap.get(key)!)
  const timer = setTimeout(() => {
    fn().finally(() => debounceMap.delete(key))
  }, delay) as number // ✅ 在 DOM 环境下 setTimeout 返回 number
  debounceMap.set(key, timer)
}

// ===== 工厂函数 =====
/**
 * 创建一个支持缓存、防重、防抖的实体 Store
 * @template T - 实体类型，必须是对象
 * @template P - 查询参数类型，默认为分页参数
 * @param storeId - Pinia store 的唯一 ID
 * @param config - Store 配置
 * @returns Pinia store 实例
 */
export function createEntityStore<T extends object, Q extends PaginationQuery = PaginationQuery>(
  storeId: string,
  config: EntityStoreConfig<T, Q>,
  // initialPagination: Q,
) {
  return defineStore(storeId, () => {
    const {
      // api,
      // idKey,
      // nameField,
      // api,
      message,
      // idToString = String,
      autoSync = true,
      enableCache = true,
      cacheTTL = 5 * 60 * 1000, // 5 分钟
      enableDebounce = true,
      debounceDelay = 300,
      //新增配置
      enablePagination = true, //默认开启分页
      defaultPageSize = 20, //默认每页20条
    } = config

    const cache = getCache(storeId)
    const pendingSet = getPendingSet(storeId)
    const debounceMap = getDebounceMap(storeId)

    // 安全的主键转字符串函数
    const getIdString = (id: unknown): string => {
      if (config.idToString) {
        // 断言为 T[K] 是安全的，因为调用前已校验非空，且业务约定主键为 string/number
        return config.idToString(id as T[typeof config.idKey])
      }
      return String(id)
    }

    // === 标准化状态 ===
    const entityState = ref<EntityState<T>>({
      entities: {} as Record<string, T>,
      ids: [] as string[],
      loading: false,
    })

    // 并发请求计数器：用于管理loading状态
    // 当多个请求同时进行时，只有最后一个请求完成才关闭loading
    const loadingCount = ref(0)

    // ✅ 确保 pagination 正确初始化为 Ref<P>
    // const pagination = ref<P>({ ...initialPagination }) as Ref<P>
    const pagination = ref<PaginationState>({
      page: 1,
      page_size: defaultPageSize ?? 20,
      total: 0,
    })

    const refreshFlag = ref(false)
    const setRefreshFlag = (flag: boolean) => (refreshFlag.value = flag)

    // ✅ 计算属性
    // 统一使用 ids 数组映射，保证列表顺序与后端返回顺序一致
    // 注意：Object.values() 不保证顺序，分页场景下会导致切换页面后列表顺序错乱
    const list = computed(() => {
      return entityState.value.ids.map((id) => entityState.value.entities[id])
    })

    const loading = computed(() => entityState.value.loading) as ComputedRef<boolean>

    const currentEntityId = ref<string | null>(null)
    const currentEntity = computed(() => {
      return currentEntityId.value
        ? entityState.value.entities[currentEntityId.value] || null
        : null
    })

    const getEntityId = (item: T): string => {
      const id = item[config.idKey]
      if (id == null) throw new Error(`Entity missing "${String(config.idKey)}" field`)
      return getIdString(id)
    }

    // === 带缓存/防重的请求包装器 （优化缓存策略）===
    const withRequestControl = async <R>(
      key: string,
      fn: () => Promise<R>,
      options: { cacheable?: boolean; debounced?: boolean } = {},
    ): Promise<R> => {
      const { cacheable = false, debounced = false } = options

      // ✅ 优化：分页请求不缓存（避免数据不更新问题）
      const isPaginationRequest = key.startsWith('list:')
      const shouldCache = cacheable && enableCache && !isPaginationRequest
      // 1. 尝试从缓存读取（仅非分页请求）
      if (shouldCache) {
        const cached = getCached<R>(cache, key, cacheTTL)
        if (cached !== null) return cached
      }

      // 2. 如果已有相同请求正在进行，直接返回它的 Promise
      if (isRequestPending(pendingSet, key)) {
        const existingPromise = globalPendingPromises.get(storeId)?.get(key)
        if (existingPromise) {
          return existingPromise as Promise<R>
        }
      }

      // 3. 准备执行新请求
      let promise: Promise<R>

      if (debounced && enableDebounce) {
        // 防抖：延迟执行 fn
        promise = new Promise<R>((resolve, reject) => {
          runDebounced(
            debounceMap,
            key,
            async () => {
              try {
                const result = await fn()
                if (cacheable && enableCache) {
                  setCache(cache, key, result)
                }
                resolve(result)
              } catch (error) {
                reject(error)
              }
            },
            debounceDelay,
          )
        })
      } else {
        // 立即执行
        promise = (async () => {
          const result = await fn()
          if (cacheable && enableCache) {
            setCache(cache, key, result)
          }
          return result
        })()
      }

      // 4. 注册到 pending 管理器
      setRequestPending(pendingSet, key, true)

      // 使用引用计数管理loading状态，避免并发请求时提前关闭loading
      // 例如：getList和search同时调用时，先完成的不应隐藏另一个的loading
      entityState.value.loading = true
      loadingCount.value++

      // 保存 Promise 引用（用于后续复用）
      if (!globalPendingPromises.has(storeId)) {
        globalPendingPromises.set(storeId, new Map())
      }
      globalPendingPromises.get(storeId)!.set(key, promise)

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
        globalPendingPromises.get(storeId)?.delete(key)
      }
    }

    // === 核心方法 （增强分页参数处理）===
    const getList = async (params?: Q) => {
      const getListApi = config.api.getList
      if (!getListApi) throw new Error('API "getList" not provided')
      return withRequestControl(
        `list:${JSON.stringify(params || {})}`,
        async () => {
          // ✅ 步骤1：标准化参数
          const queryParams: Record<string, unknown> = { ...(params || {}) }
          // // ✅ 统一参数名：如果传入 size，转换为 page_size
          // if (queryParams) {
          //   // 兼容 size、pageSize、page_size 三种写法
          //   if ('size' in queryParams && !('page_size' in queryParams)) {
          //     queryParams.page_size = queryParams.size
          //     delete queryParams.size
          //   }
          //   if ('pageSize' in queryParams && !('page_size' in queryParams)) {
          //     queryParams.page_size = queryParams.pageSize
          //     delete queryParams.pageSize
          //   }

          //   // 如果未传入 page，设置默认值
          //   if (!('page' in queryParams)) {
          //     queryParams.page = 1 // 默认第一页
          //   }

          //   // 如果未传入 page_size，设置默认值
          //   if (!('page_size' in queryParams)) {
          //     queryParams.page_size = defaultPageSize
          //   }
          // } else {
          //   // 无参数时，根据配置决定是否分页
          //   queryParams = enablePagination ? { page: 1, page_size: defaultPageSize } : {}
          // }
          // console.log(`[createEntityStore/${storeId}] getList params:`, queryParams)

          // ✅ 标准化分页参数：兼容 size/pageSize，统一 page/page_size，设定默认值
          // 注意：由于 params 是引用类型，修改后会直接影响 queryParams
          const requestedPage = Number(queryParams.page) || 1
          const requestedPageSize = Number(queryParams.page_size) || defaultPageSize
          const normalizedParams = {
            ...queryParams,
            page: requestedPage,
            page_size: requestedPageSize,
          }
          // ✅ 步骤2：调用 API
          // const response = await getListApi(queryParams as Q)
          const response = await getListApi(normalizedParams as Q)

          // console.log(`[createEntityStore/${storeId}] getList response:`, {
          //   count: response.count,
          //   resultsLength: response.results?.length,
          //   page: queryParams.page,
          //   page_size: queryParams.page_size,
          // })

          // ✅ 步骤3：验证页码有效性
          const totalPages = Math.ceil(response.count / requestedPageSize)

          // console.log(
          //   `[createEntityStore/${storeId}] requestedPage: ${requestedPage}, totalPages: ${totalPages}, count: ${response.count}`,
          // )

          if (requestedPage > totalPages && totalPages > 0) {
            console.warn(
              `[createEntityStore/${storeId}] Invalid page: ${requestedPage}, ` +
                `total pages: ${totalPages}, count: ${response.count}`,
            )
            return []
          }

          // ✅ 步骤4：同步到状态
          if (autoSync) {
            const newEntities: Record<string, T> = {}
            const newIds: string[] = []
            response.results.forEach((item) => {
              const idStr = getEntityId(item)
              newEntities[idStr] = item
              // 避免ids数组中出现重复项（后端可能返回重复数据）
              if (!newIds.includes(idStr)) {
                newIds.push(idStr)
              }
            })
            entityState.value.entities = newEntities
            entityState.value.ids = newIds
            // ✅ 修复：正确更新 pagination✅ 强制使用请求参数（不依赖后端返回值）
            pagination.value = {
              ...pagination.value,
              total: response.count,
              page: requestedPage,
              page_size: requestedPageSize,
              // pagesize: requestedPageSize, // 兼容旧代码
            }
            // console.log(`createdEntityStore/${storeId} pagination updated:`, pagination.value)
            // pagination.value.total = response.count
            // pagination.value.page = Number(queryParams.page) ?? 1
            // pagination.value.page_size = Number(queryParams.page_size) ?? defaultPageSize
            // pagination.value.pageSize = Number(queryParams.page_size) ?? defaultPageSize // 兼容旧代码
          }
          return response.results
        },
        { cacheable: false }, // ✅ 分页请求不缓存
      )
    }

    // const getList = async (params?: Q): Promise<T[]> => {
    //   try {
    //     entityState.value.loading = true

    //     // ✅ 合并参数 - 使用默认分页参数
    //     const finalParams = {
    //       page: pagination.value.page,
    //       page_size: pagination.value.page_size,
    //       ...params,
    //     } as Q
    //     const response = await api.getList(finalParams)
    //     // ✅ 更新分页状态
    //     if (enablePagination) {
    //       pagination.value.total = response.count
    //     }

    //     // ✅ 更新实体状态
    //     const entities: Record<string, T> = {}
    //     const ids: string[] = []

    //     response.results.forEach((item) => {
    //       const id = idToString(item[idKey])
    //       entities[id] = item
    //       ids.push(id)
    //     })

    //     entityState.value.entities = entities
    //     entityState.value.ids = ids

    //     return response.results
    //   } catch (error) {
    //     console.error(`[createEntityStore/${storeId}] getList failed:`, error)
    //     throw error
    //   } finally {
    //     entityState.value.loading = false
    //   }
    // }

    // ✅ 新增：获取总页数
    const getTotalPages = computed(() => {
      if (!enablePagination || pagination.value.total === 0) return 0
      return Math.ceil(pagination.value.total / pagination.value.page_size)
    })

    // ✅ 新增：验证页码是否有效
    const isValidPage = (page: number): boolean => {
      return page > 0 && page <= getTotalPages.value
    }

    // ✅ 新增：跳转到有效页码
    const navigateToValidPage = async (page: number, page_size?: number) => {
      if (page_size) {
        pagination.value.page_size = page_size
      }

      if (!isValidPage(page)) {
        page = Math.min(page, getTotalPages.value)
      }

      pagination.value.page = page
      return getList()
      // const ps = page_size || pagination.value.page_size || defaultPageSize
      // const totalPages = Math.ceil((pagination.value.total || 0) / ps)

      // if (page > totalPages && totalPages > 0) {
      //   console.warn(
      //     `[createEntityStore/${storeId}] Page ${page} is invalid, ` +
      //       `redirecting to page ${totalPages}`,
      //   )
      //   return await getList({ page: totalPages, page_size: ps } as Q)
      // }

      // return await getList({ page: Number(page), page_size: ps } as Q)
    }

    const getById = async (id: string) => {
      const getByIdApi = config.api.getById
      if (!getByIdApi) throw new Error('API "getById" not provided')
      return withRequestControl(
        `get:${id}`,
        async () => {
          const item = await getByIdApi(id)
          if (item && autoSync) {
            // ✅ 仅当 item 存在时才同步到状态
            const idStr = getEntityId(item)
            entityState.value.entities[idStr] = item
            if (!entityState.value.ids.includes(idStr)) {
              entityState.value.ids.push(idStr)
            }
          }
          return item // 可能为 null
        },
        { cacheable: true }, // ✅ 详情请求可以缓存
      )
    }

    // ✅ 新增：getNameByCode 方法
    // 在 createEntityStore 的 return 块中添加：
    const getNameByCode = async (code: string): Promise<string | null> => {
      if (!config.nameField) {
        console.warn(`[createEntityStore] "nameField" not configured for store "${storeId}"`)
        return null
      }

      // 1. 先查本地缓存（同步）
      const cachedEntity = entityState.value.entities[code]
      if (cachedEntity && cachedEntity[config.nameField] != null) {
        return String(cachedEntity[config.nameField])
      }

      // 2. 本地没有 → 调用 getById（会走缓存/防重/网络）
      const getByIdApi = config.api.getById
      if (!getByIdApi) {
        console.warn(
          `[createEntityStore] "getById" API not provided, cannot fetch name for code: ${code}`,
        )
        return null
      }

      try {
        const entity = await getById(code) // 👈 复用已有的 getById，它自带缓存和防重！
        if (entity && entity[config.nameField] != null) {
          return String(entity[config.nameField])
        }
        return null
      } catch (error) {
        console.error(`Failed to fetch entity by code "${code}" for name lookup:`, error)
        return null
      }
    }

    // ✅ 新增：getByName 方法
    const getByName = async (name: string): Promise<T[]> => {
      const getByNameApi = config.api.getByName
      if (!getByNameApi) throw new Error('API "getByName" not provided')
      return withRequestControl(
        `name:${name}`, // 缓存 key
        async () => {
          const items = await getByNameApi(name)
          // 可选：如果需要，也可以将结果同步到 entities（谨慎！）
          // 例如：items.forEach(item => { ... })
          return items
        },
        { cacheable: true },
      )
    }

    const create = async (data: Partial<T>) => {
      return withRequestControl(`create:${Date.now()}`, async () => {
        const result = await config.api.create(data)
        // ✅ 支持后端返回单条或数组（如 Asset 创建时可能返回多条）
        const items = Array.isArray(result) ? result : [result]
        if (autoSync) {
          items.forEach((item) => {
            const idStr = getEntityId(item)
            entityState.value.entities[idStr] = item
            if (!entityState.value.ids.includes(idStr)) {
              entityState.value.ids.unshift(idStr)
            }
          })
        }
        // ✅ 只有未禁用时才显示消息
        if (!config.disableAutoMessage) {
          // 使用 displayName（中文名）或 storeId 作为显示名称
          const displayName = config.displayName || storeId
          message?.success?.(`${displayName}创建成功`)
        }
        return result
      })
    }

    const update = async (data: Partial<T>) => {
      const id = data[config.idKey]
      if (id == null) throw new Error('Missing ID for update')
      const idStr = getIdString(id)
      return withRequestControl(`update:${idStr}`, async () => {
        const updatedItem = await config.api.update(data)
        if (autoSync) {
          entityState.value.entities[idStr] = updatedItem
        }
        // 使用 displayName（中文名）或 storeId 作为显示名称
        const displayName = config.displayName || storeId
        message?.success?.(`${displayName}更新成功`)
        return updatedItem
      })
    }

    const remove = async (id: string) => {
      return withRequestControl(`delete:${id}`, async () => {
        const result = await config.api.delete(id) // 👈 调用的是 config.api.delete
        if (autoSync) {
          delete entityState.value.entities[id]
          entityState.value.ids = entityState.value.ids.filter((_id) => _id !== id)
          if (currentEntityId.value === id) currentEntityId.value = null
        }
        // 使用 displayName（中文名）或 storeId 作为显示名称
        const displayName = config.displayName || storeId
        message?.success?.(`${displayName}删除成功`)
        return result
      })
    }

    // ✅ 新增：批量删除
    /**
     * 批量删除实体
     * 调用后端 batchDelete API，成功后批量清理本地状态
     * @param ids 要删除的实体 ID 数组
     * @returns 批量删除结果（成功数 + 失败列表）
     */
    const removeBatch = async (ids: string[]): Promise<BatchDeleteResult> => {
      const batchDeleteApi = config.api.batchDelete
      if (!batchDeleteApi) {
        throw new Error('API "batchDelete" not provided')
      }

      if (ids.length === 0) {
        return { total: 0, success_count: 0, fail_count: 0, success_ids: [], fail_items: [] }
      }

      return withRequestControl(
        `batchDelete:${ids.join(',')}`,
        async () => {
          const result = await batchDeleteApi(ids)

          // 防御性校验：确保后端返回格式正确（适配后端 success_response 格式）
          if (
            !result ||
            typeof result.total !== 'number' ||
            typeof result.success_count !== 'number' ||
            typeof result.fail_count !== 'number' ||
            !Array.isArray(result.success_ids) ||
            !Array.isArray(result.fail_items)
          ) {
            throw new Error('Invalid batch delete response format')
          }

          if (autoSync) {
            // 批量清理本地状态：使用后端返回的 success_ids 精确清理
            const successIdSet = new Set(result.success_ids.map(String))

            result.success_ids.forEach((id) => {
              const strId = String(id)
              delete entityState.value.entities[strId]
              if (currentEntityId.value === strId) currentEntityId.value = null
            })
            entityState.value.ids = entityState.value.ids.filter(
              (id) => !successIdSet.has(String(id)),
            )

            // 同步更新分页总记录数
            pagination.value.total = Math.max(
              0,
              pagination.value.total - result.success_count,
            )
          }

          // 根据结果给出消息提示（适配后端 fail_items 格式）
          // 使用 displayName（中文名）或 storeId 作为显示名称
          const displayName = config.displayName || storeId
          if (result.fail_count === 0) {
            message?.success?.(`成功删除 ${result.success_count} 条${displayName}`)
          } else if (result.success_count > 0) {
            const errorDetails = result.fail_items
              .slice(0, 3)
              .map((e) => `${e.id}: ${e.error_message}`)
              .join('; ')
            const moreCount = result.fail_count > 3 ? ` 等${result.fail_count}条` : ''
            message?.warning?.(
              `成功删除 ${result.success_count} 条，${result.fail_count} 条失败（${errorDetails}${moreCount}）`,
            )
          } else {
            const errorDetails = result.fail_items
              .slice(0, 3)
              .map((e) => `${e.id}: ${e.error_message}`)
              .join('; ')
            const moreCount = result.fail_count > 3 ? ` 等${result.fail_count}条` : ''
            message?.error?.(`删除失败：${errorDetails}${moreCount}`)
          }

          return result
        },
        { cacheable: false },
      )
    }

    const clearCache = () => {
      cache.clear()
      pendingSet.clear()
      debounceMap.forEach((timer) => clearTimeout(timer))
      debounceMap.clear()
    }

    const clear = () => {
      entityState.value = { entities: {}, ids: [], loading: false }
      currentEntityId.value = null
      const currentPagination = pagination.value
      pagination.value = {
        ...currentPagination, // 保留其他字段
        page: 1,
        page_size: defaultPageSize,
        total: 0,
      }
    }
    // console.log('[DEBUG] pagination is ref?', isRef(pagination))
    // 注意：Pinia setup store 会自动解包 ref/computed
    // 返回的对象会被 Pinia 处理，外部访问时得到解包后的值
    return {
      // 状态
      list,
      currentEntity,
      loading,
      pagination,
      refreshFlag,

      // 计算属性和方法
      getTotalPages,
      isValidPage,
      navigateToValidPage,

      // 控制
      currentEntityId,
      setRefreshFlag,
      clear,
      clearCache,

      // 方法
      getList,
      getById,
      getNameByCode,
      getByName,
      create,
      update,
      remove,
      removeBatch,
    }
  })
  }
