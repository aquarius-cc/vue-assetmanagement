<!--
  @file 资产分组展开表格
  @module components/GroupedAssetTable
  @description
    F3：汇总行三态勾选 + 组内明细懒加载展开。

    【为什么汇总不用 CommonList】
    汇总需要「组级三态」与「左/右冻结列」，而 CommonList 的 `TableColumn` 无 `fixed`
    字段、选择列亦为硬编码单选态。故汇总区自持 `el-table`，仅明细区复用 CommonList
    （明细列集单一定义源仍在 AssetContentDetails.columns，见 useGroupedAssetColumns）。

    【展开态受控，非自持】
    `:expand-row-keys="expandedKeys"` + `@expand-change="setExpanded"` —— 展开真相源在 F2。
    EP 侧核对：`style-helper.mjs` 以 `watchEffect` 把 `props.expandRowKeys` 推入 store，
    `tree.mjs#updateTreeData(true)` 只写 treeData、**不 emit** `expand-change`，
    故「EP 点箭头 → setExpanded → expandRowKeys 变化 → EP 重算」无回环。
    正因 EP 先改自身 state 再 emit，此处必须调 `setExpanded`（置位）而非 `toggleExpand`（翻转）。

    【明细序号双口径】
    汇总序号 = `(currentPage-1)*pageSize + $index + 1`（跨汇总页全局）；
    明细序号由 CommonList 按传入的 `childrenPage` 计算（组内局部，追加加载后为 21..40）。
-->
<template>
  <div class="grouped-asset-table">
    <div class="grouped-asset-table__body">
      <el-table
        v-loading="summaryLoading"
        :data="summaries"
        :row-key="getGroupKey"
        :expand-row-keys="expandedKeys"
        :row-class-name="summaryRowClass"
        border
        fit
        height="100%"
        @expand-change="onExpandChange"
      >
        <el-table-column type="expand" width="48" align="center">
          <template #default="scope">
            <div class="group-children">
              <!-- 真·分页子表（批次 E）：页驱动 + 受控勾选 + 层级序号，列集白名单过滤（DR-1） -->
              <GroupedAssetChildTable
                :rows="childrenOf(scope.row.group_key)"
                :columns="childColumns"
                :group-index="summaryIndexOf(scope.$index)"
                :total="scope.row.asset_count ?? 0"
                :current-page="childrenPage(scope.row.group_key)"
                :page-size="childPageSize"
                :loading="isLoadingChildren(scope.row.group_key)"
                :selected-keys="selectedCodes"
                @edit="(row: AssetDetail) => emit('childEdit', row)"
                @delete="(row: AssetDetail) => emit('childDelete', row)"
                @detail="(row: AssetDetail) => emit('childDetail', row)"
                @page-change="(page: number) => goToChildPage(scope.row.group_key, page)"
                @selection-change="(rows: AssetDetail[]) => onChildSelectionChange(scope.row, rows)"
              >
                <!-- 透传状态 Tag 等明细插槽（列集精简后仅存的白名单插槽继续生效） -->
                <template v-for="(_, name) in $slots" #[name]="slotProps">
                  <slot :name="name" v-bind="slotProps ?? {}" />
                </template>
              </GroupedAssetChildTable>
            </div>
          </template>
        </el-table-column>

        <el-table-column width="55" fixed="left" align="center">
          <template #header>
            <el-checkbox
              :model-value="allChecked"
              :indeterminate="allIndeterminate"
              @change="onToggleAll"
            />
          </template>
          <template #default="{ row }">
            <el-checkbox
              :model-value="isGroupChecked(row.group_key)"
              :indeterminate="isGroupIndeterminate(row.group_key)"
              @click.stop
              @change="toggleGroupSelection(row.group_key)"
            />
          </template>
        </el-table-column>

        <el-table-column label="序号" width="80" fixed="left" align="center">
          <template #default="{ $index }">{{ summaryIndexOf($index) }}</template>
        </el-table-column>

        <el-table-column
          v-for="col in summaryColumns"
          :key="col.prop"
          :prop="col.prop"
          :label="col.label"
          :width="col.width"
          :min-width="col.minWidth"
          :align="col.align"
          :show-overflow-tooltip="true"
        >
          <template #default="{ row }">
            <!-- 数量列做行内视觉锚点：主色胶囊，聚合语义一眼可辨 -->
            <el-tag
              v-if="col.prop === 'asset_count'"
              class="asset-count-tag"
              type="primary"
              effect="dark"
              size="small"
              disable-transitions
            >
              {{ summaryCell(row, col.prop) }}
            </el-tag>
            <!-- 合同号空值：文本本体保持 "—"（F5 用例 6），语义提示走原生 title，样式仅 class -->
            <span
              v-else-if="col.prop === 'contract_code'"
              :class="{ 'summary-contract--empty': !row.contract_code }"
              :title="row.contract_code ? undefined : '无合同'"
              >{{ summaryCell(row, col.prop) }}</span
            >
            <template v-else>{{ summaryCell(row, col.prop) }}</template>
          </template>
        </el-table-column>

        <el-table-column label="操作" fixed="right" width="140" align="center">
          <template #default="{ row }">
            <!-- 文字保留（F5 用例 13）；常态灰、hover 危险色，收敛常驻红噪音 -->
            <el-button link class="group-delete-btn" @click="emit('deleteGroup', row)">
              删除组内 {{ row.asset_count }} 条
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <el-pagination
      v-model:current-page="currentPage"
      class="grouped-asset-table__pagination"
      :page-size="pageSize"
      :total="summaryTotal"
      layout="total, prev, pager, next, jumper"
      @current-change="changePage"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import GroupedAssetChildTable from './asset/GroupedAssetChildTable.vue'
import { useGroupedAssetList } from '@/composables/useGroupedAssetList'
import { NULL_DISPLAY, useGroupedAssetColumns } from '@/composables/useGroupedAssetColumns'
import type { TableColumn } from '@/types/list'
import type { AssetDetail, AssetGroupQueryParams, AssetGroupSummary } from '@/types/asset'
import type { CheckboxValueType } from 'element-plus'

interface Props {
  /** 明细列集：由 AssetContentDetails 传入（列集单一定义源，见 useGroupedAssetColumns） */
  detailColumns: TableColumn[]
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'deleteGroup', row: AssetGroupSummary): void
  (e: 'childEdit', row: AssetDetail): void
  (e: 'childDelete', row: AssetDetail): void
  (e: 'childDetail', row: AssetDetail): void
}>()

const {
  summaries,
  summaryTotal,
  summaryLoading,
  currentPage,
  pageSize,
  childPageSize,
  expandedKeys,
  selectedCodes,
  selectedGroupKeys,
  search,
  changePage,
  setExpanded,
  goToChildPage,
  childrenOf,
  childrenPage,
  isLoadingChildren,
  isGroupChecked,
  isGroupIndeterminate,
  toggleGroupSelection,
  setGroupSelection,
} = useGroupedAssetList()

const { summaryColumns, displayContractCode } = useGroupedAssetColumns()

/**
 * 子表列集：白名单过滤（DR-1 视图选择，非第二定义源）
 *
 * 目标稿 9 列 = 勾选 + 序号 + 6 项透传 + 数量(恒1) + 操作；其中勾选/序号/数量/操作
 * 由 GroupedAssetChildTable 自持，故仅需从明细列集中过滤出 6 项数据列。
 * 剔除：资产分类、实物数量（实物数量在子区语义为恒 1，由数量列承担）。
 */
const CHILD_WHITELIST = new Set([
  'recordcode',
  'asset_code',
  'asset_name',
  'asset_specification',
  'asset_brand',
  'asset_current_status',
])

const childColumns = computed<TableColumn[]>(() =>
  props.detailColumns.filter((col) => col.prop !== undefined && CHILD_WHITELIST.has(col.prop)),
)

/** el-table 行键：group_key 原样透传（F2 已持有，不解析不重建） */
const getGroupKey = (row: AssetGroupSummary): string => row.group_key

/** 汇总行 class：聚合行加粗（明细保持常规字重）+ 展开态淡主色底 */
const summaryRowClass = ({ row }: { row: AssetGroupSummary }): string =>
  expandedKeys.value.includes(row.group_key) ? 'summary-row summary-row--expanded' : 'summary-row'

/** 汇总序号：跨汇总页的全局口径 */
const summaryIndexOf = (index: number): number =>
  (currentPage.value - 1) * pageSize.value + index + 1

const allChecked = computed(
  () => summaries.value.length > 0 && selectedGroupKeys.value.length === summaries.value.length,
)

const allIndeterminate = computed(() => {
  const selected = selectedGroupKeys.value.length
  return selected > 0 && selected < summaries.value.length
})

/** 全选 / 全不选：仅作用于当前汇总页可见的组
 *
 * EP `el-checkbox` 的 `change` 载荷是 `CheckboxValueType`（string | number | boolean），
 * 而 `:model-value` 绑的是 boolean，故显式 `Boolean()` 归一，不依赖类型断言。
 */
const onToggleAll = (checked: CheckboxValueType): void => {
  const shouldCheck = Boolean(checked)
  summaries.value.forEach((row) => {
    if (isGroupChecked(row.group_key) !== shouldCheck) {
      toggleGroupSelection(row.group_key)
    }
  })
}

/** 合同号空值 → "—"（无合同哨兵组不显示裸 null，F5 用例 6）
 *
 * `prop` 只应来自 F4 的 `summaryColumns`（6 个展示字段）。`group_key` / `asset_codes`
 * 是控制字段而非展示列（偏差 D-3），若被误传则非标量，统一退回 "—" 而非把数组
 * 隐式塞进单元格。
 */
const summaryCell = (row: AssetGroupSummary, prop?: string): string | number => {
  if (prop === 'contract_code') return displayContractCode(row.contract_code)
  const value = row[prop as keyof AssetGroupSummary]
  if (typeof value !== 'string' && typeof value !== 'number') return NULL_DISPLAY
  return value ?? NULL_DISPLAY
}

const onExpandChange = (row: AssetGroupSummary, expanded: boolean): void => {
  void setExpanded(row.group_key, expanded)
}

/** 明细勾选 → 重建该组选中态（只动本组，平铺集中其他组不受影响） */
const onChildSelectionChange = (row: AssetGroupSummary, rows: AssetDetail[]): void => {
  setGroupSelection(
    row.group_key,
    rows.map((item) => item.asset_code).filter((code): code is string => Boolean(code)),
  )
}

onMounted(() => {
  void search()
})

/** 供 AssetContentDetails 的既有 SearchBar 复用触发筛选 */
const searchGrouped = (filters?: AssetGroupQueryParams): Promise<void> => search(filters)

defineExpose({ search: searchGrouped, refresh: () => search() })
</script>

<style scoped>
/* 根盒定高 + 纵向 flex：__body 表格区自滚、分页条常驻；
   overflow:hidden 为保险（极端态下溢出绝不外泄进父 .table-container） */
.grouped-asset-table {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* 表格滚动区：flex:1 撑满除分页外的剩余高度（basis 0 → 分页永不被挤压），
   表内 el-table height="100%" 钉住横向滚动条于可视底边 */
.grouped-asset-table__body {
  flex: 1;
  min-height: 0;
  overflow: auto;
}

/* 汇总行：聚合语义加粗；展开态淡主色底（:deep 穿透 EP 内部 tr/td） */
.grouped-asset-table :deep(.summary-row > td.el-table__cell) {
  font-weight: 600;
}

.grouped-asset-table :deep(.summary-row--expanded > td.el-table__cell) {
  background-color: var(--color-primary-lighter);
}

/* 合同号：无合同哨兵组灰斜体（文本本体仍为 "—"，语义提示走 title） */
.summary-contract--empty {
  color: var(--text-muted);
  font-style: italic;
}

/* 展开区卡片化：浅底 + 左主色竖条 + 圆角，与汇总行形成层级边界
   （子表自身 .child-wrap 已有浅灰底，此处仅保留卡片外框） */
.group-children {
  padding: 16px;
  background: var(--gradient-card-highlight);
  border-left: 4px solid var(--color-primary-light);
  border-radius: 8px;
}

/* EP 展开单元格默认 padding 20px 50px，收敛以对齐卡片左缘 */
.grouped-asset-table :deep(td.el-table__expanded-cell) {
  padding: 12px 16px;
}

/* 组内分页条样式已随「加载更多」交互移除（批次 E 真分页由子组件 .child-pager 承担） */

/* 数量胶囊：EP 默认 --el-color-primary（#409eff）白字仅 3.05:1 不达 AA；
   改走项目令牌 --color-primary（#2b5fd7，白字 5.65:1）。
   暗色下 --color-primary 为 #4a90e2（白字 3.29:1 同样不达标），改取
   --color-primary-dark（暗色 #2b5fd7，5.65:1），两主题均达 4.5:1 */
.asset-count-tag {
  --el-tag-bg-color: var(--color-primary);
}

:global(html.dark) .asset-count-tag {
  --el-tag-bg-color: var(--color-primary-dark);
}

/* 操作列：常态灰、hover 危险色（走 EP 变量，零 !important）
   常态取 --text-regular（#606266，白底 5.9:1 AA 达标）；--text-secondary
   （#909399）仅 2.84:1 不达标，见 audit 2026-10-07 对比度项 */
.group-delete-btn {
  --el-button-text-color: var(--text-regular);
  --el-button-hover-link-text-color: var(--color-danger);
  --el-button-active-color: var(--color-danger-dark);
}

.grouped-asset-table__pagination {
  display: flex;
  flex-shrink: 0;
  justify-content: flex-end;
  padding-top: 16px;
}
</style>
