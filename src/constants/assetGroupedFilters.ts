/**
 * @file 资产分组视图筛选键白名单（前端唯一事实源）
 * @module constants/assetGroupedFilters
 * @description
 *   B 批落地物。分组端点（`/assets/grouped/`、`/assets/group_children/`）的筛选键
 *   与平铺主列表**不同键集**，此前有两处手写白名单各自维护，扩键必然漂移（DR-1）：
 *     - AssetContentDetails.vue 的 GROUPED_FILTER_KEY_MAP（SearchBar 键 → API 键）
 *     - useGroupChildrenCache.ts 的 PASS_THROUGH_KEYS（透传给组内明细的键）
 *   本模块收敛为唯一来源，两处均改为引用。
 *
 * @callers
 *   - components/componentsdetails/AssetContentDetails.vue: 汇总端点筛选参数拼装
 *   - composables/useGroupChildrenCache.ts: 组内明细筛选透传白名单
 * @dependsOn
 *   - (无依赖，纯常量)
 */

/**
 * 可透传至组内明细的筛选键（9 键）
 *
 * ⚠️ **与后端 `AssetGroupedSelector.PASS_THROUGH_FILTER_PATHS` 逐字相等**（后端
 * `asset_grouped_selector.py`）。即「汇总端点键集 − {contract_code, no_contract}」：
 * 合同已由 `group_key` 首元素表达，多传会与组键取交集得空集（R-1）。
 *
 * 破坏性提示：后端扩/减键必须同步此处，否则前端要么漏传（筛选对明细失效，明细数与
 * 汇总 `asset_count` 漂移，AC-67f）或多传（被 DRF 静默丢弃，筛选无声失效）。
 * 两侧各有键集等值断言：后端 `test_pass_through_filters_match_summary_endpoint`，
 * 前端 `constants/__tests__/assetGroupedFilters.spec.ts`。
 */
export const GROUPED_PASS_THROUGH_KEYS = [
  'asset_current_status',
  'asset_type_recordcode',
  'asset_storage_recordcode',
  'asset_type_category',
  'asset_code',
  'asset_name',
  'asset_brand',
  'asset_specification',
  'asset_contract_name',
] as const

/** 可透传筛选键的联合类型 */
export type GroupedPassThroughKey = (typeof GROUPED_PASS_THROUGH_KEYS)[number]

/**
 * 分组模式下**不提供 UI 输入**的筛选键
 *
 * `asset_type_category`（值取 `AssetType.type_code`）与 `asset_type_recordcode`
 * （值取 `AssetType.recordcode`）在后端解析到同一张 `AssetType` 表，语义几乎等价，
 * 同屏放两个下拉会让用户选出互相矛盾的组合 → 空集且无任何错误提示。
 *
 * 该键**仍保留在 `GROUPED_PASS_THROUGH_KEYS` 中**（API 契约完整、恒等式 I-1 不断），
 * 只是不作为搜索栏输入。
 */
export const GROUPED_FIELD_DROP_KEYS = ['asset_type_category'] as const

/** 字段键是否在分组模式下被剔除（供字段集派生用，避免调用方各自写类型断言） */
export const isGroupedFieldDropped = (key: string): boolean =>
  (GROUPED_FIELD_DROP_KEYS as readonly string[]).includes(key)

/**
 * SearchBar 键 → 分组端点 API 键映射
 *
 * 9 键同名透传（由白名单派生，不重复列举）+ 唯一改名键 `asset_contract → contract_code`。
 * `contract_code` **仅汇总端点**可传：组内明细端点刻意不声明该参数（R-1）。
 */
export const GROUPED_FILTER_KEY_MAP: Readonly<Record<string, string>> = {
  ...Object.fromEntries(GROUPED_PASS_THROUGH_KEYS.map((key) => [key, key])),
  asset_contract: 'contract_code',
}
