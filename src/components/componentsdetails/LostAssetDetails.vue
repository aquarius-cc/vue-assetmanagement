<!--
@file 遗失资产列表页面，展示遗失资产记录并支持删除和导出操作
@component LostAssetDetails
@usedBy
  - views/LostAssetDetails.vue: 通过 router-view 渲染遗失资产列表
@dependsOn
  - composables/useSmartListConfig: 列表配置
  - stores/lostAssetStore: 遗失资产数据管理
  - components/commoncomponents/SmartListContainer: 数据管理容器
  - components/commoncomponents/CommonList: 列表展示组件
-->
<template>
  <div class="lost-asset-details-root">
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
            <template #lost_date="{ row }">
              {{ formatDate(row.lost_date) }}
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
  name: 'LostAssetDetails',
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
import type { LostAssetExtended } from '@/types/lostasset'
import { useLostAssetStore } from '@/stores/lostAssetStore'
import { formatDate } from '@/utils/Format'
import type { SmartListContainerExpose } from '@/types/common'

const lostAssetStore = useLostAssetStore()
const smartListRef = ref<SmartListContainerExpose | null>(null)

const columns: TableColumn[] = [
  { type: 'index', label: '序号', width: 60, align: 'center' },
  { prop: 'recordcode', label: '唯一记录码', width: 160, align: 'center' },
  { prop: 'asset_code', label: '资产编号', width: 160, align: 'center' },
  { prop: 'asset_name', label: '资产名称', width: 150, align: 'left' },
  { prop: 'lost_reason', label: '原因', width: 150, align: 'left' },
  { prop: 'last_known_location', label: '最后已知位置', width: 120, align: 'left' },
  {
    type: 'custom',
    prop: 'lost_date',
    label: '丢失日期',
    width: 120,
    align: 'center',
    slotName: 'lost_date',
  },
  { prop: 'operator_name', label: '操作人', width: 100, align: 'center' },
]

const storeConfig = useSmartListConfig<LostAssetExtended>({
  store: lostAssetStore,
  entityName: '遗失资产',
})

const handleDelete = (row: LostAssetExtended) => {
  if (!row.recordcode) {
    ElMessage.error('Record code missing, cannot delete')
    return
  }
  ElMessageBox.confirm('Delete this lost asset record?', 'Confirm', {
    confirmButtonText: 'OK',
    cancelButtonText: 'Cancel',
    type: 'warning',
  })
    .then(() => lostAssetStore.remove(row.recordcode))
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

const handleBatchDelete = async (rows: LostAssetExtended[] | undefined) => {
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
    await lostAssetStore.removeBatch(codes)
    smartListRef.value?.clearSelection()
    await smartListRef.value?.refresh()
  } catch (err) {
    if (err === 'cancel') return
    console.error('Batch delete failed:', err)
    ElMessage.error('Batch delete failed')
  }
}

const handleExportExcel = async () => {
  const exportColumns: ColumnConfig<LostAssetExtended>[] = [
    { title: 'Record Code', key: 'recordcode', default: '' },
    { title: 'Asset Code', key: 'asset_code', default: '' },
    { title: 'Asset Name', key: 'asset_name', default: '' },
    { title: 'Reason', key: 'lost_reason', default: '' },
    { title: 'Last Location', key: 'last_known_location', default: '' },
    {
      title: 'Lost Date',
      key: 'lost_date',
      default: '',
      formatter: (val) => formatDate(val as string | Date | null) || '',
    },
    { title: 'Operator', key: 'operator_name', default: '' },
  ]

  let range: 'current' | 'all' | null = null
  try {
    await ElMessageBox.confirm(
      `Current page: ${lostAssetStore.list.length}, Total: ${lostAssetStore.pagination.total}. Choose:`,
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

  let exportData: LostAssetExtended[] = []
  let fileName = ''

  if (range === 'current') {
    exportData = lostAssetStore.list
    fileName = `LostAssets_Current_${lostAssetStore.list.length}.xlsx`
  } else if (range === 'all') {
    ElMessage.info('Loading all data...')
    try {
      const allData = await lostAssetStore.getList({
        page: 1,
        page_size: lostAssetStore.pagination.total,
      })
      exportData = allData
      fileName = `LostAssets_All_${allData.length}.xlsx`
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
    sheetName: 'Lost Assets',
    confirmMessage: `Export ${exportData.length} lost asset records?`,
    emptyMessage: 'No data to export',
    successMessage: 'Export successful',
    errorMessage: 'Export failed',
  })
}
</script>

<style lang="scss" scoped>
@use '@/assets/styles/common-forms.scss' as *;

.lost-asset-details-root {
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
