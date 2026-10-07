/**
 * @file 资产分组汇总列集与组内分页条配置
 * @module composables/useGroupedAssetColumns
 * @description
 *   F4：仅承载「汇总列集 + 组内分页条配置」，让 F3 组件专注渲染与交互。
 *
 *   【DR-1 边界，刻意不承载明细列集】
 *   明细列集的单一定义源在 `AssetContentDetails.vue` 的 `columns` 数组，经 prop 传入 F3。
 *   两套列定义各自演化即违反 DR-1，故本文件**不得**出现明细列定义。
 *   此边界同时把本 composable 的 FR-6 体积风险压到最低。
 *
 * @callers
 *   - components/GroupedAssetTable.vue: 分组展开表格（F3）
 * @dependsOn
 *   - types/list: TableColumn（列定义结构）
 *   - types/asset: AssetGroupSummary（汇总行结构）
 */
import type { TableColumn } from '@/types/list'
import type { AssetGroupSummary } from '@/types/asset'

/** 组内分页条可选页长 */
export const CHILD_PAGE_SIZE_OPTIONS = [20, 50, 100] as const

/** 空值展示占位符（决策 2：无合同哨兵组 → 显 "—"），单一常量防字面量漂移 */
export const NULL_DISPLAY = '—'

/**
 * 汇总区数据列集
 *
 * ⚠️ **6 列而非方案所写的「8 数据列」**：汇总序列化器确有 8 字段，但其中
 * `group_key`（缓存 / 展开标识）与 `asset_codes`（级联勾选数据源）**不是展示列**，
 * 前者由 F2 持有、后者由选择集持有。故实际渲染 6 列（§4.1 字段说明已列明二者用途）。
 * 勾选列与序号列不在此列集内 —— 由 F3 自持并 `fixed="left"`（决策 8）。
 *
 * 【批次 E 列宽策略】数据列用 min-width（配合主表 fit 铺满容器，剩余宽度按比例
 * 摊给长文本列）；数值列（资产数量）保留 width 固定窄宽 + 居中，避免胶囊被拉宽。
 */
const summaryColumns: TableColumn[] = [
  { prop: 'contract_code', label: '合同号', minWidth: 150, align: 'center' },
  { prop: 'asset_name', label: '名称', minWidth: 180, align: 'left' },
  { prop: 'asset_specification', label: '型号规格', minWidth: 180, align: 'left' },
  { prop: 'asset_brand', label: '品牌', minWidth: 120, align: 'center' },
  { prop: 'asset_count', label: '资产数量', width: 100, align: 'center' },
  { prop: 'price_display', label: '单价区间', minWidth: 140, align: 'right' },
]

/**
 * 组内分页条是否可见：组内条数超过当前页长才需要追加入口（决策 6 / F5 用例 12）
 *
 * BF-073 修正：旧判据 `asset_count > 100`（常量阈值）与实际页长（默认 20）脱钩，
 * 21~100 条组只显首页 20 条且无「加载下一页」，后续数据不可达；
 * 改为与 `childPageSize` 对齐后，页长切换（20/50/100）下判据恒等于「还有下一页」。
 */
export function shouldShowChildPagination(row: AssetGroupSummary, pageSize: number): boolean {
  return row.asset_count > pageSize
}

/**
 * 合同号展示值：`null`（无合同哨兵组）→ "—"，其余原样（决策 2 / Q-3 / F5 用例 6）
 */
export function displayContractCode(contractCode: string | null): string {
  return contractCode ?? NULL_DISPLAY
}

/**
 * 资产分组汇总列集 Composable
 *
 * @example
 * ```ts
 * const { summaryColumns, displayContractCode } = useGroupedAssetColumns()
 * ```
 */
export function useGroupedAssetColumns() {
  return {
    summaryColumns,
    shouldShowChildPagination,
    displayContractCode,
    CHILD_PAGE_SIZE_OPTIONS,
  }
}
