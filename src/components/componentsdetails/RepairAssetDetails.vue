<!--
@file 维修资产列表页面，展示维修资产记录并支持删除和导出操作
@component RepairAssetDetails
@usedBy
  - views/RepairAssetDetails.vue: 通过 router-view 渲染维修资产列表
@dependsOn
  - composables/useSmartListConfig: 列表配置
  - stores/repairAssetStore: 维修资产数据管理
  - components/commoncomponents/SmartListContainer: 数据管理容器
  - components/commoncomponents/CommonList: 列表展示组件
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



<script lang="ts" setup>
defineOptions({ name: 'RepairAssetDetails' })

import { ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import SmartListContainer from '@/components/commoncomponents/SmartListContainer.vue'
import CommonList from '@/components/commoncomponents/CommonList.vue'
import type { TableColumn } from '@/components/commoncomponents/CommonList.vue'
import { useSmartListConfig } from '@/composables/useSmartListConfig'
import type { ColumnConfig } from '@/utils/excelExporter'
import { exportToExcel } from '@/utils/excelExporter'
import type { RepairAssetExtended } from '@/types/repairasset'
import { useRepairAssetStore } from '@/stores/repairAssetStore'
import { formatDate } from '@/utils/Format'
import type { SmartListContainerExpose } from '@/types/common'

const repairAssetStore = useRepairAssetStore()
const smartListRef = ref<SmartListContainerExpose | null>(null)

const getRepairStatusTagType = (
  status: string | null | undefined,
): 'success' | 'warning' | 'danger' | 'info' => {
  switch (status) {
    case 'completed':
      return 'success'
    case 'failed':
      return 'danger'
    case 'in_progress':
      return 'warning'
    default:
      return 'info'
  }
}

const getRepairStatusText = (status: string | null | undefined): string => {
  switch (status) {
    case 'completed':
      return 'Completed'
    case 'failed':
      return 'Failed'
    case 'in_progress':
      return 'In Progress'
    default:
      return 'Unknown'
  }
}

const columns: TableColumn[] = [
  { type: 'index', label: '序号', width: 60, align: 'center' },
  { prop: 'recordcode', label: '唯一记录码', width: 160, align: 'center' },
  { prop: 'asset_code', label: '资产编号', width: 160, align: 'center' },
  { prop: 'asset_name', label: '资产名称', width: 150, align: 'left' },
  { prop: 'repair_reason', label: '维修原因', width: 150, align: 'left' },
  {
    type: 'custom',
    prop: 'repair_date',
    label: '维修日期',
    width: 120,
    align: 'center',
    slotName: 'repair_date',
  },
  {
    type: 'custom',
    prop: 'repair_status',
    label: '维修状态',
    width: 100,
    align: 'center',
    slotName: 'repair_status',
  },
  { prop: 'operator_name', label: '操作人', width: 100, align: 'center' },
]

const storeConfig = useSmartListConfig<RepairAssetExtended>({
  store: repairAssetStore,
  entityName: '维修记录',
})

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
        const msg = (error as { response?: { data?: { message?: string } } })?.response?.data
          ?.message
        console.error('Delete failed:', error)
        ElMessage.error(msg || 'Delete failed')
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
    const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
    console.error('Batch delete failed:', err)
    ElMessage.error(msg || 'Batch delete failed')
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
