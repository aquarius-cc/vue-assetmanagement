/**
 * @file 资产列表搜索栏下拉选项加载（资产类型双值空间 + 仓库）
 * @module composables/useAssetSearchOptions
 * @description
 *   承载 `useAssetListConfig` 的全部下拉选项数据源，使后者只留字段定义与列表配置
 *   （FR-6：后者已逼近 200 逻辑行上限）。
 *
 *   两种「资产类型」值空间**共用一次请求**（DR-1，零新增请求）：
 *   - `assetTypeOptions`：value = `AssetType.type_code`，平铺主列表 `combine_search` 口径
 *   - `assetTypeRecordcodeOptions`：value = `AssetType.recordcode`，分组端点口径
 *
 *   ⚠️ 仓库选项**仅分组模式加载**：平铺主列表无仓库筛选字段，无条件加载等于每次
 *   进入资产页多一次无用请求（见 `AssetSearchOptionsConfig.enableGrouping`）。
 *
 * @callers
 *   - composables/useAssetListConfig: 搜索字段集选项数据源
 * @dependsOn
 *   - api/assetType: 资产类型列表
 *   - api/storage: 仓库列表
 *   - utils/logger: 选项截断告警日志
 */
import { computed, onMounted, ref, type ComputedRef, type Ref } from 'vue'
import type { AssetType } from '@/types/assettype'
import { assetTypeAPI } from '@/api/assetType'
import { storageAPI } from '@/api/storage'
import { logError } from '@/utils/logger'

/** 下拉选项的最小结构（SearchBar `SearchFieldConfig.options` 口径） */
export type SearchOption = { label: string; value: string }

/** 选项加载入参 */
export interface AssetSearchOptionsConfig {
  /**
   * 分组展开模式开关（缺省 false，与 `AssetContentDetails` 的同名 prop 同口径）
   *
   * true 时才在 `onMounted` 加载仓库选项。
   */
  enableGrouping?: boolean
}

/** 选项加载返回值 */
export interface AssetSearchOptionsReturn {
  /** 资产分类选项（value = `AssetType.type_code`，平铺主列表口径） */
  assetTypeOptions: ComputedRef<SearchOption[]>
  /** 资产类型选项（value = `AssetType.recordcode`，分组端点口径） */
  assetTypeRecordcodeOptions: ComputedRef<SearchOption[]>
  /** 仓库选项（value = `Storage.recordcode`，分组端点口径） */
  storageOptions: Ref<SearchOption[]>
  loadAssetTypeOptions: () => Promise<void>
  loadStorageOptions: () => Promise<void>
}

/** 单页拉取上限，与后端 `MAX_PAGE_SIZE` 对齐（超限会被静默钳位） */
const OPTIONS_PAGE_SIZE = 100

/**
 * 资产列表搜索栏下拉选项加载
 *
 * @example
 * ```ts
 * const { assetTypeOptions, storageOptions, loadStorageOptions } = useAssetSearchOptions({
 *   enableGrouping: true,
 * })
 * ```
 */
export function useAssetSearchOptions(
  config: AssetSearchOptionsConfig = {},
): AssetSearchOptionsReturn {
  const { enableGrouping = false } = config

  /**
   * 【A-9】资产分类选项必须动态拉取后端真实数据：`AssetType.type_code` 是自由文本树形编码
   * （如 "AT_W2"），旧的硬编码枚举（hardware/software/lowvalue/other）与后端不符，
   * 照抄会让分类搜索永远空结果。
   */
  const assetTypeList = ref<AssetType[]>([])

  const assetTypeOptions = computed<SearchOption[]>(() =>
    assetTypeList.value.map((t) => ({ label: t.type_name, value: t.type_code })),
  )

  // 剔除无 recordcode 的条目：value 为 undefined 的选项会让 el-select 匹配失效
  const assetTypeRecordcodeOptions = computed<SearchOption[]>(() =>
    assetTypeList.value
      .filter((t) => Boolean(t.recordcode))
      .map((t) => ({ label: t.type_name, value: t.recordcode })),
  )

  // 分组端点 `asset_storage_recordcode` 精确匹配 `Storage.recordcode`（非 storage_code，
  // 后端经 FK to_field="recordcode" 命中），故 value 取 recordcode。
  const storageOptions = ref<SearchOption[]>([])

  const loadAssetTypeOptions = async () => {
    try {
      const res = await assetTypeAPI.getAssetTypes({ page: 1, page_size: OPTIONS_PAGE_SIZE })
      if (res.count > res.results.length) {
        logError(
          'composables/useAssetSearchOptions',
          `资产类型共 ${res.count} 条，超过单页返回上限，分类下拉仅展示前 ${res.results.length} 条`,
        )
      }
      assetTypeList.value = res.results
    } catch {
      // 拉取失败时保持空选项，不影响列表主流程
    }
  }

  const loadStorageOptions = async () => {
    try {
      const res = await storageAPI.getStorages({ page: 1, page_size: OPTIONS_PAGE_SIZE })
      if (res.count > res.results.length) {
        logError(
          'composables/useAssetSearchOptions',
          `仓库共 ${res.count} 条，超过单页返回上限，仓库下拉仅展示前 ${res.results.length} 条`,
        )
      }
      storageOptions.value = res.results
        .filter((s) => Boolean(s.recordcode))
        .map((s) => ({ label: s.storage_name, value: s.recordcode }))
    } catch {
      // 拉取失败时保持空选项，不影响列表主流程
    }
  }

  onMounted(() => {
    void loadAssetTypeOptions()
    if (enableGrouping) void loadStorageOptions()
  })

  return {
    assetTypeOptions,
    assetTypeRecordcodeOptions,
    storageOptions,
    loadAssetTypeOptions,
    loadStorageOptions,
  }
}
