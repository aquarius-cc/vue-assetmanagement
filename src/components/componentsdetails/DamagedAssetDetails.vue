<!--
@file 待报废资产列表页面，展示待审批的报废资产记录并支持增删改查操作
@component DamagedAssetDetails
@usedBy
  - views/DamagedAssetDetails.vue: 通过 router-view 渲染待报废资产列表
@dependsOn
  - stores/damagedAssetStore: 待报废资产数据管理
  - components/commoncomponents/SmartListContainer: 数据管理容器
  - components/commoncomponents/CommonList: 列表展示组件
-->
<template>
  <div class="damaged-asset-details-root">
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
            :detail-route-name="'DamagedAssetBasicDetails'"
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
            <!-- 待报废日期列自定义渲染 -->
            <template #damaged_date="{ row }">
              {{ formatDate(row.damaged_date) }}
            </template>

            <!-- 审批状态列自定义渲染（使用 el-tag） -->
            <template #approval_status="{ row }">
              <el-tag :type="getApprovalStatusTagType(row.approval_status ?? '')">
                {{ getApprovalStatusText(row.approval_status ?? '') }}
              </el-tag>
            </template>
          </CommonList>

          <!-- 底部按钮组 -->
          <div class="bottom-buttons">
            <el-button type="success" @click="handleAdd">新增待报废</el-button>
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

<script lang="ts" setup>
defineOptions({ name: 'DamagedAssetDetails' })

// ===== 导入顺序：Vue 核心 → 第三方库 → @/ 内部模块 =====
import { ref, watch, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import SmartListContainer from '@/components/commoncomponents/SmartListContainer.vue'
import CommonList from '@/types/list'
import type { TableColumn } from '@/types/list'
import type { PaginationSearchConfig } from '@/composables/usePaginationSearch'
import type { ColumnConfig } from '@/utils/excelExporter'
import { exportToExcel } from '@/utils/excelExporter'
import type { DamagedAsset } from '@/types/damagedasset'
import { useDamagedAssetStore } from '@/stores/damagedAssetStore'
import { formatDate } from '@/utils/Format'
import { getApprovalStatusText, getApprovalStatusTagType } from '@/utils/statusMapping'
import type { SmartListContainerExpose } from '@/types/common'

// ===== 状态与实例 =====
const damagedAssetStore = useDamagedAssetStore()
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
  { prop: 'asset_recordcode', label: '资产编码', width: 150, align: 'center' },
  { prop: 'damaged_asset_name', label: '资产名称', width: 150, align: 'left' },
  { prop: 'damaged_asset_specification', label: '规格型号', width: 100, align: 'center' },
  { prop: 'damaged_asset_contract_name', label: '合同名称', width: 150, align: 'left' },
  { prop: 'damaged_asset_storage_name', label: '仓库名称', width: 120, align: 'left' },
  { prop: 'damaged_asset_number', label: '待报废数量', width: 100, align: 'center' },
  {
    type: 'custom',
    prop: 'damaged_date',
    label: '待报废日期',
    width: 120,
    align: 'center',
    slotName: 'damaged_date',
  },
  {
    type: 'custom',
    prop: 'approval_status',
    label: '审批状态',
    width: 100,
    align: 'center',
    slotName: 'approval_status',
  },
  { prop: 'damaged_asset_description', label: '描述', width: 150, align: 'left' },
]

// ===== SmartListContainer 配置 =====
/**
 * Store 配置对象（使用 computed 实现动态筛选条件合并）
 * 传递给 SmartListContainer 用于数据管理
 *
 * 【业务逻辑】本页面只显示 approval_status=pending（待审批）的记录
 * 筛选条件在 getList 和 performSearch 中统一添加
 *
 * 包含：
 * - getList: 获取列表数据的方法
 * - pagination: 分页状态（使用 getter/setter 实现双向绑定）
 * - list: 列表数据（computed）
 * - loading: 加载状态（computed）
 * - search: 搜索配置
 */
const storeConfig = computed<PaginationSearchConfig<DamagedAsset>>(() => ({
  store: {
    /**
     * 获取列表数据
     * 【业务逻辑】强制只查询 approval_status=pending 的记录
     * @param params 分页查询参数
     * @returns 包含 count 和 results 的响应对象
     */
    getList: async (params) => {
      const pendingParams = { ...params, approval_status: 'pending' }
      const response = await damagedAssetStore.getList(pendingParams)
      return {
        count: damagedAssetStore.pagination.total,
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
        get: () => damagedAssetStore.pagination.page,
        set: (val: number) => {
          damagedAssetStore.pagination.page = val
        },
      },
      page_size: {
        get: () => damagedAssetStore.pagination.page_size,
        set: (val: number) => {
          damagedAssetStore.pagination.page_size = val
        },
      },
      total: {
        get: () => damagedAssetStore.pagination.total,
        set: (val: number) => {
          damagedAssetStore.pagination.total = val
        },
      },
    },
    /**
     * 列表数据（computed 保持响应式）
     */
    list: computed(() => damagedAssetStore.list),
    /**
     * 加载状态（computed 保持响应式）
     */
    loading: computed(() => damagedAssetStore.loading),
    /**
     * 刷新标志（computed 保持响应式）
     * 用于子页面（如批量导入、表单编辑）通知列表刷新
     */
    refreshFlag: computed(() => damagedAssetStore.refreshFlag),
    /**
     * 设置刷新标志
     * 子页面调用后，usePaginationSearch 会自动监听并触发列表刷新
     */
    setRefreshFlag: (flag: boolean) => damagedAssetStore.setRefreshFlag(flag),
  },
  /**
   * 搜索配置
   * 【业务逻辑】强制只搜索 approval_status=pending 的记录
   */
  search: {
    performSearch: async (keyword: string, page: number, page_size: number) => {
      const response = await damagedAssetStore.getList({
        search: keyword,
        page,
        page_size,
        approval_status: 'pending',
      })
      return {
        count: damagedAssetStore.pagination.total,
        results: response,
      }
    },
  },
  defaultPageSize: 20,
  messages: {
    loadFailed: '加载待报废资产列表失败',
    searchFailed: '搜索待报废资产失败',
    invalidPage: '页码超出范围，已跳转至最后一页',
  },
}))

// ===== 路由监听：控制子路由遮罩 =====
/**
 * 监听路由变化，判断是否需要显示子路由遮罩层
 * 当访问子路由（如新增/编辑/详情页）时显示遮罩
 */
watch(
  () => route.matched,
  (matched) => {
    const hasParent = matched.some((item) => item.name === 'DamagedAssetDetails')
    const isSelfTop = matched[matched.length - 1]?.name === 'DamagedAssetDetails'
    isChildRouteActive.value = hasParent && !isSelfTop
  },
  { immediate: true },
)

// ===== 事件处理 =====

/**
 * 编辑待报废记录
 * @param row 待编辑的行数据
 */
const handleEdit = (row: DamagedAsset) => {
  // [HALT] FE-C2修复：编辑/删除/详情走 DamagedAsset 自身 recordcode（DAMAGED-xxx），
  // 后端 lookup_field="recordcode"；asset_recordcode 是关联资产编码（仅批删用）
  if (!row.recordcode) {
    ElMessage.error('资产编码不存在，无法编辑')
    return
  }
  router.push({ name: 'DamagedAssetForm', query: { code: row.recordcode } }).catch((err) => {
    console.error('编辑跳转失败:', err)
    ElMessage.error('跳转编辑页失败，请重试')
  })
}

/**
 * 删除待报废记录
 * @param row 待删除的行数据
 */
const handleDelete = (row: DamagedAsset) => {
  if (!row.recordcode) {
    ElMessage.error('记录 ID 不存在，无法删除')
    return
  }
  ElMessageBox.confirm('确定要删除该待报废资产记录吗？', '删除确认', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning',
  })
    .then(() => {
      return damagedAssetStore.remove(row.recordcode || '')
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
 * 新增待报废
 */
const handleAdd = () => {
  router.push({ name: 'DamagedAssetForm', query: {} }).catch((err) => {
    console.error('新增跳转失败:', err)
    ElMessage.error('跳转新增页失败，请重试')
  })
}

/**
 * 批量导入
 */
const handleBatchImport = () => {
  router.push({ name: 'DamagedAssetBatchImport' }).catch((err) => {
    console.error('批量导入跳转失败:', err)
    ElMessage.error('跳转批量导入页失败，请重试')
  })
}

/**
 * 导出 Excel
 * 支持导出当前页或全部数据
 */
const handleExportExcel = async () => {
  const exportColumns: ColumnConfig<DamagedAsset>[] = [
    // [HALT] FE-C2修复：字段名从 damaged_asset_code 改为 asset_recordcode，与后端Serializer对齐
    { title: '资产编码', key: 'asset_recordcode', default: '' },
    { title: '资产名称', key: 'damaged_asset_name', default: '' },
    { title: '合同名称', key: 'damaged_asset_contract_name', default: '' },
    { title: '仓库名称', key: 'damaged_asset_storage_name', default: '' },
    {
      title: '待报废数量',
      key: 'damaged_asset_number',
      default: '1',
      formatter: (val) => String(val),
    },
    {
      title: '待报废日期',
      key: 'damaged_date',
      default: '',
      formatter: (val) => formatDate(val as string | Date | null) || '',
    },
    {
      title: '审批状态',
      key: 'approval_status',
      default: '',
      formatter: (val) => getApprovalStatusText((val as string) ?? ''),
    },
    { title: '审批人', key: 'approver', default: '' },
    { title: '描述', key: 'damaged_asset_description', default: '' },
  ]

  let range: 'current' | 'all' | null = null
  try {
    await ElMessageBox.confirm(
      `当前页面 ${damagedAssetStore.list.length} 条，总共 ${damagedAssetStore.pagination.total} 条。请选择：`,
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

  let exportData: DamagedAsset[] = []
  let fileName = ''

  if (range === 'current') {
    exportData = damagedAssetStore.list
    fileName = `待报废资产列表_当前页面_${damagedAssetStore.list.length}条.xlsx`
  } else if (range === 'all') {
    ElMessage.info('正在准备全部数据，请稍候...')
    if (damagedAssetStore.pagination.total > 1000) {
      const confirm = await ElMessageBox.confirm(
        '数据量较大，导出可能需要一些时间，是否继续？',
        '导出确认',
        { confirmButtonText: '继续', cancelButtonText: '取消', type: 'warning' },
      ).catch(() => false)
      if (!confirm) return
    }
    try {
      // 【业务逻辑】导出全部时也只导出 pending 状态的记录
      const allData = await damagedAssetStore.getList({
        page: 1,
        page_size: damagedAssetStore.pagination.total,
        approval_status: 'pending',
      })
      exportData = allData
      fileName = `待报废资产列表_全部_${allData.length}条.xlsx`
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
    sheetName: '待报废资产列表',
    confirmMessage: `确定要导出 ${exportData.length} 条待报废资产数据吗？`,
    emptyMessage: '暂无待报废资产数据可导出',
    successMessage: '待报废资产数据导出成功',
    errorMessage: '待报废资产数据导出失败，请重试',
  })
}

/**
 * 批量删除
 * 弹出确认框，确认后调用 store.removeBatch 执行批量删除
 * @param rows 选中的行数据
 */
const handleBatchDelete = async (rows: DamagedAsset[] | undefined) => {
  if (!rows || rows.length === 0) {
    ElMessage.warning('请先选择要删除的数据')
    return
  }

  // 提取选中的唯一标识字段：批删走后端 batch_delete，Service 按资产 recordcode 查询（asset_recordcode__recordcode）
  const codes = rows.map((row) => row.asset_recordcode).filter((code): code is string => !!code)

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

    await damagedAssetStore.removeBatch(codes)
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

.damaged-asset-details-root {
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
