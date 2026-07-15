<!--
  FoundAssetDetails.vue
  Found asset list page
-->
<template>
  <div class="found-asset-details-root">
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
            <template #found_date="{ row }">
              {{ formatDate(row.found_date) }}
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
  name: 'FoundAssetDetails',
}
</script>

<script lang="ts" setup>
import { ref, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import SmartListContainer from '@/components/commoncomponents/SmartListContainer.vue'
import CommonList from '@/components/commoncomponents/CommonList.vue'
import type { TableColumn } from '@/components/commoncomponents/CommonList.vue'
import type { PaginationSearchConfig } from '@/composables/usePaginationSearch'
import type { ColumnConfig } from '@/utils/excelExporter'
import { exportToExcel } from '@/utils/excelExporter'
import type { FoundAssetExtended } from '@/utils/FoundAsset'
import { useFoundAssetStore } from '@/stores/foundAssetStore'
import { formatDate } from '@/utils/Format'
import type { SmartListContainerExpose } from '@/types/common'

const foundAssetStore = useFoundAssetStore()
const smartListRef = ref<SmartListContainerExpose | null>(null)

const columns: TableColumn[] = [
  { type: 'index', label: 'No.', width: 60, align: 'center' },
  { prop: 'recordcode', label: 'Record Code', width: 160, align: 'center' },
  { prop: 'lost_asset_code', label: 'Lost Record', width: 160, align: 'center' },
  { prop: 'asset_code', label: 'Asset Code', width: 160, align: 'center' },
  { prop: 'asset_name', label: 'Asset Name', width: 150, align: 'left' },
  { prop: 'found_location', label: 'Location', width: 120, align: 'left' },
  {
    type: 'custom',
    prop: 'found_date',
    label: 'Found Date',
    width: 120,
    align: 'center',
    slotName: 'found_date',
  },
  { prop: 'operator_name', label: 'Operator', width: 100, align: 'center' },
]

const storeConfig: PaginationSearchConfig<FoundAssetExtended> = {
  store: {
    getList: async (params) => {
      const response = await foundAssetStore.getList(params)
      return {
        count: foundAssetStore.pagination.total,
        results: response,
        next: null,
        previous: null,
      }
    },
    pagination: {
      page: {
        get: () => foundAssetStore.pagination.page,
        set: (val: number) => { foundAssetStore.pagination.page = val },
      },
      page_size: {
        get: () => foundAssetStore.pagination.page_size,
        set: (val: number) => { foundAssetStore.pagination.page_size = val },
      },
      total: {
        get: () => foundAssetStore.pagination.total,
        set: (val: number) => { foundAssetStore.pagination.total = val },
      },
    },
    list: computed(() => foundAssetStore.list),
    loading: computed(() => foundAssetStore.loading),
    refreshFlag: computed(() => foundAssetStore.refreshFlag),
    setRefreshFlag: (flag: boolean) => foundAssetStore.setRefreshFlag(flag),
  },
  search: {
    performSearch: async (keyword: string, page: number, page_size: number) => {
      const response = await foundAssetStore.getList({ search: keyword, page, page_size })
      return {
        count: foundAssetStore.pagination.total,
        results: response,
      }
    },
  },
  defaultPageSize: 20,
  messages: {
    loadFailed: 'Failed to load found asset list',
    searchFailed: 'Failed to search found assets',
    invalidPage: 'Page out of range, jumped to last page',
  },
}

const handleDelete = (row: FoundAssetExtended) => {
  if (!row.recordcode) {
    ElMessage.error('Record code missing, cannot delete')
    return
  }
  ElMessageBox.confirm('Delete this found asset record?', 'Confirm', {
    confirmButtonText: 'OK',
    cancelButtonText: 'Cancel',
    type: 'warning',
  })
    .then(() => foundAssetStore.remove(row.recordcode))
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

const handleBatchDelete = async (rows: FoundAssetExtended[] | undefined) => {
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
    await foundAssetStore.removeBatch(codes)
    smartListRef.value?.clearSelection()
    await smartListRef.value?.refresh()
  } catch (err) {
    if (err === 'cancel') return
    console.error('Batch delete failed:', err)
    ElMessage.error('Batch delete failed')
  }
}

const handleExportExcel = async () => {
  const exportColumns: ColumnConfig<FoundAssetExtended>[] = [
    { title: 'Record Code', key: 'recordcode', default: '' },
    { title: 'Lost Record', key: 'lost_asset_code', default: '' },
    { title: 'Asset Code', key: 'asset_code', default: '' },
    { title: 'Asset Name', key: 'asset_name', default: '' },
    { title: 'Location', key: 'found_location', default: '' },
    {
      title: 'Found Date',
      key: 'found_date',
      default: '',
      formatter: (val) => formatDate(val as string | Date | null) || '',
    },
    { title: 'Operator', key: 'operator_name', default: '' },
  ]

  let range: 'current' | 'all' | null = null
  try {
    await ElMessageBox.confirm(
      `Current page: ${foundAssetStore.list.length}, Total: ${foundAssetStore.pagination.total}. Choose:`,
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

  let exportData: FoundAssetExtended[] = []
  let fileName = ''

  if (range === 'current') {
    exportData = foundAssetStore.list
    fileName = `FoundAssets_Current_${foundAssetStore.list.length}.xlsx`
  } else if (range === 'all') {
    ElMessage.info('Loading all data...')
    try {
      const allData = await foundAssetStore.getList({
        page: 1,
        page_size: foundAssetStore.pagination.total,
      })
      exportData = allData
      fileName = `FoundAssets_All_${allData.length}.xlsx`
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
    sheetName: 'Found Assets',
    confirmMessage: `Export ${exportData.length} found asset records?`,
    emptyMessage: 'No data to export',
    successMessage: 'Export successful',
    errorMessage: 'Export failed',
  })
}
</script>

<style lang="scss" scoped>
@use '@/assets/styles/common-forms.scss' as *;

.found-asset-details-root {
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
