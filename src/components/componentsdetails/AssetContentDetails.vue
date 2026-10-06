<!--
@file 资产列表管理页面，展示所有资产信息并支持增删改查操作
@component AssetContentDetails
@usedBy
  - views/AssetDetails.vue: 通过 router-view 渲染资产列表
@dependsOn
  - composables/useAssetListConfig: 资产列表配置（分页、搜索、导出列）
  - composables/useExcelExport: Excel导出功能
  - constants/assetGroupedFilters: 分组筛选键映射单一来源（9 键白名单）
  - stores/assetStore: 资产数据管理
  - components/commoncomponents/SmartListContainer: 数据管理容器
  - components/commoncomponents/CommonList: 列表展示组件
  - components/commoncomponents/StatusTag: 状态标签组件
-->
<template>
  <div class="asset-details-root">
    <SearchBar
      ref="searchBarRef"
      :fields="activeSearchFields"
      @search="handleSearch"
      @reset="handleSearchReset"
    />

    <div class="table-container">
      <template v-if="enableGrouping">
        <GroupedAssetTable
          ref="groupedTableRef"
          :detail-columns="columns"
          @delete-group="handleDeleteGroup"
        >
          <template #asset_current_status="{ row }">
            <StatusTag :status="row.asset_current_status" />
          </template>

          <template #asset_type_name="{ row }">
            <!-- 【A-9】数据源为 AssetListSerializer 反规范输出的 asset_type_name（分类名称） -->
            <AssetTypeTag :type-name="row.asset_type_name" />
          </template>

          <template #contract_code="{ row }">
            <span>{{ getContractCode(row.contract_code || '') }}</span>
          </template>

          <!-- 【D-2】实物数量 = 渲染常数 1，与行数据无关 -->
          <template #physical_quantity>
            <span>1</span>
          </template>
        </GroupedAssetTable>
      </template>

      <SmartListContainer
        v-else
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
              <AssetTypeTag :type-name="row.asset_type_name" />
            </template>

            <template #contract_code="{ row }">
              <span>{{ getContractCode(row.contract_code || '') }}</span>
            </template>

            <!-- 【D-2】实物数量 = 渲染常数 1，与行数据无关 -->
            <template #physical_quantity>
              <span>1</span>
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

import { computed, ref, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import SmartListContainer from '@/components/commoncomponents/SmartListContainer.vue'
import CommonList from '@/components/commoncomponents/CommonList.vue'
import GroupedAssetTable from '@/components/GroupedAssetTable.vue'
import AssetTypeTag from '@/components/commoncomponents/AssetTypeTag.vue'
import SearchBar from '@/components/commoncomponents/SearchBar.vue'
import StatusTag from '@/components/commoncomponents/StatusTag.vue'
import type { TableColumn } from '@/types/list'
import type { SmartListContainerExpose } from '@/types/common'
import { useAssetListConfig } from '@/composables/useAssetListConfig'
import { useExcelExport } from '@/composables/useExcelExport'
import type { AssetDetail, AssetGroupQueryParams, AssetGroupSummary } from '@/types/asset'
import { GROUPED_FILTER_KEY_MAP } from '@/constants/assetGroupedFilters'
import { logError } from '@/utils/logger'

/** 分组展开表格对外暴露的方法（`defineExpose` 形态） */
interface GroupedAssetTableExpose {
  search: (filters?: AssetGroupQueryParams) => Promise<void>
  refresh: () => Promise<void>
}

/**
 * 组件属性
 *
 * @property enableGrouping 分组展开模式开关，**默认 false**。
 *   false → 既有平铺列表（`SmartListContainer` + `CommonList`）路径，分组相关代码零执行；
 *   true  → `GroupedAssetTable` 汇总/明细双层结构，搜索栏切换为分组字段集（9 项）。
 */
interface Props {
  enableGrouping?: boolean
}

const props = withDefaults(defineProps<Props>(), { enableGrouping: false })

const router = useRouter()
const route = useRoute()
const { searchFields, groupedSearchFields, storeConfig, exportColumns, assetStore } =
  useAssetListConfig({
    enableGrouping: props.enableGrouping,
  })

/** 搜索栏字段集随模式切换：平铺 8 项 / 分组 9 项（值空间不同，见 useAssetListConfig） */
const activeSearchFields = computed(() =>
  props.enableGrouping ? groupedSearchFields.value : searchFields.value,
)

const smartListRef = ref<SmartListContainerExpose | null>(null)
const groupedTableRef = ref<GroupedAssetTableExpose | null>(null)
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
  { prop: 'asset_purchase_price', label: '单价', width: 120, align: 'right' },
  // 【D-2 数量语义】「实物数量」是渲染常数 1，**刻意不绑 asset_purchase_number**：
  // create 一次录入 N 台会 fan-out 成 N 条记录、每条实物台数恒为 1（后端 W-2 落库恒 1）。
  // 若绑字段，录入 3 台会每行显 3，看起来像 9 台实物 —— 比不显示更糟。
  {
    type: 'custom',
    prop: 'physical_quantity',
    label: '实物数量',
    width: 110,
    align: 'center',
    slotName: 'physical_quantity',
  },
]

// ===== 搜索栏事件 =====
// 【分组模式筛选映射】SearchBar 的字段集已按 `enableGrouping` 切换，但键名到分组端点
// 参数名的映射仍需在此收敛：键集单一来源是 `GROUPED_FILTER_KEY_MAP`（9 键同名透传 +
// `asset_contract → contract_code` 唯一改名键），**不重复列举第二份白名单**（DR-1）。
//
// 未在映射表内的键**刻意丢弃**：透传后端不认的键会被 DRF 静默忽略（无报错、筛选
// 无声失效）；`contract_code` 另有一层含义——它已编码进 `group_key` 首元素，误传会
// 与组键取交集得空集（R-1，故组内明细端点不声明该参数）。
const toGroupedFilters = (params: Record<string, string>): AssetGroupQueryParams => {
  const filters: Record<string, string> = {}
  Object.entries(GROUPED_FILTER_KEY_MAP).forEach(([from, to]) => {
    const value = params[from]
    if (value) filters[to] = value
  })
  return filters as AssetGroupQueryParams
}

const handleSearch = (params: Record<string, string>) => {
  if (groupedTableRef.value) {
    void groupedTableRef.value.search(toGroupedFilters(params))
    return
  }
  smartListRef.value?.searchWithParams(params)
}

const handleSearchReset = () => {
  if (groupedTableRef.value) {
    void groupedTableRef.value.search()
    return
  }
  smartListRef.value?.reset()
}

/** 分组模式删除：组内跨合同/分类，不存在「编辑组」语义，故仅提供组内批量删除 */
const handleDeleteGroup = async (row: AssetGroupSummary) => {
  try {
    await ElMessageBox.confirm(
      `确认删除「${row.asset_name || '-'}」组内 ${row.asset_count} 条资产？`,
      '删除确认',
      { type: 'warning', confirmButtonText: '确认删除', cancelButtonText: '取消' },
    )
    await assetStore.removeBatch(row.asset_codes)
    ElMessage.success('删除成功')
    await groupedTableRef.value?.refresh()
  } catch (error) {
    if (error === 'cancel' || error === 'close') return
    logError('components/AssetContentDetails', '[分组删除]', error)
    ElMessage.error('删除失败')
  }
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
    logError('components/componentsdetails/AssetContentDetails', '批量删除失败:', err)
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
