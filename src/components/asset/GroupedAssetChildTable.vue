<!--
  @file 资产分组展开子表（页驱动 + 受控勾选 + 真分页）
  @module components/asset/GroupedAssetChildTable
  @description
    批次 E 步骤 3：展开子区从 CommonList 迁出的独立组件。

    【为什么不复用 CommonList】
    CommonList 面向「主列表」设计（自带搜索栏/操作列/页长选择），嵌套在 #expand
    插槽内会与其通用约束冲突。本组件只做「当前页渲染 + 受控勾选 + 真分页」三件事。

    【页驱动而非全量驱动】
    rows 是覆盖式分页（goToChildPage → fetchChildren(append=false)）后的**当前页**
    数据，不是累积多页。total 来自汇总行 asset_count（I-1：≡ asset_codes.length）。

    【受控勾选】
    沿用 CommonList.vue:224-260 的同步模式：外部 selectedKeys 变化 → nextTick 后
    逐行 toggleRowSelection 显式置位；同步期间屏蔽 selection-change 回抛，避免
    「外部改 → toggle → 回抛 → 再改」回环。row-key 固定 asset_code。

    【列集单一定义源（DR-1）】
    本组件不内建任何列定义，columns 由父组件从 AssetContentDetails 明细列集按
    白名单过滤后传入（过滤是视图选择，非第二定义源）。序号/数量/操作三列为
    结构列，由本组件自持。
-->
<template>
  <div class="child-wrap" :data-loading="loading">
    <el-table
      ref="tableRef"
      v-loading="loading"
      class="child-table"
      :data="rows"
      :row-key="getRowKey"
      size="small"
      :border="false"
      fit
      max-height="500"
      @selection-change="handleSelectionChange"
    >
      <!-- 受控勾选列 -->
      <el-table-column type="selection" width="55" align="center" :reserve-selection="true" />

      <!-- 序号列：层级化 groupIndex.组内全局序，跨页连贯（1.20 → 翻页 → 1.21） -->
      <el-table-column label="序号" width="80" align="center">
        <template #default="{ $index }">{{ hierarchicalIndex($index) }}</template>
      </el-table-column>

      <!-- 数据列：外部白名单过滤后透传（DR-1，不二次定义） -->
      <el-table-column
        v-for="col in columns"
        :key="col.prop"
        :prop="col.prop"
        :label="col.label"
        :min-width="col.width"
        :align="col.align"
        :class-name="'highlight-col'"
        :show-overflow-tooltip="true"
      >
        <template #default="{ row }">
          <!-- 当前状态列走 StatusTag（与平铺页渲染一致） -->
          <template v-if="col.prop === 'asset_current_status'">
            <slot name="asset_current_status" :row="row" :value="row.asset_current_status">
              <span>{{ row.asset_current_status ?? '—' }}</span>
            </slot>
          </template>
          <template v-else>
            <slot :name="col.prop" :row="row">{{ row[col.prop as keyof AssetDetail] ?? '—' }}</slot>
          </template>
        </template>
      </el-table-column>

      <!-- 数量列：恒为 1（D-2 渲染常数，fan-out 落库语义，勿绑字段） -->
      <el-table-column label="数量" width="80" align="center">
        <template #default>1</template>
      </el-table-column>

      <!-- 操作列：编辑 / 删除 / 详细 -->
      <el-table-column label="操作" fixed="right" width="160" align="center">
        <template #default="{ row }">
          <el-button link type="primary" size="small" @click="emit('edit', row)">编辑</el-button>
          <el-button link type="danger" size="small" @click="emit('delete', row)">删除</el-button>
          <el-button link type="primary" size="small" @click="emit('detail', row)">详细</el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 真分页：仅超过单页容量时显示 -->
    <div v-if="total > pageSize" class="child-pager">
      <el-pagination
        size="small"
        background
        layout="prev, pager, next, total"
        :total="total"
        :page-size="pageSize"
        :current-page="currentPage"
        @current-change="onPageChange"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import type { TableInstance } from 'element-plus'
import type { TableColumn } from '@/types/list'
import type { AssetDetail } from '@/types/asset'

interface Props {
  /** 当前页子明细（覆盖式写入后的当前页，非累积） */
  rows: AssetDetail[]
  /** 子表列定义：父组件白名单过滤后传入（DR-1） */
  columns: TableColumn[]
  /** 汇总行序号（1-based），层级序号前缀 */
  groupIndex: number
  /** 该组子明细总数（汇总行 asset_count，I-1 不变量） */
  total: number
  /** 当前展示页（childrenPage[groupKey]） */
  currentPage: number
  /** 页长，与 childPageSize 一致（默认 20） */
  pageSize?: number
  /** 子明细加载中 */
  loading?: boolean
  /** 受控选中：选中资产的 asset_code 列表 */
  selectedKeys?: string[]
}

const props = withDefaults(defineProps<Props>(), {
  pageSize: 20,
  loading: false,
  selectedKeys: () => [],
})

const emit = defineEmits<{
  (e: 'edit', row: AssetDetail): void
  (e: 'delete', row: AssetDetail): void
  (e: 'detail', row: AssetDetail): void
  (e: 'page-change', page: number): void
  (e: 'selection-change', rows: AssetDetail[]): void
}>()

const tableRef = ref<TableInstance>()

/** el-table 行键：asset_code（与现状 selection 键一致） */
const getRowKey = (row: AssetDetail): string => row.asset_code ?? ''

/** 层级序号：组内全局序（跨页连贯），页内偏移 = (currentPage-1)*pageSize + $index */
const hierarchicalIndex = (indexInPage: number): string =>
  `${props.groupIndex}.${(props.currentPage - 1) * props.pageSize + indexInPage + 1}`

const onPageChange = (page: number): void => {
  emit('page-change', page)
}

// ===== 受控勾选（沿用 CommonList 同步模式） =====
let isSyncingSelection = false

/** 按 props.selectedKeys 同步 el-table 勾选态（逐行显式置位，不依赖 diff 推断） */
const applySelectedKeys = async (): Promise<void> => {
  const table = tableRef.value
  if (!table) return
  // el-table 需先完成 data 渲染，toggleRowSelection 才能命中行
  await nextTick()
  const keys = new Set(props.selectedKeys ?? [])
  isSyncingSelection = true
  try {
    props.rows.forEach((row) => {
      const key = getRowKey(row)
      table.toggleRowSelection(row, key !== '' && keys.has(key), true)
    })
  } finally {
    isSyncingSelection = false
  }
}

const handleSelectionChange = (rows: AssetDetail[]): void => {
  // 受控同步期间屏蔽回抛，避免「外部改 selectedKeys → toggleRowSelection → 回抛 → 再改」的环
  if (isSyncingSelection) return
  emit('selection-change', rows)
}

// rows 翻页替换 / selectedKeys 外部变更 时重新对齐勾选态
watch(() => [props.rows, props.selectedKeys], applySelectedKeys, { deep: true, immediate: true })

defineExpose({ refreshSelection: applySelectedKeys })
</script>

<style scoped>
/* 展开子区容器：浅灰底与汇总行区分；不改主表 expanded-cell 背景，避免双重底色 */
.child-wrap {
  padding: 8px 12px;
  background: var(--el-fill-color-light);
  border-top: 1px solid var(--el-border-color-lighter);
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.child-table :deep(.el-table__header th) {
  background: transparent;
  font-weight: 600;
}

.child-table :deep(.el-table__row) {
  background: transparent;
}

.child-table :deep(.el-table__cell) {
  padding: 6px 8px;
}

/* 三列高亮（recordcode / asset_code / asset_current_status），走令牌适配双主题 */
.child-table :deep(.el-table__cell.highlight-col) {
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.child-pager {
  display: flex;
  justify-content: flex-end;
  padding: 6px 0 2px;
}
</style>
