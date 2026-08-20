<!--
@file 已报废资产列表页面，展示已报废资产记录并支持删除和导出操作
@component WasteAssetDetails
@usedBy
  - views/WasteAssetDetails.vue: 通过 router-view 渲染已报废资产列表
@dependsOn
  - composables/useSmartListConfig: 列表配置
  - stores/wasteAssetStore: 已报废资产数据管理
  - components/commoncomponents/SmartListContainer: 数据管理容器
  - components/commoncomponents/CommonList: 列表展示组件
-->
<template>
  <div class="waste-asset-details-root">
    <!--
      表格容器
      使用 SmartListContainer 管理数据，通过 slot 将数据传递给 CommonList
    -->
    <div class="table-container">
      <SmartListContainer
        ref="smartListRef"
        :store-config="storeConfig"
        :auto-load="true"
        :initial-page="1"
        :initial-page-size="20"
      >
        <!--
          slot 接收 SmartListContainer 传递的数据管理状态
          包括：data, loading, currentPage, pageSize, total, search 等
        -->
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
            :detail-route-name="'WasteAssetBasicDetails'"
            :show-detail-button="true"
            :show-actions="false"
            :enable-edit="false"
            :enable-delete="false"
            :enable-selection="true"
            :show-pagination="true"
            :page-size-options="slotProps.pageSizeOptions"
            @size-change="slotProps.handleSizeChange"
            @current-change="slotProps.handleCurrentChange"
            @search="slotProps.performSearch"
            @selection-change="slotProps.handleSelectionChange"
          >
            <!-- 报废日期列自定义渲染 -->
            <template #waste_asset_date="{ row }">
              {{ formatDate(row.waste_asset_date) }}
            </template>
          </CommonList>

          <!-- 底部按钮组（只读模块，仅导出 Excel） -->
          <div class="bottom-buttons">
            <el-button type="primary" @click="handleExportExcel">导出Excel</el-button>
            <!-- 批量删除按钮：当选中数据时可用 -->
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

    <!-- 子路由遮罩容器 -->
    <div v-if="isChildRouteActive" class="router-mask-container">
      <div class="mask" @click="handleMaskBack"></div>
      <div class="child-router-container">
        <router-view />
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
defineOptions({ name: 'WasteAssetDetails' })

// ===== 导入顺序：Vue 核心 → 第三方库 → @/ 内部模块 =====
import { ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import SmartListContainer from '@/components/commoncomponents/SmartListContainer.vue'
import CommonList from '@/components/commoncomponents/CommonList.vue'
import type { TableColumn } from '@/types/list'
import { useSmartListConfig } from '@/composables/useSmartListConfig'
import type { ColumnConfig } from '@/utils/excelExporter'
import { exportToExcel } from '@/utils/excelExporter'
import type { WasteAsset } from '@/types/wasteasset'
import { useWasteAssetStore } from '@/stores/wasteAssetStore'
import { formatDate } from '@/utils/Format'
import type { SmartListContainerExpose } from '@/types/common'

// ===== 状态与实例 =====
const wasteAssetStore = useWasteAssetStore()
const route = useRoute()
const router = useRouter()

/**
 * SmartListContainer 组件引用
 * 用于调用容器暴露的方法（如 refresh、reset）
 *
 * 注意：SmartListContainer 是泛型组件，使用 ComponentPublicInstance 获取公共实例类型
 * 通过类型断言访问 expose 的方法
 */
const smartListRef = ref<SmartListContainerExpose | null>(null)

/**
 * 子路由激活状态
 * 用于控制子路由遮罩层的显示
 */
const isChildRouteActive = ref(false)

// ===== 表格列配置 =====
/**
 * 表格列定义
 * 每一列的渲染方式、标题、宽度等属性
 */
const columns: TableColumn[] = [
  { type: 'index', label: '序号', width: 60, align: 'center' },
  { prop: 'waste_asset_code', label: '已报废资产编码', width: 150, align: 'center' },
  { prop: 'asset_name', label: '资产名称', width: 150, align: 'left' },
  { prop: 'asset_specification', label: '规格型号', width: 100, align: 'center' },
  { prop: 'contract_name', label: '合同名称', width: 150, align: 'left' },
  { prop: 'waste_asset_number', label: '已报废数量', width: 100, align: 'center' },
  {
    type: 'custom',
    prop: 'waste_asset_date',
    label: '报废日期',
    width: 120,
    align: 'center',
    slotName: 'waste_asset_date',
  },
  { prop: 'waste_asset_description', label: '报废描述', width: 200, align: 'left' },
]

// ===== SmartListContainer 配置 =====
/**
 * Store 配置对象
 * 传递给 SmartListContainer 用于数据管理
 *
 * 包含：
 * - getList: 获取列表数据的方法
 * - pagination: 分页状态（使用 getter/setter 实现双向绑定）
 * - list: 列表数据（computed）
 * - loading: 加载状态（computed）
 * - search: 搜索配置
 */
const storeConfig = useSmartListConfig<WasteAsset>({
  store: wasteAssetStore,
  entityName: '已报废资产',
})

// ===== 路由监听：控制子路由遮罩 =====
/**
 * 监听路由变化，判断是否需要显示子路由遮罩层
 * 当访问子路由（如详情页）时显示遮罩
 */
watch(
  () => route.matched,
  (matched) => {
    const hasParent = matched.some((item) => item.name === 'WasteAssetDetails')
    const isSelfTop = matched[matched.length - 1]?.name === 'WasteAssetDetails'
    isChildRouteActive.value = hasParent && !isSelfTop
  },
  { immediate: true },
)

// ===== 导出 Excel =====
/**
 * 导出 Excel
 * 支持导出当前页或全部数据
 *
 * 业务说明：
 * - 已报废资产记录由后端在审批通过后自动创建
 * - 前端只提供导出功能，无增删改操作
 */
const handleExportExcel = async () => {
  const exportColumns: ColumnConfig<WasteAsset>[] = [
    { title: '已报废资产编码', key: 'waste_asset_code', default: '' },
    { title: '资产名称', key: 'asset_name', default: '' },
    { title: '规格型号', key: 'waste_asset_specification', default: '' },
    { title: '合同名称', key: 'contract_name', default: '' },
    {
      title: '已报废数量',
      key: 'waste_asset_number',
      default: '1',
      formatter: (val) => String(val),
    },
    {
      title: '报废日期',
      key: 'waste_asset_date',
      default: '',
      formatter: (val) => formatDate(val as string | Date | null) || '',
    },
    { title: '报废描述', key: 'waste_asset_description', default: '' },
  ]

  let range: 'current' | 'all' | null = null
  try {
    await ElMessageBox.confirm(
      `当前页面 ${wasteAssetStore.list.length} 条，总共 ${wasteAssetStore.pagination.total} 条。请选择：`,
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

  let exportData: WasteAsset[] = []
  let fileName = ''

  if (range === 'current') {
    exportData = wasteAssetStore.list
    fileName = `已报废资产列表_当前页面_${wasteAssetStore.list.length}条.xlsx`
  } else if (range === 'all') {
    ElMessage.info('正在准备全部数据，请稍候...')
    if (wasteAssetStore.pagination.total > 1000) {
      const confirm = await ElMessageBox.confirm(
        '数据量较大，导出可能需要一些时间，是否继续？',
        '导出确认',
        { confirmButtonText: '继续', cancelButtonText: '取消', type: 'warning' },
      ).catch(() => false)
      if (!confirm) return
    }
    try {
      const allData = await wasteAssetStore.getList({
        page: 1,
        page_size: wasteAssetStore.pagination.total,
      })
      exportData = allData
      fileName = `已报废资产列表_全部_${allData.length}条.xlsx`
    } catch (error) {
      console.error('导出全部数据失败:', error)
      ElMessage.error('获取全部数据失败，请重试')
      return
    }
  } else {
    return
  }

  await exportToExcel({
    data: exportData,
    columns: exportColumns,
    fileName,
    sheetName: '已报废资产列表',
    confirmMessage: `确定要导出 ${exportData.length} 条已报废资产数据吗？`,
    emptyMessage: '暂无已报废资产数据可导出',
    successMessage: '已报废资产数据导出成功',
    errorMessage: '已报废资产数据导出失败，请重试',
  })
}

/**
 * 批量删除
 * 弹出确认框，确认后调用 store.removeBatch 执行批量删除
 * @param rows 选中的行数据
 */
const handleBatchDelete = async (rows: WasteAsset[] | undefined) => {
  if (!rows || rows.length === 0) {
    ElMessage.warning('请先选择要删除的数据')
    return
  }

  // 提取选中的唯一标识字段（根据实体类型调整字段名）
  const codes = rows.map((row) => row.waste_asset_code).filter((code): code is string => !!code)

  if (codes.length === 0) {
    ElMessage.error('无法删除：选中的数据缺少唯一标识')
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

    await wasteAssetStore.removeBatch(codes)
    smartListRef.value?.clearSelection()
    await smartListRef.value?.refresh()
  } catch (err) {
    if (err === 'cancel') return
    console.error('批量删除失败:', err)
    ElMessage.error('批量删除失败，请重试')
  }
}

/**
 * 遮罩层点击返回
 * 点击遮罩层时返回上一页
 */
const handleMaskBack = () => {
  router.go(-1)
}
</script>

<style lang="scss" scoped>
@use '@/assets/styles/common-forms.scss' as *;

.waste-asset-details-root {
  @include list-container;
}

.table-container {
  @include table-container;

  :deep(.el-table__header th.el-table__cell) {
    text-align: center !important;
    white-space: normal !important;
    word-break: break-word !important;
    padding: 16px 12px !important;
  }

  :deep(.el-table__body td.el-table__cell) {
    text-align: center !important;
    white-space: normal !important;
    word-break: break-word !important;
    padding: 12px 8px !important;
  }
}

.bottom-buttons {
  @include bottom-buttons;
}

.router-mask-container {
  @include router-mask-container;
}

.mask {
  @include mask;
}

.child-router-container {
  @include child-router-container;
}

@include responsive-design;
</style>
