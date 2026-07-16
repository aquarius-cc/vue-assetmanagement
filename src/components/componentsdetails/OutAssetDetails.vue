<!--
  OutAssetDetails.vue
  出库资产列表页面（重构版）

  架构调整：
  1. 使用 SmartListContainer 封装数据管理逻辑（分页、搜索、加载）
  2. CommonList 只负责 UI 展示，不管理数据
  3. 解决原架构中父组件和 CommonList 重复请求的问题

  数据流：
  SmartListContainer (数据管理) → slot props → CommonList (纯展示)

  功能：
  - 展示出库资产列表
  - 新增出库、编辑出库、删除出库（带确认弹窗）
  - 批量导入、导出 Excel
  - 子路由：新增/编辑出库表单（浮层遮罩）
-->
<template>
  <div class="outasset-details-root">
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
            :detail-route-name="'OutAssetBasicDetails'"
            :show-detail-button="true"
            :show-actions="true"
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
            <!-- 出库类型列自定义渲染 -->
            <template #outasset_type="{ row }">
              {{ outassetTypeMapping[row.outasset_type] || 'N/A' }}
            </template>

            <!-- 出库日期列自定义渲染 -->
            <template #outasset_date="{ row }">
              {{ formatDate(row.outasset_date) }}
            </template>

            <!-- 资产状态列自定义渲染 -->
            <template #outasset_current_status="{ row }">
              <StatusTag :status="row.outasset_current_status || ''" map-type="outasset" />
            </template>
          </CommonList>

          <!-- 底部按钮组 -->
          <div class="bottom-buttons">
            <el-button type="success" @click="handleAddOutAsset">新增出库</el-button>
            <el-button type="primary" @click="handleBatchImport">批量导入</el-button>
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

<script lang="ts">
/**
 * 组件名称定义
 */
export default {
  name: 'OutAssetDetails',
}
</script>

<script lang="ts" setup>
// ===== 导入顺序：Vue 核心 → 第三方库 → @/ 内部模块 =====
import { ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import SmartListContainer from '@/components/commoncomponents/SmartListContainer.vue'
import CommonList from '@/components/commoncomponents/CommonList.vue'
import StatusTag from '@/components/commoncomponents/StatusTag.vue'
import type { TableColumn } from '@/components/commoncomponents/CommonList.vue'
import { useSmartListConfig } from '@/composables/useSmartListConfig'
import type { ColumnConfig } from '@/utils/excelExporter'
import { exportToExcel } from '@/utils/excelExporter'
import type { OutAsset, OutAssetDetail } from '@/utils/OutAsset'
import { useOutAssetStore } from '@/stores/outAssetStore'
import { formatDate, outassetTypeMapping } from '@/utils/Format'
import type { SmartListContainerExpose } from '@/types/common'

// ===== 状态与实例 =====
const outAssetStore = useOutAssetStore()
const route = useRoute()
const router = useRouter()

/**
 * SmartListContainer 组件引用
 * 用于调用容器暴露的方法（如 refresh、reset）
 * 使用 SmartListContainerExpose 类型确保类型安全
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
  {
    type: 'custom',
    prop: 'outasset_current_status',
    label: '资产状态',
    width: 120,
    align: 'center',
    slotName: 'outasset_current_status',
  },
  { prop: 'recordcode', label: '出库标识码', width: 150, align: 'center' },
  { prop: 'asset_recordcode', label: '入库标识码', width: 150, align: 'center' },
  { prop: 'asset_code', label: '资产码', width: 150, align: 'center' },
  { prop: 'asset_name', label: '资产名称', width: 150, align: 'left' },
  { prop: 'asset_specification', label: '规格型号', width: 120, align: 'left' },
  { prop: 'contract_code', label: '合同码', width: 150, align: 'center' },
  { prop: 'outasset_applicant_name', label: '申请人姓名', width: 120, align: 'center' },
  { prop: 'outasset_manager_name', label: '保管人姓名', width: 120, align: 'center' },
  { prop: 'using_location', label: '使用位置', width: 150, align: 'left' },
  {
    type: 'custom',
    prop: 'outasset_type',
    label: '出库类型',
    width: 120,
    align: 'center',
    slotName: 'outasset_type',
  },
  {
    type: 'custom',
    prop: 'outasset_date',
    label: '出库日期',
    width: 120,
    align: 'center',
    slotName: 'outasset_date',
  },
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
const storeConfig = useSmartListConfig<OutAssetDetail>({
  store: outAssetStore,
  entityName: '出库记录',
})

// ===== 路由监听：控制子路由遮罩 =====
/**
 * 监听路由变化，判断是否需要显示子路由遮罩层
 * 当访问子路由（如新增/编辑页）时显示遮罩
 */
watch(
  () => route.matched,
  (matched) => {
    const hasParent = matched.some((item) => item.name === 'OutAssetDetails')
    const isSelfTop = matched[matched.length - 1]?.name === 'OutAssetDetails'
    isChildRouteActive.value = hasParent && !isSelfTop
  },
  { immediate: true },
)

// ===== 事件处理 =====

/**
 * 编辑出库记录
 * @param row 待编辑的行数据
 */
const handleEdit = (row: OutAsset) => {
  if (!row.recordcode) {
    ElMessage.error('出库唯一标识码不存在，无法编辑')
    return
  }
  router.push({ name: 'OutAssetForm', query: { code: row.recordcode } }).catch((err) => {
    console.error('编辑跳转失败:', err)
    ElMessage.error('跳转编辑页失败，请重试')
  })
}

/**
 * 删除出库记录
 * 【优化】添加二次确认弹窗，防止误删
 * @param row 待删除的行数据
 */
const handleDelete = (row: OutAsset) => {
  if (!row.recordcode) {
    ElMessage.error('出库资产记录码不存在，无法删除')
    return
  }
  ElMessageBox.confirm('确定要删除该出库资产记录吗？', '删除确认', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning',
  })
    .then(() => {
      return outAssetStore.remove(row.recordcode)
    })
    .then(() => {
      ElMessage.success('删除成功')
      // 【架构优化】通过 SmartListContainer 刷新列表，保持数据一致性
      smartListRef.value?.refresh()
    })
    .catch((error) => {
      if (error !== 'cancel') {
        console.error('删除失败:', error)
        ElMessage.error('删除失败，请刷新页面重试')
      }
    })
}

/**
 * 新增出库
 */
const handleAddOutAsset = () => {
  router.push({ name: 'OutAssetForm', query: {} }).catch((err) => {
    console.error('新增跳转失败:', err)
    ElMessage.error('跳转新增页失败，请重试')
  })
}

/**
 * 批量导入
 */
const handleBatchImport = () => {
  router.push({ name: 'OutAssetBatchImport' }).catch((err) => {
    console.error('批量导入跳转失败:', err)
    ElMessage.error('跳转批量导入页失败，请重试')
  })
}

/**
 * 导出 Excel
 * 支持导出当前页或全部数据
 */
const handleExportExcel = async () => {
  const exportColumns: ColumnConfig<OutAssetDetail>[] = [
    { title: '资产名称', key: 'asset_name', default: '' },
    { title: '出库资产编码', key: 'asset_code', default: '' },
    { title: '出库数量', key: 'outasset_number', default: '1', formatter: (val) => String(val) },
    {
      title: '合同编码',
      key: 'contract',
      default: '',
      formatter: (_, row) => row.contract?.contract_code || '',
    },
    {
      title: '申请人姓名',
      key: 'outasset_applicant',
      default: '',
      formatter: (_, row) => row.outasset_applicant?.employee_name || '',
    },
    { title: '申请人工号', key: 'outasset_applicant_jobcode', default: '' },
    {
      title: '保管人姓名',
      key: 'outasset_manager',
      default: '',
      formatter: (_, row) => row.outasset_manager?.employee_name || '',
    },
    { title: '保管人工号', key: 'outasset_manager_jobcode', default: '' },
    {
      title: '出库日期',
      key: 'outasset_date',
      default: '',
      formatter: (val) => formatDate(val as string | Date | null) || '',
    },
    {
      title: '预计返回日期',
      key: 'return_date',
      default: '',
      formatter: (val) => formatDate(val as string | Date | null) || '',
    },
    { title: '出库类型', key: 'outasset_type', default: '' },
    { title: '使用位置', key: 'outasset_using_location', default: '' },
    { title: '资产描述', key: 'outasset_description', default: '' },
  ]

  // 选择导出范围
  let range: 'current' | 'all' | null = null
  try {
    await ElMessageBox.confirm(
      `当前页面 ${outAssetStore.list.length} 条，总共 ${outAssetStore.pagination.total} 条。请选择：`,
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
    else return // 关闭弹窗
  }

  // 获取数据
  let exportData: OutAssetDetail[] = []
  let fileName = ''

  if (range === 'current') {
    exportData = outAssetStore.list
    fileName = `出库资产列表_当前页面_${outAssetStore.list.length}条.xlsx`
  } else if (range === 'all') {
    ElMessage.info('正在准备全部数据，请稍候...')
    if (outAssetStore.pagination.total > 1000) {
      const confirm = await ElMessageBox.confirm(
        '数据量较大，导出可能需要一些时间，是否继续？',
        '导出确认',
        { confirmButtonText: '继续', cancelButtonText: '取消', type: 'warning' },
      ).catch(() => false)
      if (!confirm) return
    }
    try {
      const allData = await outAssetStore.getList({
        page: 1,
        page_size: outAssetStore.pagination.total,
      })
      exportData = allData
      fileName = `出库资产列表_全部_${allData.length}条.xlsx`
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
    sheetName: '出库资产列表',
    confirmMessage: `确定要导出 ${exportData.length} 条出库资产数据吗？`,
    emptyMessage: '暂无出库资产数据可导出',
    successMessage: '出库资产数据导出成功',
    errorMessage: '出库资产数据导出失败，请重试',
  })
}

/**
 * 批量删除
 * 弹出确认框，确认后调用 store.removeBatch 执行批量删除
 * @param rows 选中的行数据
 */
const handleBatchDelete = async (rows: OutAsset[] | undefined) => {
  if (!rows || rows.length === 0) {
    ElMessage.warning('请先选择要删除的数据')
    return
  }

  // 提取选中的唯一标识字段（根据实体类型调整字段名）
  const codes = rows.map((row) => row.recordcode).filter((code): code is string => !!code)

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

    await outAssetStore.removeBatch(codes)
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

.outasset-details-root {
  @include list-container;
}

.table-container {
  @include table-container;

  // 表格内容自动换行及对齐优化（覆盖第三方默认样式）
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
