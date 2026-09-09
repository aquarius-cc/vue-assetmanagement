<!--
@file 损坏资产列表页面，展示损坏资产记录并支持删除和导出操作
@component BrokenAssetDetails
@usedBy
  - views/BrokenAssetDetails.vue: 通过 router-view 渲染损坏资产列表
@dependsOn
  - composables/useSmartListConfig: 列表配置
  - stores/brokenAssetStore: 损坏资产数据管理
  - components/commoncomponents/SmartListContainer: 数据管理容器
  - components/commoncomponents/CommonList: 列表展示组件
-->
<template>
  <div class="broken-asset-details-root">
    <div class="table-container">
      <SmartListContainer
        ref="smartListRef"
        :store-config="storeConfig"
        :auto-load="true"
        :initial-page="1"
        :initial-page-size="20"
      >
        <template #default="slotProps">
          <CommonList
            :data="slotProps.data"
            :loading="slotProps.loading"
            v-model:current-page="slotProps.currentPage"
            v-model:page-size="slotProps.pageSize"
            v-model:search="slotProps.search"
            :total="slotProps.total"
            :columns="columns"
            :enable-search="true"
            :show-actions="true"
            :enable-delete="true"
            :enable-selection="true"
            :action-column-width="120"
            :page-size-options="slotProps.pageSizeOptions"
            @size-change="slotProps.handleSizeChange"
            @current-change="slotProps.handleCurrentChange"
            @search="slotProps.performSearch"
            @delete="handleDelete"
            @selection-change="slotProps.handleSelectionChange"
          >
            <template #broken_date="{ row }">
              {{ formatDate(row.broken_date) }}
            </template>
          </CommonList>

          <div class="bottom-buttons">
            <el-button type="primary" @click="handleExportExcel">导出Excel</el-button>
            <el-button
              type="danger"
              :disabled="slotProps.selectedRows?.length === 0"
              @click="handleBatchDelete(slotProps.selectedRows)"
            >
              批量删除 ({{ slotProps.selectedRows?.length || 0 }})
            </el-button>
          </div>
        </template>
      </SmartListContainer>
    </div>
  </div>
</template>

<script lang="ts" setup>
defineOptions({ name: 'BrokenAssetDetails' })

import { ref } from 'vue'
import SmartListContainer from '@/components/commoncomponents/SmartListContainer.vue'
import CommonList from '@/components/commoncomponents/CommonList.vue'
import type { TableColumn } from '@/types/list'
import { useSmartListConfig } from '@/composables/useSmartListConfig'
import type { BrokenAssetExtended } from '@/types/brokenasset'
import { useBrokenAssetStore } from '@/stores/brokenAssetStore'
import type { SmartListContainerExpose } from '@/types/common'
import { useAssetLifecycleActions, formatDate } from '@/composables/useAssetLifecycleActions'
import type { ColumnConfig } from '@/utils/excelExporter'

const brokenAssetStore = useBrokenAssetStore()
const smartListRef = ref<SmartListContainerExpose | null>(null)

const columns: TableColumn[] = [
  { type: 'index', label: '序号', width: 60, align: 'center' },
  { prop: 'recordcode', label: '唯一记录码', width: 160, align: 'center' },
  { prop: 'asset_code', label: '资产编号', width: 160, align: 'center' },
  { prop: 'asset_name', label: '资产名称', width: 150, align: 'left' },
  { prop: 'broken_reason', label: '损坏原因', width: 150, align: 'left' },
  {
    type: 'custom',
    prop: 'broken_date',
    label: '损坏日期',
    width: 120,
    align: 'center',
    slotName: 'broken_date',
  },
  { prop: 'operator_name', label: '操作人', width: 100, align: 'center' },
]

const storeConfig = useSmartListConfig<BrokenAssetExtended>({
  store: brokenAssetStore,
  entityName: '损坏资产',
})

const exportColumns: ColumnConfig<BrokenAssetExtended>[] = [
  { title: '记录编码', key: 'recordcode', default: '' },
  { title: '资产编码', key: 'asset_code', default: '' },
  { title: '资产名称', key: 'asset_name', default: '' },
  { title: '损坏原因', key: 'broken_reason', default: '' },
  {
    title: '损坏日期',
    key: 'broken_date',
    default: '',
    formatter: (val: unknown) => formatDate(val as string | Date | null) || '',
  },
  { title: '操作人', key: 'operator_name', default: '' },
]

const { handleDelete, handleBatchDelete, handleExportExcel } = useAssetLifecycleActions({
  store: brokenAssetStore,
  entityName: '损坏资产',
  fileNamePrefix: '损坏资产列表',
  exportColumns,
  refresh: async () => {
    smartListRef.value?.refresh()
  },
  clearSelection: () => {
    smartListRef.value?.clearSelection()
  },
})
</script>

<style lang="scss" scoped>
@use '@/assets/styles/common-forms.scss' as *;

.broken-asset-details-root {
  @include list-container;
}

.table-container {
  @include table-container;
}

.bottom-buttons {
  @include bottom-buttons;
}

@include responsive-design;
</style>
