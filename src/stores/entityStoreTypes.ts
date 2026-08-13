/**
 * @file 实体 Store 的类型定义，包含分页、响应、配置、接口等类型
 * @module stores/entityStoreTypes
 * @exports
 *   - PaginationQuery: 分页查询参数接口
 *   - PaginationState: 分页状态接口
 *   - EntityState: 实体状态接口
 *   - ListResponse: 列表响应接口
 *   - BatchDeleteResult: 批量删除结果接口
 *   - EntityStoreConfig: Store 配置接口
 *   - EntityStore: Store 统一接口
 * @callers
 *   - stores/createEntityStore.ts
 *   - stores/entityStoreRequestControl.ts
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
 *   - 无外部依赖（仅依赖 element-plus 和 vue 类型）
 */
import type { ElMessage } from 'element-plus'
import type { Ref } from 'vue'

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
}

// ===== 类型定义 =====
export interface EntityState<T> {
  entities: Record<string, T>
  ids: string[]
  loading: boolean
}

export interface ListResponse<T> {
  results: T[]
  count: number
  /** 后端返回的总页数（可选） */
  total_pages?: number
  /** 后端返回的当前页码（可选） */
  page?: number
  /** 后端返回的每页大小（可选） */
  page_size?: number
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
export interface EntityStoreConfig<T extends object, Q extends PaginationQuery = PaginationQuery> {
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
