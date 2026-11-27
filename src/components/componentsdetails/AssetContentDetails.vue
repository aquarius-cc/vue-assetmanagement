<!--
@file 资产列表管理页面，展示所有资产信息并支持增删改查操作
@component AssetContentDetails
@usedBy
  - views/AssetDetails.vue: 通过 router-view 渲染资产列表
@dependsOn
  - composables/useAssetListConfig: 资产列表配置（分页、搜索、导出列）
  - composables/useServerExcelExport: 服务端流式导出（P2-04 导出全部）
  - utils/excelExporter: 客户端导出当前页
  - constants/assetGroupedFilters: 分组筛选键映射单一来源（9 键白名单）
  - stores/assetStore: 资产数据管理
  - components/commoncomponents/SmartListContainer: 数据管理容器
  - components/commoncomponents/CommonList: 列表展示组件
  - components/commoncomponents/StatusTag: 状态标签组件
-->
<template>
  <div class="asset-details-root">
    <SearchBar
      v-show="!isChildRouteActive"
      :fields="activeSearchFields"
      :initial-values="initialSearchValues"
      @search="handleSearch"
      @reset="handleSearchReset"
    />

    <div class="table-container">
      <template v-if="enableGrouping">
        <GroupedAssetTable
          ref="groupedTableRef"
          :detail-columns="columns"
          :initial-snapshot="initialSnapshot"
          :batch-deleting="isGroupDeleting"
          @delete-group="handleDeleteGroup"
          @child-edit="handleEdit"
          @child-delete="handleDelete"
          @child-detail="handleDetail"
        >
          <template #asset_current_status="{ row }">
            <StatusTag v-if="row.asset_current_status" :status="row.asset_current_status" />
            <span v-else class="status-empty">—</span>
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
        v-show="!isChildRouteActive"
        ref="smartListRef"
        :store-config="storeConfig"
        :auto-load="!isChildRouteActive"
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
            :enable-edit="canOperateAsset"
            :enable-delete="canOperateAsset"
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
              <StatusTag v-if="row.asset_current_status" :status="row.asset_current_status" />
              <span v-else class="status-empty">—</span>
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
            <el-button v-if="canOperateAsset" type="success" @click="handleAddAsset"
              >新增资产</el-button
            >
            <el-button v-if="canOperateAsset" type="primary" @click="handleBatchImport"
              >批量导入</el-button
            >
            <el-button type="primary" @click="handleExportExcel">导出Excel</el-button>
            <!-- 批量删除为写入操作；导出对 auditor 开放，不加权限门禁 -->
            <el-button
              v-if="canOperateAsset"
              type="danger"
              :disabled="slotProps.selectedRows?.length === 0"
              :loading="isBatchDeleting"
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
import { useRouter, useRoute, onBeforeRouteLeave } from 'vue-router'
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
import { usePermission } from '@/composables/usePermission'
import type { AssetDetail, AssetGroupQueryParams, AssetGroupSummary } from '@/types/asset'
import { fromGroupedFilters, toGroupedFilters } from '@/constants/assetGroupedFilters'
import { useGroupedAssetSession, type GroupedPageSnapshot } from '@/stores/groupedAssetSession'
import { logError } from '@/utils/logger'
import { notifyCallerError } from '@/utils/errorHandler'
import { readReactive } from '@/utils/reactiveAccess'
import { useServerExcelExport } from '@/composables/useServerExcelExport'
import { useEntityBatchDelete } from '@/composables/useEntityBatchDelete'
import { useAssetDetailHandoff } from '@/composables/useAssetDetailHandoff'
import { exportToExcel } from '@/utils/excelExporter'
import { assetExportExcel } from '@/stores/assetStore'

/** 分组展开表格对外暴露的方法（`defineExpose` 形态） */
interface GroupedAssetTableExpose {
  search: (filters?: AssetGroupQueryParams) => Promise<void>
  refresh: () => Promise<void>
  captureSession: () => Omit<GroupedPageSnapshot, 'filters'>
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

/**
 * [R-3/M-RC-07] 写入类操作门禁（新增/批量导入/批量删除/行内编辑删除）。
 * 与路由 meta.requiredMinRole 同为纯角色层级口径（≥ asset_admin），避免菜单藏了 URL 却能进。
 */
const { canOperateAsset } = usePermission()

/** 搜索栏字段集随模式切换：平铺 8 项 / 分组 9 项（值空间不同，见 useAssetListConfig） */
const activeSearchFields = computed(() =>
  props.enableGrouping ? groupedSearchFields.value : searchFields.value,
)

const smartListRef = ref<SmartListContainerExpose | null>(null)
const groupedTableRef = ref<GroupedAssetTableExpose | null>(null)
const isChildRouteActive = ref(false)

// ===== 分组页会话（BF-078 需求3）=====
const session = useGroupedAssetSession()

/**
 * 水合入口：setup 期读取，非空即作为 prop 传给 GroupedAssetTable（onMounted 消费）。
 * 仅分组落点（enableGrouping=true）可消费——分组→表单直跳时新实例以平铺模式挂载、
 * GAT 不渲染，若此时摘旗则快照无人接手（BF-078 目验二轮修正）；
 * 平铺挂载只读不摘，留待返回分组页再水合。
 * 摘旗后快照本体留 store 供排障，出子树时由 guards afterEach 清空。
 */
const initialSnapshot =
  props.enableGrouping && session.pendingRestore && session.snapshot ? session.snapshot : null
if (initialSnapshot) session.clearPending()

/** 分组模式当前生效筛选（SearchBar → toGroupedFilters 产出，离开时随快照保存）
 *  二次往返防线：由快照继承筛选，否则再次离开会把已恢复筛选写成空 */
const lastGroupedFilters = ref<AssetGroupQueryParams>({ ...(initialSnapshot?.filters ?? {}) })

/**
 * SearchBar 一次性水合载荷（setup 期常量，引用稳定）。
 * 依赖 AssetDetails.vue 的 childViewKey 在 grouped ↔ detail 切换时重挂；
 * 若未来去掉重挂，需另设显式回填入口（如重新暴露 setSearchParams）或监听恢复旗。
 */
const initialSearchValues = initialSnapshot ? fromGroupedFilters(initialSnapshot.filters) : null

/**
 * 快照保存：分组模式离开本路由记录时（grouped ↔ form/detail 为兄弟记录，必触发本钩子）。
 * 落点存废由 guards afterEach 按 `/main/assetdetails` 前缀裁决：子树内保留、出子树清空。
 * 平铺实例 enableGrouping=false 且无 groupedTableRef，直接跳过。
 */
onBeforeRouteLeave(() => {
  if (!props.enableGrouping || !groupedTableRef.value) return
  session.save({
    filters: { ...lastGroupedFilters.value },
    ...groupedTableRef.value.captureSession(),
  })
})

// ===== 刷新 Flag 监听（BF-083：分组路径缺失 refreshFlag 接驳）=====
// 分组模式：保存成功后 AssetForm 置 true → usePaginationSearch watch → refreshCurrentPage（平铺路径已接通）。
// 分组路径 GroupedAssetTable 独有：此处显式监听 refreshFlag，避免保存返回后不刷新。
if (props.enableGrouping) {
  let isRefreshing = false
  watch(
    () => readReactive<boolean>(storeConfig.store.refreshFlag!),
    async (flag) => {
      if (!flag || isRefreshing) return
      isRefreshing = true
      try {
        await groupedTableRef.value?.refresh()
      } catch (e) {
        logError('components/AssetContentDetails', '[refreshFlag watch] refresh failed:', e)
      } finally {
        isRefreshing = false
        // 复位 flag（与 usePaginationSearch finally 对称）：分组模式 SmartListContainer
        // 不挂载、平铺复位路径不触发；不复位则第二次保存同值赋值不触发 watch，分组表不再刷新。
        storeConfig.store.setRefreshFlag?.(false)
      }
    },
    { immediate: false },
  )
}

// ===== 辅助函数 =====
const getContractCode = (contract: unknown): string => {
  if (typeof contract === 'object' && contract !== null && 'contract_code' in contract) {
    return String((contract as { contract_code: string }).contract_code || '-')
  }
  return typeof contract === 'string' ? contract || '-' : '-'
}

// ===== 表格列配置 =====
const columns: TableColumn[] = [
  { type: 'index', label: '序号', width: 80, align: 'center', fixed: 'left' },
  { prop: 'recordcode', label: '唯一记录码', width: 150, align: 'center', fixed: 'left' },
  { prop: 'asset_code', label: '编码', width: 180, align: 'center', fixed: 'left' },
  { prop: 'asset_name', label: '名称', width: 180, align: 'left', fixed: 'left' },
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
// 【分组模式筛选映射】键集单一来源已上移至 constants/assetGroupedFilters（toGroupedFilters），
// 本文件直接复用，不在组件内重复列举第二份白名单（DR-1）。
const handleSearch = (params: Record<string, string>) => {
  if (groupedTableRef.value) {
    const filters = toGroupedFilters(params)
    lastGroupedFilters.value = filters
    void groupedTableRef.value.search(filters)
    return
  }
  // [M-2] 用户触发的搜索必须从第 1 页开始（searchWithReset = 置1 + performSearchWithParams）
  void smartListRef.value?.searchWithReset(params)
}

const handleSearchReset = () => {
  if (groupedTableRef.value) {
    lastGroupedFilters.value = {}
    void groupedTableRef.value.search()
    return
  }
  void smartListRef.value?.reset()
}

/** 分组模式删除：组内跨合同/分类，不存在「编辑组」语义，故仅提供组内批量删除
 *  [M-FE-02] 委托 useEntityBatchDelete 单源（连点守卫 + 语义逐字保留：
 *  取键 asset_codes、组内件数文案、cancel+close 双取消值、成功提示「删除成功」） */
const { handleBatchDelete: runGroupDelete, isBatchDeleting: isGroupDeleting } =
  useEntityBatchDelete<AssetGroupSummary>({
    getIds: (rows) => rows.flatMap((row) => row.asset_codes),
    emptySelectionMessage: null,
    missingIdMessage: null,
    confirmMessage: (rows) =>
      `确认删除「${rows[0]?.asset_name || '-'}」组内 ${rows[0]?.asset_count} 条资产？`,
    confirmTitle: '删除确认',
    confirmButtonText: '确认删除',
    cancelButtonText: '取消',
    cancelValues: ['cancel', 'close'],
    removeBatch: (codes) => assetStore.removeBatch(codes),
    onSuccess: () => {
      ElMessage.success('删除成功')
    },
    refresh: () => groupedTableRef.value?.refresh(),
    onError: (error) => {
      logError('components/AssetContentDetails', '[分组删除]', error)
      // [M-RC-09] 单出口：AxiosError 由拦截器已提示，仅非 AxiosError 弹一次
      notifyCallerError(error, '删除失败')
    },
  })

const handleDeleteGroup = (row: AssetGroupSummary) => runGroupDelete([row])

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
/** 一次性交接：仅分组子行（AssetDetailSerializer 完整字段）可 seed；平铺行字段不完整，刻意不 seed */
const handoff = useAssetDetailHandoff()
const seedGroupRow = (row: AssetDetail): void => {
  if (props.enableGrouping) handoff.seed(row)
}
const clearGroupRow = (recordcode: string): void => {
  if (props.enableGrouping) handoff.clear(recordcode)
}

const handleEdit = (row: AssetDetail) => {
  if (!row.recordcode) {
    ElMessage.error('记录编码不存在，无法编辑')
    return
  }
  const code = row.recordcode
  seedGroupRow(row)
  router
    .push({ name: 'AssetForm', query: { code } })
    .then((failure) => {
      if (failure) clearGroupRow(code)
    })
    .catch((err) => {
      clearGroupRow(code)
      ElMessage.error(`跳转失败: ${err.message || '未知错误'}`)
    })
}

/** 分组子行「详细」：与平铺页 CommonListActions 的 detail-route-name='BasicAssetDetails' 同契约 */
const handleDetail = (row: AssetDetail) => {
  if (!row.recordcode) {
    ElMessage.error('记录编码不存在，无法查看详情')
    return
  }
  const code = row.recordcode
  seedGroupRow(row)
  router
    .push({ name: 'BasicAssetDetails', query: { code } })
    .then((failure) => {
      if (failure) clearGroupRow(code)
    })
    .catch((err) => {
      clearGroupRow(code)
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
      // 分组模式刷新分组表格（goToChildPage 覆盖式分页），平铺模式刷新通用列表
      if (props.enableGrouping) {
        groupedTableRef.value?.refresh()
      } else {
        smartListRef.value?.refresh()
      }
    })
    .catch((error) => {
      // [M-RC-09] 单出口：AxiosError 由拦截器已提示，仅非 AxiosError 弹一次
      if (error !== 'cancel') notifyCallerError(error, '删除失败')
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
const { exportFromServer } = useServerExcelExport()

const handleExportExcel = async () => {
  // P2-04: 「导出全部」迁服务端流式导出(修复 page_size=total 被 MAX_PAGE_SIZE=100 截断)。
  let range: 'current' | 'all' | null = null
  try {
    await ElMessageBox.confirm(
      `当前页面 ${assetStore.list.length} 条，总共 资产 ${assetStore.pagination.total} 条。请选择：`,
      '导出范围',
      {
        confirmButtonText: '导出当前页',
        cancelButtonText: '导出全部',
        distinguishCancelAndClose: true,
      },
    )
    range = 'current'
  } catch (err) {
    if (err === 'cancel') range = 'all'
    else return
  }

  if (range === 'current') {
    await exportToExcel({
      data: assetStore.list,
      columns: exportColumns,
      fileName: `资产列表_当前页面_${assetStore.list.length}条.xlsx`,
      sheetName: '资产列表',
      confirmMessage: `确定要导出 ${assetStore.list.length} 条资产数据吗？`,
      emptyMessage: '暂无资产数据可导出',
      successMessage: '资产数据导出成功',
      errorMessage: '资产数据导出失败，请重试',
    })
    return
  }

  if (range === 'all') {
    await exportFromServer({
      entityName: '资产',
      totalCount: assetStore.pagination.total,
      fetchExport: (params) => assetExportExcel(params),
      params: {},
    })
  }
}

// ===== 批量删除 =====
// [M-FE-02] 委托 useEntityBatchDelete 单源（连点守卫 + 语义逐字保留：
// 【双约定】batch-delete 端点显式按 asset_code 处理（asset_view.py:357-367：
// filter(asset_code__in=ids) 并按 asset_code 做 RBAC 范围校验），勿统一为 recordcode。
const { handleBatchDelete, isBatchDeleting } = useEntityBatchDelete<AssetDetail>({
  getIds: (rows) => rows.map((row) => row.asset_code).filter((code): code is string => !!code),
  missingIdMessage: '无法删除：选中的数据缺少资产编码',
  removeBatch: (codes) => assetStore.removeBatch(codes),
  clearSelection: () => smartListRef.value?.clearSelection(),
  refresh: () => smartListRef.value?.refresh(),
  logTag: 'components/componentsdetails/AssetContentDetails',
})

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
