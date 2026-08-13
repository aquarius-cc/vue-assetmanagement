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
          :edit-route-name="editRouteName"
          @update:search="$emit('update:search', $event)"
          @search="$emit('search', $event)"
          @edit="(row, index) => $emit('edit', row as T, index)"
          @delete="(row, index) => $emit('delete', row as T, index)"
          @detail="(row, index) => $emit('detail', row as T, index)"
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

<script lang="ts">
/**
 * 组件名称定义
 */
export default {
  name: 'CommonList',
}
</script>

<script lang="ts" setup generic="T extends object">
import { computed, ref } from 'vue'
import type { PropType } from 'vue'
import type { ElTable } from 'element-plus'
import CommonListColumn from './CommonListColumn.vue'
import CommonListActions from './CommonListActions.vue'

// ===== 类型定义 =====
export interface TableColumn {
  type?: 'index' | 'custom' | 'default'
  prop?: string
  label: string
  width?: number | string
  align?: 'left' | 'center' | 'right'
  slotName?: string
}

// ===== Props 定义 =====
const props = defineProps({
  data: {
    type: Array as PropType<T[]>,
    required: true,
  },
  columns: {
    type: Array as PropType<TableColumn[]>,
    required: true,
  },
  currentPage: {
    type: Number,
    default: 1,
  },
  pageSize: {
    type: Number,
    default: 20,
  },
  total: {
    type: Number,
    default: 0,
  },
  pageSizeOptions: {
    type: Array as PropType<number[]>,
    default: () => [20, 50, 100, 200, 500],
  },
  loading: {
    type: Boolean,
    default: false,
  },
  search: {
    type: String,
    default: '',
  },
  enableSearch: {
    type: Boolean,
    default: true,
  },
  enableEdit: {
    type: Boolean,
    default: true,
  },
  enableDelete: {
    type: Boolean,
    default: true,
  },
  showPagination: {
    type: Boolean,
    default: true,
  },
  showActions: {
    type: Boolean,
    default: true,
  },
  showDetailButton: {
    type: Boolean,
    default: false,
  },
  detailRouteName: {
    type: String,
    default: null,
  },
  editRouteName: {
    type: String,
    default: null,
  },
  searchPlaceholder: {
    type: String,
    default: '搜索',
  },
  actionColumnWidth: {
    type: [Number, String],
    default: 'auto',
  },
  enableSelection: {
    type: Boolean,
    default: false,
  },
  rowKey: {
    type: String,
    default: 'id',
  },
})

// ===== Events 定义 =====
const emit = defineEmits<{
  'update:currentPage': [page: number]
  'update:pageSize': [size: number]
  'update:search': [keyword: string]
  sizeChange: [size: number]
  currentChange: [page: number]
  search: [keyword: string]
  edit: [row: T, index: number]
  delete: [row: T, index: number]
  detail: [row: T, index: number]
  selectionChange: [rows: T[]]
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
const getRowKey = (row: T): string | number | undefined => {
  const obj = row as unknown as Record<string, unknown>
  if (props.rowKey) {
    const val = obj[props.rowKey]
    if (val !== undefined && val !== null) {
      if (typeof val === 'string' || typeof val === 'number') {
        return val
      }
    }
  }
  const fields = [
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
  ]
  for (const field of fields) {
    const val = obj[field]
    if (val !== undefined && val !== null) {
      if (typeof val === 'string' || typeof val === 'number') {
        return val
      }
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
  min-height: calc(100vh - 120px);
  box-sizing: border-box;
}

.table-container {
  width: 100%;
  overflow-x: auto;
  margin-bottom: 16px;
  border-radius: 12px;
  background-color: var(--card-background);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  padding: 16px;
  box-sizing: border-box;
}

.table-container :deep(.el-table) {
  width: 100% !important;
  table-layout: auto !important;
  border-radius: 8px;
  overflow: hidden;
}

.table-container :deep(.el-table__header th.el-table__cell) {
  text-align: center !important;
  white-space: nowrap;
  padding: 12px 12px !important;
  background-color: var(--card-background-light) !important;
  color: var(--text-primary);
  font-weight: 600;
}

.table-container :deep(.el-table__body td.el-table__cell) {
  text-align: center !important;
  padding: 12px 12px !important;
  color: var(--text-regular);
}

.table-container :deep(.el-table__body tr:hover > td) {
  background-color: var(--background-color) !important;
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
  justify-content: flex-end;
  align-items: center;
  padding: 16px 20px;
  background-color: var(--card-background);
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
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
