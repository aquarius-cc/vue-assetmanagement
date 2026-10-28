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
import { logError, logWarn } from '@/utils/logger'

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

    // [I-8] getList 请求序号：仅最新请求的响应写入状态，丢弃慢响应防止覆盖新数据
    // 范式来源：stores/dashboard.ts trendRequestId（[M-10] 竞态保护同款）
    let listRequestSeq = 0

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
    // [P1-4] 下列 3 个内部助手为 getList 原逻辑原样下沉，未改任何判断/返回。
    /** 分页参数标准化：读取 page/page_size 并设默认值（P3-02：原注释称兼容 size/pageSize 与实现不符，已订正） */
    const normalizePaginationParams = (queryParams: Record<string, unknown>) => {
      const requestedPage = Number(queryParams.page) || 1
      const requestedPageSize = Number(queryParams.page_size) || defaultPageSize
      return {
        normalizedParams: {
          ...queryParams,
          page: requestedPage,
          page_size: requestedPageSize,
        },
        requestedPage,
        requestedPageSize,
      }
    }

    /** 请求页超出总页数时的兜底：清空本地实体并把分页页码修正到末页 */
    const handleInvalidPage = (totalPages: number, count: number) => {
      if (autoSync) {
        entityState.value.entities = {}
        entityState.value.ids = []
        pagination.value = { ...pagination.value, total: count, page: totalPages }
      }
    }

    /** 分页结果实体同步到本地状态（entities/ids） */
    const syncListToState = (results: readonly T[]) => {
      const newEntities: Record<string, T> = {}
      const newIds: string[] = []
      results.forEach((item) => {
        const idStr = getEntityId(item)
        newEntities[idStr] = item
        // 避免ids数组中出现重复项（后端可能返回重复数据）
        if (!newIds.includes(idStr)) {
          newIds.push(idStr)
        }
      })
      entityState.value.entities = newEntities
      entityState.value.ids = newIds
    }

    /**
     * 拉取分页列表
     * @param options.silent 静默查询（M-05）：结果仍正常返回，但跳过实体/分页回写——
     *   供表单预载、autocomplete、详情单条查询等非列表形态使用，防止污染共享列表态
     */
    const getList = async (
      params?: Q,
      options?: { silent?: boolean; _retried?: boolean },
    ): Promise<T[] | undefined> => {
      const getListApi = config.api.getList
      if (!getListApi) throw new Error('API "getList" not provided')
      // silent 编入 key：与列表页同 params 并发时各自独立通道（withRequestControl 按 key 去重）
      const requestKey = `list:${options?.silent ? 'silent:' : ''}${JSON.stringify(params || {})}`
      return withRequestControl(
        requestCtx,
        requestKey,
        async () => {
          // ✅ 步骤1：标准化参数
          const queryParams: Record<string, unknown> = { ...(params || {}) }
          const { normalizedParams, requestedPage, requestedPageSize } =
            normalizePaginationParams(queryParams)

          // ✅ 步骤2：调用 API（[I-8] seq 竞态守卫，范式同 dashboard.ts trendRequestId）
          // BF-138 #2：silent 豁免 seq——silent 不回写任何状态（effectiveSync 恒 false），
          // 守卫对其零收益，且共享序会与 list 通道互作废（跨通道作废 → 调用方 ?? [] 假空）
          const seq = options?.silent ? null : ++listRequestSeq
          const response = await getListApi(normalizedParams as Q)

          // [I-8] 过期响应：被更新请求取代，跳过页码校验与状态写回，防止慢响应覆盖新数据
          // M-16：返回 undefined（非 []），视图判空后保留现有数据，避免快速连点时被误当权威空镜像
          // BF-138 #2：undefined 语义收敛至 list 通道（silent 的 seq 恒 null，永不被作废）
          if (seq !== null && seq !== listRequestSeq) return undefined

          // M-05：silent 时两处写入路径（超界兜底 + 分页同步）均跳过
          const effectiveSync = autoSync && !options?.silent

          // ✅ 步骤3：验证页码有效性（以后端实际返回值为准）
          const totalPages = response.total_pages ?? Math.ceil(response.count / requestedPageSize)

          if (requestedPage > totalPages && totalPages > 0) {
            logWarn(
              'stores/createEntityStore',
              `[${storeId}] Invalid page: ${requestedPage}, ` +
                `total pages: ${totalPages}, count: ${response.count}`,
            )
            if (effectiveSync) handleInvalidPage(totalPages, response.count)
            // M-18：以修正后的末页补发一次 getList，避免清空后留下空表
            if (effectiveSync && !options?._retried) {
              return getList({ ...(params || {}), page: totalPages } as Q, {
                ...options,
                _retried: true,
              })
            }
            return []
          }

          // ✅ 步骤4：同步到状态
          if (effectiveSync) {
            syncListToState(response.results)
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

    const getById = async (id: string) => {
      const getByIdApi = config.api.getById
      if (!getByIdApi) throw new Error('API "getById" not provided')
      return withRequestControl(
        requestCtx,
        `get:${id}`,
        async () => {
          const item = await getByIdApi(id)
          if (item && autoSync) {
            // ✅ 仅当 item 存在时才同步到 entities 映射
            // M-20：不再写入 ids —— getById 是详情查询，实体可能不在当前页，
            // 污染 ids 会导致列表多出行（keep-alive 场景出现重复行）
            const idStr = getEntityId(item)
            entityState.value.entities[idStr] = item
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
        logWarn('stores/createEntityStore', `"nameField" not configured for store "${storeId}"`)
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
        logWarn(
          'stores/createEntityStore',
          `"getById" API not provided, cannot fetch name for code: ${code}`,
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
        logError(
          'stores/createEntityStore',
          `Failed to fetch entity by code "${code}" for name lookup`,
          error,
        )
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
          // M-21：同步递增 total，保持分页计数与列表一致
          pagination.value.total += items.length
          // M-RC-18：作废在途旧 getList，防写后旧响应回滚（在状态写入完成之后 bump）
          listRequestSeq++
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
          // M-RC-18：作废在途旧 getList，防写后旧响应回滚（在状态写入完成之后 bump）
          listRequestSeq++
        }
        // 使用 displayName（中文名）或 storeId 作为显示名称
        const displayName = config.displayName || storeId
        // [M-RC-10] disableAutoMessage 统一守卫：抑制时由调用方（表单/视图）负责唯一提示
        if (!config.disableAutoMessage) {
          message?.success?.(`${displayName}更新成功`)
        }
        return updatedItem
      })
    }

    const remove = async (id: string) => {
      return withRequestControl(requestCtx, `delete:${id}`, async () => {
        const result = await config.api.delete(id) // 👈 调用的是 config.api.delete
        if (autoSync) {
          // M-15：先判断实体是否在本地列表中，再同步递减 total（防止误减不存在的实体）
          const existedLocally = entityState.value.ids.includes(id)
          delete entityState.value.entities[id]
          entityState.value.ids = entityState.value.ids.filter((_id) => _id !== id)
          if (currentEntityId.value === id) currentEntityId.value = null
          if (existedLocally) {
            pagination.value.total = Math.max(0, pagination.value.total - 1)
          }
          // M-RC-18：作废在途旧 getList，防写后旧响应回滚（在状态写入完成之后 bump）
          listRequestSeq++
        }
        // 使用 displayName（中文名）或 storeId 作为显示名称
        const displayName = config.displayName || storeId
        // [M-RC-10] disableAutoMessage 统一守卫：抑制时由调用方（表单/视图）负责唯一提示
        if (!config.disableAutoMessage) {
          message?.success?.(`${displayName}删除成功`)
        }
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
    // [P1-4] 下列 3 个内部助手为 removeBatch/getList 原逻辑原样下沉，未改任何判断/返回。
    /** 批量删除结果响应防御校验（适配后端 success_response 格式，非断言以避免 TS6133/TS2339/TS2775） */
    const assertBatchDeleteResult = (result: BatchDeleteResult | null | undefined): boolean => {
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
      return true
    }

    /** 批量删除后本地状态精确清理（按后端 success_ids 清理实体/ids/当前选中） */
    const pruneDeletedEntities = (successIds: readonly string[], successCount: number) => {
      const successIdSet = new Set(successIds.map(String))
      successIds.forEach((id) => {
        const strId = String(id)
        delete entityState.value.entities[strId]
        if (currentEntityId.value === strId) currentEntityId.value = null
      })
      entityState.value.ids = entityState.value.ids.filter((id) => !successIdSet.has(String(id)))
      // 同步更新分页总记录数
      pagination.value.total = Math.max(0, pagination.value.total - successCount)
    }

    /** 失败项文案（最多展示前 3 条 + 超出条数提示） */
    const formatFailItems = (
      failItems: readonly { id: string; error_message: string }[],
      failCount: number,
    ): string => {
      const errorDetails = failItems
        .slice(0, 3)
        .map((e) => `${e.id}: ${e.error_message}`)
        .join('; ')
      const moreCount = failCount > 3 ? ` 等${failCount}条` : ''
      return `${errorDetails}${moreCount}`
    }

    /** 批量删除结果的用户消息提示（fail_count 三档：0=全成功 / 部分失败 / 全失败） */
    const notifyBatchDeleteResult = (result: BatchDeleteResult) => {
      // 使用 displayName（中文名）或 storeId 作为显示名称
      const displayName = config.displayName || storeId
      if (result.fail_count === 0) {
        message?.success?.(`成功删除 ${result.success_count} 条${displayName}`)
      } else if (result.success_count > 0) {
        message?.warning?.(
          `成功删除 ${result.success_count} 条，${result.fail_count} 条失败（${formatFailItems(result.fail_items, result.fail_count)}）`,
        )
      } else {
        message?.error?.(`删除失败：${formatFailItems(result.fail_items, result.fail_count)}`)
      }
    }

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
          assertBatchDeleteResult(result)

          if (autoSync) {
            pruneDeletedEntities(result.success_ids, result.success_count)
            // M-RC-18：作废在途旧 getList，防写后旧响应回滚（在状态写入完成之后 bump）
            listRequestSeq++
          }

          // 根据结果给出消息提示（适配后端 fail_items 格式）
          // [M-RC-10] removeBatch 有意不走 disableAutoMessage 守卫：生产调用方
          // （DamagedAssetDetails/RecycleAssetDetails 批删入口）视图自身不弹成功提示，
          // 三段文案（notifyBatchDeleteResult）是该操作的唯一用户反馈，守卫会吞掉它。
          notifyBatchDeleteResult(result)

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
      // M-RC-18：清空后作废在途旧 getList，防止旧响应回填已清空状态（与写路径同机理）
      listRequestSeq++
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
