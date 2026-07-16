<!--
  BrokenAssetDetails.vue
  Broken asset list page
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
            <el-button type="primary" @click="handleExportExcel">Export Excel</el-button>
            <el-button
              type="danger"
              :disabled="slotProps.selectedRows?.length === 0"
              @click="handleBatchDelete(slotProps.selectedRows)"
            >
              Batch Delete ({{ slotProps.selectedRows?.length || 0 }})
            </el-button>
          </div>
        </template>
      </SmartListContainer>
    </div>
  </div>
</template>

<script lang="ts">
export default {
  name: 'BrokenAssetDetails',
}
</script>

<script lang="ts" setup>
import { ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import SmartListContainer from '@/components/commoncomponents/SmartListContainer.vue'
import CommonList from '@/components/commoncomponents/CommonList.vue'
import type { TableColumn } from '@/components/commoncomponents/CommonList.vue'
import { useSmartListConfig } from '@/composables/useSmartListConfig'
import type { ColumnConfig } from '@/utils/excelExporter'
import { exportToExcel } from '@/utils/excelExporter'
import type { BrokenAssetExtended } from '@/utils/BrokenAsset'
import { useBrokenAssetStore } from '@/stores/brokenAssetStore'
import { formatDate } from '@/utils/Format'
import type { SmartListContainerExpose } from '@/types/common'

const brokenAssetStore = useBrokenAssetStore()
const smartListRef = ref<SmartListContainerExpose | null>(null)

const columns: TableColumn[] = [
  { type: 'index', label: 'No.', width: 60, align: 'center' },
  { prop: 'recordcode', label: 'Record Code', width: 160, align: 'center' },
  { prop: 'asset_code', label: 'Asset Code', width: 160, align: 'center' },
  { prop: 'asset_name', label: 'Asset Name', width: 150, align: 'left' },
  { prop: 'broken_reason', label: 'Reason', width: 150, align: 'left' },
  {
    type: 'custom',
    prop: 'broken_date',
    label: 'Broken Date',
    width: 120,
    align: 'center',
    slotName: 'broken_date',
  },
  { prop: 'operator_name', label: 'Operator', width: 100, align: 'center' },
]

const storeConfig = useSmartListConfig<BrokenAssetExtended>({
  store: brokenAssetStore,
  entityName: '损坏资产',
})

const handleDelete = (row: BrokenAssetExtended) => {
  if (!row.recordcode) {
    ElMessage.error('Record code missing, cannot delete')
    return
  }
  ElMessageBox.confirm('Delete this broken asset record?', 'Confirm', {
    confirmButtonText: 'OK',
    cancelButtonText: 'Cancel',
    type: 'warning',
  })
    .then(() => brokenAssetStore.remove(row.recordcode))
    .then(() => {
      ElMessage.success('Deleted')
      smartListRef.value?.refresh()
    })
    .catch((error) => {
      if (error !== 'cancel') {
        console.error('Delete failed:', error)
        ElMessage.error('Delete failed')
      }
    })
}

const handleBatchDelete = async (rows: BrokenAssetExtended[] | undefined) => {
  if (!rows || rows.length === 0) {
    ElMessage.warning('Please select data first')
    return
  }
  const codes = rows.map((r) => r.recordcode).filter((c): c is string => !!c)
  if (codes.length === 0) {
    ElMessage.error('No valid record codes found')
    return
  }
  try {
    await ElMessageBox.confirm(
      `Delete ${codes.length} records? This cannot be undone.`,
      'Batch Delete',
      { confirmButtonText: 'Delete', cancelButtonText: 'Cancel', type: 'warning' },
    )
    await brokenAssetStore.removeBatch(codes)
    smartListRef.value?.clearSelection()
    await smartListRef.value?.refresh()
  } catch (err) {
    if (err === 'cancel') return
    console.error('Batch delete failed:', err)
    ElMessage.error('Batch delete failed')
  }
}

const handleExportExcel = async () => {
  const exportColumns: ColumnConfig<BrokenAssetExtended>[] = [
    { title: 'Record Code', key: 'recordcode', default: '' },
    { title: 'Asset Code', key: 'asset_code', default: '' },
    { title: 'Asset Name', key: 'asset_name', default: '' },
    { title: 'Reason', key: 'broken_reason', default: '' },
    {
      title: 'Broken Date',
      key: 'broken_date',
      default: '',
      formatter: (val) => formatDate(val as string | Date | null) || '',
    },
    { title: 'Operator', key: 'operator_name', default: '' },
  ]

  let range: 'current' | 'all' | null = null
  try {
    await ElMessageBox.confirm(
      `Current page: ${brokenAssetStore.list.length}, Total: ${brokenAssetStore.pagination.total}. Choose:`,
      'Export Range',
      {
        confirmButtonText: 'Export Current',
        cancelButtonText: 'Export All',
        distinguishCancelAndClose: true,
      },
    )
    range = 'current'
  } catch (err) {
    if (err === 'cancel') range = 'all'
    else return
  }

  let exportData: BrokenAssetExtended[] = []
  let fileName = ''

  if (range === 'current') {
    exportData = brokenAssetStore.list
    fileName = `BrokenAssets_Current_${brokenAssetStore.list.length}.xlsx`
  } else if (range === 'all') {
    ElMessage.info('Loading all data...')
    try {
      const allData = await brokenAssetStore.getList({
        page: 1,
        page_size: brokenAssetStore.pagination.total,
      })
      exportData = allData
      fileName = `BrokenAssets_All_${allData.length}.xlsx`
    } catch (error) {
      console.error('Failed to load all data:', error)
      ElMessage.error('Failed to load data')
      return
    }
  } else {
    return
  }

  await exportToExcel({
    data: exportData,
    columns: exportColumns,
    fileName,
    sheetName: 'Broken Assets',
    confirmMessage: `Export ${exportData.length} broken asset records?`,
    emptyMessage: 'No data to export',
    successMessage: 'Export successful',
    errorMessage: 'Export failed',
  })
}
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
