/**
 * @file 支持缓存、防重、防抖、分页的实体 Store 工厂函数，所有实体 Store 均由此创建
 * @module stores/createEntityStore
 * @exports
 *   - createEntityStore: 工厂函数，创建具备 CRUD、分页、缓存能力的 Pinia Store
 * @callers
 *   - stores/assetStore.ts
 *   - stores/assetTypeStore.ts
 *   - stores/brokenAssetStore.ts
 *   - stores/contractStore.ts
 *   - stores/damagedAssetStore.ts
 *   - stores/departmentStore.ts
 *   - stores/foundAssetStore.ts
 *   - stores/harddiskSnStore.ts
 *   - stores/lostAssetStore.ts
 *   - stores/operationLogStore.ts
 *   - stores/outAssetStore.ts
 *   - stores/recycleAssetStore.ts
 *   - stores/repairAssetStore.ts
 *   - stores/storageStore.ts
 *   - stores/unregisteredAssetStore.ts
 *   - stores/userStore.ts
 *   - stores/wasteAssetStore.ts
 * @dependsOn
 *   - stores/entityStoreCache: 缓存、防重、防抖管理
 *   - stores/entityStoreRequestControl: 请求控制封装
 *   - stores/entityStoreTypes: 类型定义
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { ComputedRef } from 'vue'
import type {
  PaginationQuery,
  PaginationState,
  EntityState,
  EntityStoreConfig,
  BatchDeleteResult,
} from './entityStoreTypes'

// 重新导出类型，保持向后兼容（38 个消费者文件无需修改导入路径）
export type {
  PaginationQuery,
  PaginationState,
  ListResponse,
  BatchDeleteResult,
  EntityStore,
} from './entityStoreTypes'
import { getCache, getPendingSet, getDebounceMap } from './entityStoreCache'
import { withRequestControl, type RequestControlContext } from './entityStoreRequestControl'

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
) {
  return defineStore(storeId, () => {
    const {
      message,
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

    // === 请求控制上下文 ===
    const requestCtx: RequestControlContext<T> = {
      config: {
        enableCache,
        cacheTTL,
        enableDebounce,
        debounceDelay,
        storeId,
      },
      entityState,
      loadingCount,
      cache,
      pendingSet,
      debounceMap,
    }

    // === 核心方法 （增强分页参数处理）===
    const getList = async (params?: Q) => {
      const getListApi = config.api.getList
      if (!getListApi) throw new Error('API "getList" not provided')
      return withRequestControl(
        requestCtx,
        `list:${JSON.stringify(params || {})}`,
        async () => {
          // ✅ 步骤1：标准化参数
          const queryParams: Record<string, unknown> = { ...(params || {}) }

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
          const response = await getListApi(normalizedParams as Q)

          // ✅ 步骤3：验证页码有效性（以后端实际返回值为准）
          const totalPages = response.total_pages ?? Math.ceil(response.count / requestedPageSize)

          if (requestedPage > totalPages && totalPages > 0) {
            console.warn(
              `[createEntityStore/${storeId}] Invalid page: ${requestedPage}, ` +
                `total pages: ${totalPages}, count: ${response.count}`,
            )
            if (autoSync) {
              entityState.value.entities = {}
              entityState.value.ids = []
              pagination.value = { ...pagination.value, total: response.count, page: totalPages }
            }
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
            // ✅ 以后端实际返回值为准（处理 clamp/默认值场景）
            pagination.value = {
              ...pagination.value,
              total: response.count,
              page: response.page ?? requestedPage,
              page_size: response.page_size ?? requestedPageSize,
            }
          }
          return response.results
        },
        { cacheable: false }, // ✅ 分页请求不缓存
      )
    }

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
    }

    const getById = async (id: string) => {
      const getByIdApi = config.api.getById
      if (!getByIdApi) throw new Error('API "getById" not provided')
      return withRequestControl(
        requestCtx,
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
        requestCtx,
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
      return withRequestControl(requestCtx, `create:${Date.now()}`, async () => {
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
      return withRequestControl(requestCtx, `update:${idStr}`, async () => {
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
      return withRequestControl(requestCtx, `delete:${id}`, async () => {
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
        requestCtx,
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
            pagination.value.total = Math.max(0, pagination.value.total - result.success_count)
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
