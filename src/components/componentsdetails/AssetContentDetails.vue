<!--
@file 资产列表管理页面，展示所有资产信息并支持增删改查操作
@component AssetContentDetails
@usedBy
  - views/AssetDetails.vue: 通过 router-view 渲染资产列表
@dependsOn
  - composables/useAssetListConfig: 资产列表配置（分页、搜索、导出列）
  - composables/useExcelExport: Excel导出功能
  - stores/assetStore: 资产数据管理
  - components/commoncomponents/SmartListContainer: 数据管理容器
  - components/commoncomponents/CommonList: 列表展示组件
  - components/commoncomponents/StatusTag: 状态标签组件
-->
<template>
  <div class="asset-details-root">
    <SearchBar
      ref="searchBarRef"
      :fields="searchFields"
      @search="handleSearch"
      @reset="handleSearchReset"
    />

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
            :detail-route-name="'BasicAssetDetails'"
            :show-detail-button="true"
            :enable-search="true"
            :enable-edit="true"
            :enable-delete="true"
            :enable-selection="true"
            :action-column-width="180"
            :page-size-options="slotProps.pageSizeOptions"
            @size-change="slotProps.handleSizeChange"
            @current-change="slotProps.handleCurrentChange"
            @search="slotProps.performSearch"
            @edit="handleEdit"
            @delete="handleDelete"
            @selection-change="slotProps.handleSelectionChange"
          >
            <template #asset_current_status="{ row }">
              <StatusTag :status="row.asset_current_status" />
            </template>

            <template #asset_type_name="{ row }">
              <!-- 【A-9】数据源为 AssetListSerializer 反规范输出的 asset_type_name（分类名称） -->
              <el-tag v-if="row.asset_type_name" type="info">
                {{ row.asset_type_name }}
              </el-tag>
              <span v-else>-</span>
            </template>

            <template #contract_code="{ row }">
              <span>{{ getContractCode(row.contract_code || '') }}</span>
            </template>
          </CommonList>

          <div class="bottom-buttons">
            <el-button type="success" @click="handleAddAsset">新增资产</el-button>
            <el-button type="primary" @click="handleBatchImport">批量导入</el-button>
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

      <div v-if="isChildRouteActive" class="router-mask-container">
        <div class="mask" @click="handleMaskBack"></div>
        <div class="child-router-container">
          <router-view></router-view>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
defineOptions({ name: 'AssetContentDetails' })

import { ref, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import SmartListContainer from '@/components/commoncomponents/SmartListContainer.vue'
import CommonList from '@/components/commoncomponents/CommonList.vue'
import SearchBar from '@/components/commoncomponents/SearchBar.vue'
import StatusTag from '@/components/commoncomponents/StatusTag.vue'
import type { TableColumn } from '@/types/list'
import type { SmartListContainerExpose } from '@/types/common'
import { useAssetListConfig } from '@/composables/useAssetListConfig'
import { useExcelExport } from '@/composables/useExcelExport'
import type { AssetDetail } from '@/types/asset'

const router = useRouter()
const route = useRoute()
const { searchFields, storeConfig, exportColumns, assetStore } = useAssetListConfig()

const smartListRef = ref<SmartListContainerExpose | null>(null)
const isChildRouteActive = ref(false)

// ===== 辅助函数 =====
const getContractCode = (contract: unknown): string => {
  if (typeof contract === 'object' && contract !== null && 'contract_code' in contract) {
    return String((contract as { contract_code: string }).contract_code || '-')
  }
  return typeof contract === 'string' ? contract || '-' : '-'
}

// ===== 表格列配置 =====
const columns: TableColumn[] = [
  { type: 'index', label: '序号', width: 80, align: 'center' },
  { prop: 'recordcode', label: '唯一记录码', width: 150, align: 'center' },
  { prop: 'asset_code', label: '编码', width: 180, align: 'center' },
  { prop: 'asset_name', label: '名称', width: 180, align: 'left' },
  { prop: 'asset_specification', label: '型号规格', width: 180, align: 'left' },
  { prop: 'asset_brand', label: '品牌', width: 120, align: 'center' },
  {
    type: 'custom',
    prop: 'asset_type_name',
    label: '资产分类',
    width: 130,
    align: 'center',
    slotName: 'asset_type_name',
  },
  {
    type: 'custom',
    prop: 'asset_current_status',
    label: '当前状态',
    width: 130,
    align: 'center',
    slotName: 'asset_current_status',
  },
  {
    type: 'custom',
    prop: 'contract_code',
    label: '合同号',
    width: 150,
    align: 'center',
    slotName: 'contract_code',
  },
]

// ===== 搜索栏事件 =====
const handleSearch = (params: Record<string, string>) => {
  smartListRef.value?.searchWithParams(params)
}

const handleSearchReset = () => {
  smartListRef.value?.reset()
}

// ===== 路由监听 =====
watch(
  () => route.matched,
  (matched) => {
    const hasParentRoute = matched.some((item) => item.name === 'AssetContentDetails')
    isChildRouteActive.value = hasParentRoute && matched.length > 3
  },
  { immediate: true },
)

// ===== 事件处理 =====
// 【ID-2/取键契约】后端 AssetViewSet lookup_field="recordcode"（asset_view.py:57），
// 编辑/删除等 detail 路由只认 recordcode 或数字 pk；asset_code 是业务编码，不可用于 detail 路由。
const handleEdit = (row: AssetDetail) => {
  if (!row.recordcode) {
    ElMessage.error('记录编码不存在，无法编辑')
    return
  }
  router.push({ name: 'AssetForm', query: { code: row.recordcode } }).catch((err) => {
    ElMessage.error(`跳转失败: ${err.message || '未知错误'}`)
  })
}

const handleDelete = (row: AssetDetail) => {
  if (!row.recordcode) {
    ElMessage.error('记录编码不存在，无法删除')
    return
  }
  ElMessageBox.confirm('确定要删除该资产吗？删除后不可恢复。', '删除确认', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning',
  })
    .then(() => assetStore.remove(row.recordcode))
    .then(() => {
      ElMessage.success('资产删除成功')
      smartListRef.value?.refresh()
    })
    .catch((error) => {
      if (error !== 'cancel') ElMessage.error(`删除失败: ${error.message || '未知错误'}`)
    })
}

const handleAddAsset = () => {
  router.push({ name: 'AssetForm' }).catch((err) => {
    ElMessage.error(`跳转失败: ${err.message || '未知错误'}`)
  })
}

const handleBatchImport = () => {
  router.push({ name: 'AssetBatchImport' }).catch((err) => {
    ElMessage.error(`跳转失败: ${err.message || '未知错误'}`)
  })
}

// ===== Excel 导出 =====
const { exportList } = useExcelExport()

const handleExportExcel = async () => {
  await exportList({
    entityName: '资产',
    columns: exportColumns,
    currentData: assetStore.list,
    totalCount: assetStore.pagination.total,
    fetchAllData: async () =>
      assetStore.getList({ page: 1, page_size: assetStore.pagination.total }),
    sheetName: '资产列表',
  })
}

// ===== 批量删除 =====
const handleBatchDelete = async (rows: AssetDetail[] | undefined) => {
  if (!rows || rows.length === 0) {
    ElMessage.warning('请先选择要删除的数据')
    return
  }
  // 【双约定】batch-delete 端点显式按 asset_code 处理（asset_view.py:357-367：
  // filter(asset_code__in=ids) 并按 asset_code 做 RBAC 范围校验），勿统一为 recordcode。
  const codes = rows.map((row) => row.asset_code).filter((code): code is string => !!code)
  if (codes.length === 0) {
    ElMessage.error('无法删除：选中的数据缺少资产编码')
    return
  }
  try {
    await ElMessageBox.confirm(
      `确定要删除选中的 ${codes.length} 条数据吗？删除后数据不可恢复！`,
      '批量删除确认',
      {
        confirmButtonText: '确定删除',
        cancelButtonText: '取消',
        type: 'warning',
      },
    )
    await assetStore.removeBatch(codes)
    smartListRef.value?.clearSelection()
    await smartListRef.value?.refresh()
  } catch (err) {
    if (err === 'cancel') return
    console.error('批量删除失败:', err)
    ElMessage.error('批量删除失败，请重试')
  }
}

const handleMaskBack = () => {
  router.go(-1)
}
</script>

<style lang="scss" scoped>
@use '@/assets/styles/common-forms.scss' as *;

.asset-details-root {
  @include list-container;
  .table-container {
    @include table-container;
  }
  .bottom-buttons {
    @include bottom-buttons;
  }
  .router-mask-container {
    @include router-mask-container;
    .mask {
      @include mask;
    }
    .child-router-container {
      @include child-router-container;
    }
  }
}
@include responsive-design;
</style>
