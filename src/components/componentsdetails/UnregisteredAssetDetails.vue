<!--
  UnregisteredAssetDetails.vue
  未登记资产列表页面（重构版）
  
  架构调整：
  1. 使用 SmartListContainer 封装数据管理逻辑（分页、搜索、加载）
  2. CommonList 只负责 UI 展示，不管理数据
  3. 解决原架构中父组件和 CommonList 重复请求的问题
  
  数据流：
  SmartListContainer (数据管理) → slot props → CommonList (纯展示)
  
  功能：
  - 展示未登记资产列表
  - 新增、编辑、删除未登记资产
  - 批量导入
  - 导出 Excel
  - 子路由：表单页、详情页、批量导入页（浮层遮罩）
-->
<template>
  <div class="unregistered-asset-details-root">
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
            :detail-route-name="'UnregisteredAssetBasicDetails'"
            :show-detail-button="true"
            :show-actions="true"
            :enable-edit="true"
            :enable-delete="true"
            :enable-selection="true"
            :action-column-width="180"
            :page-size-options="slotProps.pageSizeOptions"
            @edit="handleEdit"
            @delete="handleDelete"
            @size-change="slotProps.handleSizeChange"
            @current-change="slotProps.handleCurrentChange"
            @search="slotProps.performSearch"
            @selection-change="slotProps.handleSelectionChange"
          >
            <!-- 场景类型列自定义渲染（使用 el-tag） -->
            <template #scenario_type="{ row }">
              <el-tag :type="getScenarioTypeTagType(row.scenario_type)">
                {{ getScenarioTypeText(row.scenario_type) }}
              </el-tag>
            </template>

            <!-- 发现日期列自定义渲染 -->
            <template #discovery_date="{ row }">
              {{ formatDate(row.discovery_date) }}
            </template>

            <!-- 审批状态列自定义渲染（使用 el-tag） -->
            <template #approval_status="{ row }">
              <el-tag :type="getApprovalStatusTagType(row.approval_status)">
                {{ getApprovalStatusText(row.approval_status) }}
              </el-tag>
            </template>
          </CommonList>

          <!-- 底部按钮组 -->
          <div class="bottom-buttons">
            <el-button type="success" @click="handleAdd">新增未登记资产</el-button>
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
  name: 'UnregisteredAssetDetails',
}
</script>

<script lang="ts" setup>
// ===== 导入顺序：Vue 核心 → 第三方库 → @/ 内部模块 =====
import { ref, watch, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import SmartListContainer from '@/components/commoncomponents/SmartListContainer.vue'
import CommonList from '@/components/commoncomponents/CommonList.vue'
import type { TableColumn } from '@/components/commoncomponents/CommonList.vue'
import type { PaginationSearchConfig } from '@/composables/usePaginationSearch'
import type { ColumnConfig } from '@/utils/excelExporter'
import { exportToExcel } from '@/utils/excelExporter'
import type { UnregisteredAsset } from '@/utils/UnregisteredAsset'
import {
  scenarioTypeTextMap,
  scenarioTypeTagMap,
  unregisteredAssetStatusTextMap,
  unregisteredAssetStatusTagMap,
} from '@/utils/UnregisteredAsset'
import { useUnregisteredAssetStore } from '@/stores/unregisteredAssetStore'
import { formatDate } from '@/utils/Format'
import type { SmartListContainerExpose } from '@/types/common'

// ===== 状态与实例 =====
const unregisteredAssetStore = useUnregisteredAssetStore()
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

// ===== 场景类型辅助函数 =====

/**
 * 根据场景类型返回中文显示文本
 * @param type 场景类型字符串
 * @returns 中文描述
 */
const getScenarioTypeText = (type: string | null | undefined): string => {
  if (!type) return '未知'
  return scenarioTypeTextMap[type] || '未知'
}

/**
 * 根据场景类型返回 el-tag 的类型
 * @param type 场景类型字符串
 * @returns Element Plus Tag 类型
 */
const getScenarioTypeTagType = (
  type: string | null | undefined,
): '' | 'success' | 'warning' | 'danger' | 'info' => {
  if (!type) return 'info'
  return (scenarioTypeTagMap[type] as '' | 'success' | 'warning' | 'danger' | 'info') || 'info'
}

// ===== 审批状态辅助函数 =====

/**
 * 根据审批状态返回 el-tag 的类型
 * @param status 审批状态字符串
 * @returns Element Plus Tag 类型
 */
const getApprovalStatusTagType = (
  status: string | null | undefined,
): 'success' | 'warning' | 'danger' | 'info' => {
  if (!status) return 'info'
  return (unregisteredAssetStatusTagMap[status] as 'success' | 'warning' | 'danger' | 'info') || 'info'
}

/**
 * 根据审批状态返回中文显示文本
 * @param status 审批状态字符串
 * @returns 中文描述
 */
const getApprovalStatusText = (status: string | null | undefined): string => {
  if (!status) return '未知'
  return unregisteredAssetStatusTextMap[status] || '未知'
}

// ===== 表格列配置 =====
/**
 * 表格列定义
 * 每一列的渲染方式、标题、宽度等属性
 */
const columns: TableColumn[] = [
  { type: 'index', label: '序号', width: 60, align: 'center' },
  { prop: 'code', label: '编码', width: 150, align: 'center' },
  { prop: 'asset_name', label: '资产名称', width: 150, align: 'left' },
  {
    type: 'custom',
    prop: 'scenario_type',
    label: '场景类型',
    width: 120,
    align: 'center',
    slotName: 'scenario_type',
  },
  {
    type: 'custom',
    prop: 'discovery_date',
    label: '发现日期',
    width: 120,
    align: 'center',
    slotName: 'discovery_date',
  },
  { prop: 'discovery_location', label: '发现地点', width: 150, align: 'left' },
  { prop: 'estimated_value', label: '预估价值', width: 100, align: 'center' },
  {
    type: 'custom',
    prop: 'approval_status',
    label: '审批状态',
    width: 100,
    align: 'center',
    slotName: 'approval_status',
  },
  { prop: 'handle_description', label: '描述', width: 150, align: 'left' },
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
const storeConfig: PaginationSearchConfig<UnregisteredAsset> = {
  store: {
    /**
     * 获取列表数据
     * @param params 分页查询参数
     * @returns 包含 count 和 results 的响应对象
     */
    getList: async (params) => {
      const response = await unregisteredAssetStore.getList(params)
      return {
        count: unregisteredAssetStore.pagination.total,
        results: response,
        next: null,
        previous: null,
      }
    },
    /**
     * 分页状态
     * 使用 getter/setter 对象实现与 Pinia store 的双向绑定
     */
    pagination: {
      page: {
        get: () => unregisteredAssetStore.pagination.page,
        set: (val: number) => {
          unregisteredAssetStore.pagination.page = val
        },
      },
      page_size: {
        get: () => unregisteredAssetStore.pagination.page_size,
        set: (val: number) => {
          unregisteredAssetStore.pagination.page_size = val
        },
      },
      total: {
        get: () => unregisteredAssetStore.pagination.total,
        set: (val: number) => {
          unregisteredAssetStore.pagination.total = val
        },
      },
    },
    /**
     * 列表数据（computed 保持响应式）
     */
    list: computed(() => unregisteredAssetStore.list),
    /**
     * 加载状态（computed 保持响应式）
     */
    loading: computed(() => unregisteredAssetStore.loading),
    /**
     * 刷新标志（computed 保持响应式）
     * 用于子页面（如批量导入、表单编辑）通知列表刷新
     */
    refreshFlag: computed(() => unregisteredAssetStore.refreshFlag),
    /**
     * 设置刷新标志
     * 子页面调用后，usePaginationSearch 会自动监听并触发列表刷新
     */
    setRefreshFlag: (flag: boolean) => unregisteredAssetStore.setRefreshFlag(flag),
  },
  /**
   * 搜索配置
   * 配置后可使用搜索功能
   */
  search: {
    performSearch: async (keyword: string, page: number, page_size: number) => {
      const response = await unregisteredAssetStore.getList({
        search: keyword,
        page,
        page_size,
      })
      return {
        count: unregisteredAssetStore.pagination.total,
        results: response,
      }
    },
  },
  defaultPageSize: 20,
  messages: {
    loadFailed: '加载未登记资产列表失败',
    searchFailed: '搜索未登记资产失败',
    invalidPage: '页码超出范围，已跳转至最后一页',
  },
}

// ===== 路由监听：控制子路由遮罩 =====
/**
 * 监听路由变化，判断是否需要显示子路由遮罩层
 * 当访问子路由（如表单页、详情页）时显示遮罩
 */
watch(
  () => route.matched,
  (matched) => {
    const hasParent = matched.some((item) => item.name === 'UnregisteredAssetDetails')
    const isSelfTop = matched[matched.length - 1]?.name === 'UnregisteredAssetDetails'
    isChildRouteActive.value = hasParent && !isSelfTop
  },
  { immediate: true },
)

// ===== 事件处理 =====

/**
 * 编辑未登记资产记录
 * 跳转到编辑表单页
 * @param row 未登记资产记录
 */
const handleEdit = (row: UnregisteredAsset) => {
  if (!row.code) {
    ElMessage.error('资产编码不存在，无法编辑')
    return
  }
  router
    .push({ name: 'UnregisteredAssetForm', query: { code: row.code } })
    .catch((err) => {
      console.error('编辑跳转失败:', err)
      ElMessage.error('跳转编辑页失败，请重试')
    })
}

/**
 * 删除未登记资产记录
 * 显示确认对话框，确认后调用 store 删除方法
 * 删除成功后刷新列表
 * @param row 未登记资产记录
 */
const handleDelete = (row: UnregisteredAsset) => {
  if (!row.code) {
    ElMessage.error('记录编码不存在，无法删除')
    return
  }
  ElMessageBox.confirm('确定要删除该未登记资产记录吗？', '删除确认', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning',
  })
    .then(() => {
      return unregisteredAssetStore.remove(row.code || '')
    })
    .then(() => {
      ElMessage.success('删除成功')
      // 删除成功后刷新列表
      ;(smartListRef.value as unknown as { refresh: () => void })?.refresh?.()
    })
    .catch((error) => {
      if (error !== 'cancel') {
        console.error('删除失败:', error)
        ElMessage.error('删除失败，请刷新页面重试')
      }
    })
}

/**
 * 新增未登记资产
 * 跳转到新增表单页
 */
const handleAdd = () => {
  router.push({ name: 'UnregisteredAssetForm', query: {} }).catch((err) => {
    console.error('新增跳转失败:', err)
    ElMessage.error('跳转新增页失败，请重试')
  })
}

/**
 * 批量导入
 * 跳转到批量导入页
 */
const handleBatchImport = () => {
  router.push({ name: 'UnregisteredAssetBatchImport' }).catch((err) => {
    console.error('批量导入跳转失败:', err)
    ElMessage.error('跳转批量导入页失败，请重试')
  })
}

/**
 * 导出 Excel
 * 支持导出当前页或全部数据
 */
const handleExportExcel = async () => {
  const exportColumns: ColumnConfig<UnregisteredAsset>[] = [
    { title: '编码', key: 'code', default: '' },
    { title: '资产名称', key: 'asset_name', default: '' },
    {
      title: '场景类型',
      key: 'scenario_type',
      default: '',
      formatter: (val) => getScenarioTypeText(val as string),
    },
    {
      title: '发现日期',
      key: 'discovery_date',
      default: '',
      formatter: (val) => formatDate(val as string | Date | null) || '',
    },
    { title: '发现地点', key: 'discovery_location', default: '' },
    { title: '资产品牌', key: 'asset_brand', default: '' },
    { title: '资产规格型号', key: 'asset_specification', default: '' },
    { title: '资产类型编码', key: 'asset_type_code', default: '' },
    { title: '预估价值', key: 'estimated_value', default: '' },
    { title: '关联资产编码', key: 'related_asset_code', default: '' },
    { title: '目标仓库编码', key: 'target_storage_code', default: '' },
    {
      title: '审批状态',
      key: 'approval_status',
      default: '',
      formatter: (val) => getApprovalStatusText(val as string),
    },
    { title: '审批人', key: 'approver', default: '' },
    { title: '处理类型', key: 'handle_type', default: '' },
    { title: '描述', key: 'handle_description', default: '' },
  ]

  let range: 'current' | 'all' | null = null
  try {
    await ElMessageBox.confirm(
      `当前页面 ${unregisteredAssetStore.list.length} 条，总共 ${unregisteredAssetStore.pagination.total} 条。请选择：`,
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

  let exportData: UnregisteredAsset[] = []
  let fileName = ''

  if (range === 'current') {
    exportData = unregisteredAssetStore.list
    fileName = `未登记资产列表_当前页面_${unregisteredAssetStore.list.length}条.xlsx`
  } else if (range === 'all') {
    ElMessage.info('正在准备全部数据，请稍候...')
    if (unregisteredAssetStore.pagination.total > 1000) {
      const confirm = await ElMessageBox.confirm(
        '数据量较大，导出可能需要一些时间，是否继续？',
        '导出确认',
        { confirmButtonText: '继续', cancelButtonText: '取消', type: 'warning' },
      ).catch(() => false)
      if (!confirm) return
    }
    try {
      const allData = await unregisteredAssetStore.getList({
        page: 1,
        page_size: unregisteredAssetStore.pagination.total,
      })
      exportData = allData
      fileName = `未登记资产列表_全部_${allData.length}条.xlsx`
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
    sheetName: '未登记资产列表',
    confirmMessage: `确定要导出 ${exportData.length} 条未登记资产数据吗？`,
    emptyMessage: '暂无未登记资产数据可导出',
    successMessage: '未登记资产数据导出成功',
    errorMessage: '未登记资产数据导出失败，请重试',
  })
}

/**
 * 批量删除
 * 弹出确认框，确认后调用 store.removeBatch 执行批量删除
 * @param rows 选中的行数据
 */
const handleBatchDelete = async (rows: UnregisteredAsset[] | undefined) => {
  if (!rows || rows.length === 0) {
    ElMessage.warning('请先选择要删除的数据')
    return
  }

  // 提取选中的唯一标识字段（根据实体类型调整字段名）
  const codes = rows
    .map((row) => row.code)
    .filter((code): code is string => !!code)

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

    await unregisteredAssetStore.removeBatch(codes)
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

.unregistered-asset-details-root {
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
