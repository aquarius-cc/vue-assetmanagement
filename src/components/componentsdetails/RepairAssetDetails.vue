<!--
  RepairAssetDetails.vue
  Repair asset list page
-->
<template>
  <div class="repair-asset-details-root">
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
            <template #repair_date="{ row }">
              {{ formatDate(row.repair_date) }}
            </template>

            <template #repair_status="{ row }">
              <el-tag :type="getRepairStatusTagType(row.repair_status)">
                {{ getRepairStatusText(row.repair_status) }}
              </el-tag>
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
  name: 'RepairAssetDetails',
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
import type { RepairAssetExtended } from '@/utils/RepairAsset'
import { useRepairAssetStore } from '@/stores/repairAssetStore'
import { formatDate } from '@/utils/Format'
import type { SmartListContainerExpose } from '@/types/common'

const repairAssetStore = useRepairAssetStore()
const smartListRef = ref<SmartListContainerExpose | null>(null)

const getRepairStatusTagType = (status: string | null | undefined): 'success' | 'warning' | 'danger' | 'info' => {
  switch (status) {
    case 'completed': return 'success'
    case 'failed': return 'danger'
    case 'in_progress': return 'warning'
    default: return 'info'
  }
}

const getRepairStatusText = (status: string | null | undefined): string => {
  switch (status) {
    case 'completed': return 'Completed'
    case 'failed': return 'Failed'
    case 'in_progress': return 'In Progress'
    default: return 'Unknown'
  }
}

const columns: TableColumn[] = [
  { type: 'index', label: 'No.', width: 60, align: 'center' },
  { prop: 'recordcode', label: 'Record Code', width: 160, align: 'center' },
  { prop: 'asset_code', label: 'Asset Code', width: 160, align: 'center' },
  { prop: 'asset_name', label: 'Asset Name', width: 150, align: 'left' },
  { prop: 'repair_reason', label: 'Reason', width: 150, align: 'left' },
  {
    type: 'custom',
    prop: 'repair_date',
    label: 'Repair Date',
    width: 120,
    align: 'center',
    slotName: 'repair_date',
  },
  {
    type: 'custom',
    prop: 'repair_status',
    label: 'Status',
    width: 100,
    align: 'center',
    slotName: 'repair_status',
  },
  { prop: 'operator_name', label: 'Operator', width: 100, align: 'center' },
]

const storeConfig: PaginationSearchConfig<RepairAssetExtended> = {
  store: {
    getList: async (params) => {
      const response = await repairAssetStore.getList(params)
      return {
        count: repairAssetStore.pagination.total,
        results: response,
        next: null,
        previous: null,
      }
    },
    pagination: {
      page: {
        get: () => repairAssetStore.pagination.page,
        set: (val: number) => { repairAssetStore.pagination.page = val },
      },
      page_size: {
        get: () => repairAssetStore.pagination.page_size,
        set: (val: number) => { repairAssetStore.pagination.page_size = val },
      },
      total: {
        get: () => repairAssetStore.pagination.total,
        set: (val: number) => { repairAssetStore.pagination.total = val },
      },
    },
    list: computed(() => repairAssetStore.list),
    loading: computed(() => repairAssetStore.loading),
    refreshFlag: computed(() => repairAssetStore.refreshFlag),
    setRefreshFlag: (flag: boolean) => repairAssetStore.setRefreshFlag(flag),
  },
  search: {
    performSearch: async (keyword: string, page: number, page_size: number) => {
      const response = await repairAssetStore.getList({ search: keyword, page, page_size })
      return {
        count: repairAssetStore.pagination.total,
        results: response,
      }
    },
  },
  defaultPageSize: 20,
  messages: {
    loadFailed: 'Failed to load repair asset list',
    searchFailed: 'Failed to search repair assets',
    invalidPage: 'Page out of range, jumped to last page',
  },
}

const handleDelete = (row: RepairAssetExtended) => {
  if (!row.recordcode) {
    ElMessage.error('Record code missing, cannot delete')
    return
  }
  ElMessageBox.confirm('Delete this repair record?', 'Confirm', {
    confirmButtonText: 'OK',
    cancelButtonText: 'Cancel',
    type: 'warning',
  })
    .then(() => repairAssetStore.remove(row.recordcode))
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

const handleBatchDelete = async (rows: RepairAssetExtended[] | undefined) => {
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
    await repairAssetStore.removeBatch(codes)
    smartListRef.value?.clearSelection()
    await smartListRef.value?.refresh()
  } catch (err) {
    if (err === 'cancel') return
    console.error('Batch delete failed:', err)
    ElMessage.error('Batch delete failed')
  }
}

const handleExportExcel = async () => {
  const exportColumns: ColumnConfig<RepairAssetExtended>[] = [
    { title: 'Record Code', key: 'recordcode', default: '' },
    { title: 'Asset Code', key: 'asset_code', default: '' },
    { title: 'Asset Name', key: 'asset_name', default: '' },
    { title: 'Reason', key: 'repair_reason', default: '' },
    {
      title: 'Repair Date',
      key: 'repair_date',
      default: '',
      formatter: (val) => formatDate(val as string | Date | null) || '',
    },
    {
      title: 'Status',
      key: 'repair_status',
      default: '',
      formatter: (val) => getRepairStatusText(val as string),
    },
    { title: 'Operator', key: 'operator_name', default: '' },
  ]

  let range: 'current' | 'all' | null = null
  try {
    await ElMessageBox.confirm(
      `Current page: ${repairAssetStore.list.length}, Total: ${repairAssetStore.pagination.total}. Choose:`,
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

  let exportData: RepairAssetExtended[] = []
  let fileName = ''

  if (range === 'current') {
    exportData = repairAssetStore.list
    fileName = `RepairAssets_Current_${repairAssetStore.list.length}.xlsx`
  } else if (range === 'all') {
    ElMessage.info('Loading all data...')
    try {
      const allData = await repairAssetStore.getList({
        page: 1,
        page_size: repairAssetStore.pagination.total,
      })
      exportData = allData
      fileName = `RepairAssets_All_${allData.length}.xlsx`
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
    sheetName: 'Repair Assets',
    confirmMessage: `Export ${exportData.length} repair records?`,
    emptyMessage: 'No data to export',
    successMessage: 'Export successful',
    errorMessage: 'Export failed',
  })
}
</script>

<style lang="scss" scoped>
@use '@/assets/styles/common-forms.scss' as *;

.repair-asset-details-root {
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
