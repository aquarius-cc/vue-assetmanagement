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
    <el-table
      v-loading="summaryLoading"
      :data="summaries"
      :row-key="getGroupKey"
      :expand-row-keys="expandedKeys"
      :row-class-name="summaryRowClass"
      border
      fit
      @expand-change="onExpandChange"
    >
      <el-table-column type="expand" width="48" align="center">
        <template #default="scope">
          <div class="group-children">
            <CommonList
              :data="childrenOf(scope.row.group_key)"
              :columns="detailColumns"
              :current-page="childrenPage(scope.row.group_key)"
              :page-size="childPageSize"
              :total="scope.row.asset_count"
              :loading="isLoadingChildren(scope.row.group_key)"
              :enable-selection="true"
              :selected-keys="selectedCodes"
              :enable-search="false"
              :enable-edit="false"
              :enable-delete="false"
              :show-actions="false"
              :show-pagination="false"
              row-key="asset_code"
              @selection-change="(rows: AssetDetail[]) => onChildSelectionChange(scope.row, rows)"
            >
              <template v-for="(_, name) in $slots" #[name]="slotProps">
                <slot :name="name" v-bind="slotProps ?? {}" />
              </template>
            </CommonList>

            <div v-if="shouldShowChildPagination(scope.row)" class="child-pagination">
              <span class="child-pagination__text">
                已加载 {{ childrenOf(scope.row.group_key).length }} /
                {{ scope.row.asset_count }} 条（第 {{ childrenPage(scope.row.group_key) }} 页）
              </span>
              <el-button
                v-if="hasMoreChildren(scope.row.group_key)"
                size="small"
                :loading="isLoadingChildren(scope.row.group_key)"
                @click="loadMoreChildren(scope.row.group_key)"
              >
                加载下一页
              </el-button>
            </div>
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
        :align="col.align"
        :show-overflow-tooltip="true"
      >
        <template #default="{ row }">
          <!-- 数量列做行内视觉锚点：主色胶囊，聚合语义一眼可辨 -->
          <el-tag
            v-if="col.prop === 'asset_count'"
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
import CommonList from './commoncomponents/CommonList.vue'
import { useGroupedAssetList } from '@/composables/useGroupedAssetList'
import { NULL_DISPLAY, useGroupedAssetColumns } from '@/composables/useGroupedAssetColumns'
import type { TableColumn } from '@/types/list'
import type { AssetDetail, AssetGroupQueryParams, AssetGroupSummary } from '@/types/asset'
import type { CheckboxValueType } from 'element-plus'

interface Props {
  /** 明细列集：由 AssetContentDetails 传入（列集单一定义源，见 useGroupedAssetColumns） */
  detailColumns: TableColumn[]
}

defineProps<Props>()

const emit = defineEmits<{ (e: 'deleteGroup', row: AssetGroupSummary): void }>()

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
  childrenOf,
  childrenPage,
  isLoadingChildren,
  hasMoreChildren,
  loadMoreChildren,
  isGroupChecked,
  isGroupIndeterminate,
  toggleGroupSelection,
  setGroupSelection,
} = useGroupedAssetList()

const { summaryColumns, shouldShowChildPagination, displayContractCode } = useGroupedAssetColumns()

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

/* 展开区卡片化：浅底 + 左主色竖条 + 圆角，与汇总行形成层级边界 */
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

/* 组内分页条：卡片底信息条（类名与文案格式为 F5 用例锚点，勿改） */
.child-pagination {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 12px;
  padding: 8px 12px;
  background-color: var(--background-color-lighter);
  border-radius: 4px;
}

.child-pagination__text {
  color: var(--text-secondary);
}

/* 操作列：常态灰、hover 危险色（走 EP 变量，零 !important） */
.group-delete-btn {
  --el-button-text-color: var(--text-secondary);
  --el-button-hover-link-text-color: var(--color-danger);
  --el-button-active-color: var(--color-danger-dark);
}

.grouped-asset-table__pagination {
  display: flex;
  justify-content: flex-end;
  padding-top: 16px;
}
</style>
