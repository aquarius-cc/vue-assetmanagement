<!--
@file 通用列表展示组件，负责表格渲染、分页和操作按钮
@component CommonList
@usedBy
  - 多个 *Details.vue 页面（AssetContentDetails, ContractDetails 等）
@dependsOn
  - components/CommonListActions: 操作按钮列
  - components/CommonListColumn: 列定义渲染
-->
<template>
  <div class="common-list">
    <!-- 表格容器 -->
    <div class="table-container">
      <el-table
        ref="tableRef"
        :data="data"
        v-loading="loading"
        style="width: 100%"
        :header-cell-style="{ textAlign: 'center' }"
        :cell-style="{ textAlign: 'center' }"
        fit
        border
        :row-key="getRowKey"
        @selection-change="handleSelectionChange"
      >
        <!-- 多选列：当 enableSelection 为 true 时显示 -->
        <el-table-column v-if="enableSelection" type="selection" width="55" align="center" />

        <!-- 动态列渲染 -->
        <template v-for="column in columns" :key="column.prop || column.label">
          <CommonListColumn :column="column" :current-page="currentPage" :page-size="pageSize">
            <!-- 透传自定义列插槽 -->
            <template v-for="(_, slotName) in $slots" :key="slotName" #[slotName]="slotProps">
              <slot :name="slotName" v-bind="slotProps" />
            </template>
          </CommonListColumn>
        </template>

        <!-- 操作列：包含搜索框和操作按钮 -->
        <CommonListActions
          ref="actionsRef"
          :show-actions="showActions"
          :action-column-width="actionColumnWidth"
          :enable-search="enableSearch"
          :search-placeholder="searchPlaceholder"
          :search="search"
          :enable-edit="enableEdit"
          :enable-delete="enableDelete"
          :show-detail-button="showDetailButton"
          :detail-route-name="detailRouteName"
          :detail-query-key="detailQueryKey"
          :detail-query-param-name="detailQueryParamName"
          :edit-route-name="editRouteName"
          @update:search="emit('update:search', $event)"
          @search="emit('search', $event)"
          @edit="handleRowEdit"
          @delete="handleRowDelete"
          @detail="handleRowDetail"
        >
          <!-- 透传 actions 插槽 -->
          <template #actions="slotProps">
            <slot name="actions" v-bind="slotProps" />
          </template>
        </CommonListActions>
      </el-table>
    </div>

    <!-- 分页容器 -->
    <div v-if="showPagination" class="pagination-container">
      <el-pagination
        v-model:current-page="localCurrentPage"
        v-model:page-size="localPageSize"
        :page-sizes="pageSizeOptions"
        :total="total"
        layout="total, sizes, prev, pager, next, jumper"
        @size-change="handleSizeChange"
        @current-change="handleCurrentChange"
      />
    </div>
  </div>
</template>

<script setup lang="ts" generic="T extends object">
import { computed, ref } from 'vue'
import type { ElTable } from 'element-plus'
import CommonListColumn from './CommonListColumn.vue'
import CommonListActions from './CommonListActions.vue'
import type { TableColumn } from '@/types/list'

interface Props {
  data: T[]
  columns: TableColumn[]
  currentPage?: number
  pageSize?: number
  total?: number
  pageSizeOptions?: number[]
  loading?: boolean
  search?: string
  enableSearch?: boolean
  enableEdit?: boolean
  enableDelete?: boolean
  showPagination?: boolean
  showActions?: boolean
  showDetailButton?: boolean
  detailRouteName?: string
  detailQueryKey?: string
  detailQueryParamName?: string
  editRouteName?: string
  searchPlaceholder?: string
  actionColumnWidth?: number | string
  enableSelection?: boolean
  rowKey?: string
}

const props = withDefaults(defineProps<Props>(), {
  currentPage: 1,
  pageSize: 20,
  total: 0,
  pageSizeOptions: () => [20, 50, 100, 200, 500],
  loading: false,
  search: '',
  enableSearch: true,
  enableEdit: true,
  enableDelete: true,
  showPagination: true,
  showActions: true,
  showDetailButton: false,
  searchPlaceholder: '搜索',
  actionColumnWidth: 'auto',
  enableSelection: false,
  rowKey: 'id',
})

const emit = defineEmits<{
  (e: 'update:currentPage', page: number): void
  (e: 'update:pageSize', size: number): void
  (e: 'update:search', keyword: string): void
  (e: 'sizeChange', size: number): void
  (e: 'currentChange', page: number): void
  (e: 'search', keyword: string): void
  (e: 'edit', row: T, index: number): void
  (e: 'delete', row: T, index: number): void
  (e: 'detail', row: T, index: number): void
  (e: 'selectionChange', rows: T[]): void
}>()

// ===== 表格实例引用 =====
const tableRef = ref<InstanceType<typeof ElTable> | null>(null)
const actionsRef = ref<InstanceType<typeof CommonListActions> | null>(null)

// ===== 本地状态（用于 v-model） =====
const localCurrentPage = computed({
  get: () => props.currentPage,
  set: (val: number) => emit('update:currentPage', val),
})

const localPageSize = computed({
  get: () => props.pageSize,
  set: (val: number) => emit('update:pageSize', val),
})

// ===== 方法 =====
const ROW_KEY_FALLBACK_FIELDS = [
  'id',
  'code',
  'asset_code',
  'asset_type_code',
  'contract_code',
  'damaged_asset_code',
  'department_code',
  'employee_jobcode',
  'harddisk_sn_code',
  'logging_id',
  'outasset_recordcode',
  'storage_code',
  'user_jobcode',
  'waste_asset_code',
] as const

const asRowKey = (value: unknown): string | number | undefined => {
  if (typeof value === 'string' || typeof value === 'number') {
    return value
  }
  return undefined
}

const getRowKey = (row: object): string | number | undefined => {
  const obj = row as Record<string, unknown>
  for (const field of [props.rowKey, ...ROW_KEY_FALLBACK_FIELDS]) {
    if (!field) {
      continue
    }
    const key = asRowKey(obj[field])
    if (key !== undefined) {
      return key
    }
  }
  return undefined
}

const handleSizeChange = (size: number) => {
  emit('sizeChange', size)
}

const handleCurrentChange = (page: number) => {
  emit('currentChange', page)
}

const handleSelectionChange = (rows: T[]) => {
  emit('selectionChange', rows)
}

const handleRowEdit = (row: Record<string, unknown>, index: number) => {
  emit('edit', row as T, index)
}
const handleRowDelete = (row: Record<string, unknown>, index: number) => {
  emit('delete', row as T, index)
}
const handleRowDetail = (row: Record<string, unknown>, index: number) => {
  emit('detail', row as T, index)
}

// ===== 暴露方法 =====
defineExpose({
  search: () => {
    actionsRef.value?.search()
  },
  clearSearch: () => {
    actionsRef.value?.clearSearch()
  },
  clearSelection: () => {
    tableRef.value?.clearSelection()
  },
})
</script>

<style scoped>
.common-list {
  width: 100%;
  padding: 16px;
  background-color: var(--background-color);
  /* App 壳式布局：撑满父容器，内部表格自滚，分页/按钮常驻 */
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
}

.table-container {
  width: 100%;
  /* 表格区自滚（上下+左右），滚动条位于本容器 */
  flex: 1;
  min-height: 0;
  overflow: auto;
  margin-bottom: 16px;
  box-sizing: border-box;
}

.table-container :deep(.el-table) {
  width: var(--table-width, 100%);
  table-layout: var(--table-layout, auto);
  border-radius: 8px;
  /* 不设 min-width/overflow：EP 根自带 overflow:hidden，且以根 clientWidth 计算列宽，
     根被 min-width 撑开会致表头截断（详见账本 v2.9.12） */
}

.table-container :deep(.el-table__header th.el-table__cell) {
  padding: var(--table-header-padding, 12px 12px);
  background-color: var(--table-header-bg, var(--card-background-light));
  color: var(--text-primary);
  font-weight: 600;
  word-break: var(--table-header-word-break, normal);
}

.table-container :deep(.el-table__body td.el-table__cell) {
  padding: var(--table-body-padding, 12px 12px);
  color: var(--text-regular);
  word-break: var(--table-body-word-break, normal);
}

.table-container :deep(.el-table__body tr:hover > td) {
  background-color: var(--table-row-hover-bg, var(--background-color));
}

.table-container :deep(.el-table--border) {
  border: none;
}

.table-container :deep(.el-table--border th),
.table-container :deep(.el-table--border td) {
  border-right: 1px solid var(--border-color-lighter);
}

.table-container :deep(.el-table__empty-text) {
  color: var(--text-secondary);
  font-size: 14px;
  padding: 32px 0;
}

.pagination-container {
  display: flex;
  /* 常驻可见：不被表格滚动区压缩 */
  flex-shrink: 0;
  justify-content: flex-end;
  align-items: center;
  padding: 16px 20px 0;
}

.pagination-container :deep(.el-pagination__total) {
  color: var(--text-regular);
  font-size: 14px;
}

.pagination-container :deep(.el-pagination__sizes) {
  color: var(--text-regular);
}

.pagination-container :deep(.el-pagination__jump) {
  color: var(--text-regular);
  font-size: 14px;
}

.pagination-container :deep(.el-pagination.is-background .btn-next),
.pagination-container :deep(.el-pagination.is-background .btn-prev),
.pagination-container :deep(.el-pagination.is-background .el-pager li) {
  background-color: var(--card-background);
  border: 1px solid var(--border-color-input);
  border-radius: 8px;
}

.pagination-container :deep(.el-pagination.is-background .btn-next.is-active),
.pagination-container :deep(.el-pagination.is-background .btn-prev.is-active),
.pagination-container :deep(.el-pagination.is-background .el-pager li.is-active) {
  background-color: var(--color-primary-light);
  border-color: var(--color-primary-light);
  color: var(--card-background);
}

.pagination-container :deep(.el-pagination.is-background .btn-next:hover),
.pagination-container :deep(.el-pagination.is-background .btn-prev:hover),
.pagination-container :deep(.el-pagination.is-background .el-pager li:hover) {
  color: var(--color-primary-light);
  border-color: var(--color-primary-light);
  background-color: var(--color-primary-lighter);
}

@media (max-width: 768px) {
  .common-list {
    padding: 12px;
  }

  .pagination-container {
    flex-direction: column;
    gap: 12px;
    align-items: flex-start;
  }
}
</style>
