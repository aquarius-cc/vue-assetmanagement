<!--
  RecycleAssetDetails.vue
  回收资产列表页面（重构版）

  架构调整：
  1. 使用 SmartListContainer 封装数据管理逻辑（分页、搜索、加载）
  2. CommonList 只负责 UI 展示，不管理数据
  3. 解决原架构中前端过滤不准确、无分页的问题

  数据流：
  SmartListContainer (数据管理) → slot props → CommonList (纯展示)

  功能：
  - 展示回收资产列表（支持后端分页和搜索）
  - 新增回收、编辑回收、删除回收（带确认弹窗）
  - 导出 Excel
  - 子路由：新增/编辑/详情表单（浮层遮罩）
-->
<template>
  <div class="recycleasset-details-root">
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
        :initial-page-size="10"
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
            :detail-route-name="'RecycleAssetBasicDetails'"
            :show-detail-button="true"
            :show-actions="true"
            :enable-edit="true"
            :enable-delete="true"
            :enable-selection="true"
            :action-column-width="220"
            :page-size-options="slotProps.pageSizeOptions"
            @size-change="slotProps.handleSizeChange"
            @current-change="slotProps.handleCurrentChange"
            @search="slotProps.performSearch"
            @edit="handleEdit"
            @delete="handleDelete"
            @detail="handleDetails"
            @selection-change="slotProps.handleSelectionChange"
          >
            <!-- 回收日期列自定义渲染 -->
            <template #recycle_asset_date="{ row }">
              {{ formatDate(row.recycle_asset_date) }}
            </template>
          </CommonList>

          <!-- 底部按钮组 -->
          <div class="bottom-buttons">
            <el-button type="success" @click="handleAddRecycleAsset">新增回收</el-button>
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
  name: 'RecycleAssetDetails',
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
import type { RecycleAssetExtended } from '@/utils/RecycleAsset'
import { useRecycleAssetStore } from '@/stores/recycleAssetStore'
import { formatDate } from '@/utils/Format'
import type { SmartListContainerExpose } from '@/types/common'

// ===== 状态与实例 =====
const route = useRoute()
const router = useRouter()
const recycleAssetStore = useRecycleAssetStore()

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
  { prop: 'recordcode', label: '回收记录码', width: 150, align: 'center' },
  { prop: 'outasset_recordcode', label: '出库记录码', width: 150, align: 'center' },
  { prop: 'asset_code', label: '资产码', width: 150, align: 'center' },
  { prop: 'asset_name', label: '资产名称', width: 150, align: 'left' },
  { prop: 'asset_specification', label: '资产规格', width: 150, align: 'left' },
  { prop: 'storage_name', label: '存放仓库名称', width: 120, align: 'left' },
  { prop: 'recycle_person_name', label: '回收人姓名', width: 120, align: 'center' },
  { prop: 'recycle_asset_number', label: '回收数量', width: 100, align: 'center' },
  {
    type: 'custom',
    prop: 'recycle_asset_date',
    label: '回收日期',
    width: 120,
    align: 'center',
    slotName: 'recycle_asset_date',
  },
  // {
  //   prop: 'using_person_jobcode',
  //   label: '资产保管人工号',
  //   width: 130,
  //   align: 'center',
  // },
  // { prop: 'using_person_name', label: '资产保管人姓名', width: 130, align: 'center' },
]

// ===== SmartListContainer 配置 =====
/**
 * Store 配置对象
 * 传递给 SmartListContainer 用于数据管理
 *
 * 【优化】改为后端搜索，不再使用前端本地过滤
 *
 * 包含：
 * - getList: 获取列表数据的方法
 * - pagination: 分页状态（使用 getter/setter 实现双向绑定）
 * - list: 列表数据（computed）
 * - loading: 加载状态（computed）
 * - search: 搜索配置（后端搜索）
 */
const storeConfig: PaginationSearchConfig<RecycleAssetExtended> = {
  store: {
    /**
     * 获取列表数据
     * @param params 分页查询参数
     * @returns 包含 count 和 results 的响应对象
     */
    getList: async (params) => {
      const response = await recycleAssetStore.getList(params)
      return {
        count: recycleAssetStore.pagination.total,
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
        get: () => recycleAssetStore.pagination.page,
        set: (val: number) => {
          recycleAssetStore.pagination.page = val
        },
      },
      page_size: {
        get: () => recycleAssetStore.pagination.page_size,
        set: (val: number) => {
          recycleAssetStore.pagination.page_size = val
        },
      },
      total: {
        get: () => recycleAssetStore.pagination.total,
        set: (val: number) => {
          recycleAssetStore.pagination.total = val
        },
      },
    },
    /**
     * 列表数据（computed 保持响应式）
     */
    list: computed(() => recycleAssetStore.list),
    /**
     * 加载状态（computed 保持响应式）
     */
    loading: computed(() => recycleAssetStore.loading),
    /**
     * 刷新标志（computed 保持响应式）
     * 用于子页面（如批量导入、表单编辑）通知列表刷新
     */
    refreshFlag: computed(() => recycleAssetStore.refreshFlag),
    /**
     * 设置刷新标志
     * 子页面调用后，usePaginationSearch 会自动监听并触发列表刷新
     */
    setRefreshFlag: (flag: boolean) => recycleAssetStore.setRefreshFlag(flag),
  },
  /**
   * 搜索配置
   * 【优化】改为后端搜索，支持多字段搜索
   */
  search: {
    performSearch: async (keyword: string, page: number, page_size: number) => {
      const response = await recycleAssetStore.getList({ search: keyword, page, page_size })
      return {
        count: recycleAssetStore.pagination.total,
        results: response,
      }
    },
  },
  defaultPageSize: 10,
  messages: {
    loadFailed: '加载回收资产列表失败',
    searchFailed: '搜索回收资产失败',
    invalidPage: '页码超出范围，已跳转至最后一页',
  },
}

// ===== 路由监听：控制子路由遮罩 =====
/**
 * 监听路由变化，判断是否需要显示子路由遮罩层
 * 当访问子路由（如新增/编辑/详情页）时显示遮罩
 */
watch(
  () => route.matched,
  (matched) => {
    const hasParent = matched.some((item) => item.name === 'RecycleAssetDetails')
    const isSelfTop = matched[matched.length - 1]?.name === 'RecycleAssetDetails'
    isChildRouteActive.value = hasParent && !isSelfTop
  },
  { immediate: true },
)

// ===== 事件处理 =====

/**
 * 查看详情
 * @param row 行数据
 */
const handleDetails = (row: RecycleAssetExtended) => {
  if (!row.recordcode) {
    ElMessage.error('回收资产编码不存在，无法查看详情')
    return
  }
  router
    .push({ name: 'RecycleAssetBasicDetails', query: { code: row.recordcode } })
    .catch((err) => {
      console.error('跳转详情页失败:', err)
      ElMessage.error('跳转失败，请刷新页面重试')
    })
}

/**
 * 编辑回收资产
 * 【修复】路由参数名 code → recordcode，与 RecycleAssetForm.vue 的 isEditMode 判断一致
 * @param row 行数据
 */
const handleEdit = (row: RecycleAssetExtended) => {
  if (!row.recordcode) {
    ElMessage.error('回收资产标识不存在，无法编辑')
    return
  }
  router.push({ name: 'RecycleAssetForm', query: { recordcode: row.recordcode } }).catch((err) => {
    console.error('跳转编辑页失败:', err)
    ElMessage.error('跳转失败，请刷新页面重试')
  })
}

/**
 * 删除回收资产
 * 【优化】添加二次确认弹窗，防止误删
 * @param row 行数据
 */
const handleDelete = (row: RecycleAssetExtended) => {
  if (!row.recordcode) {
    ElMessage.error('回收资产标识不存在，无法删除')
    return
  }
  ElMessageBox.confirm('确定要删除该回收资产记录吗？', '删除确认', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning',
  })
    .then(() => {
      return recycleAssetStore.remove(row.recordcode)
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
 * 批量删除
 * 弹出确认框，确认后调用 store.removeBatch 执行批量删除
 * @param rows 选中的行数据
 */
const handleBatchDelete = async (rows: RecycleAssetExtended[] | undefined) => {
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

    await recycleAssetStore.removeBatch(codes)
    smartListRef.value?.clearSelection()
    await smartListRef.value?.refresh()
  } catch (err) {
    if (err === 'cancel') return
    console.error('批量删除失败:', err)
    ElMessage.error('批量删除失败，请重试')
  }
}

/**
 * 新增回收资产
 */
const handleAddRecycleAsset = () => {
  router.push({ name: 'RecycleAssetForm', query: {} }).catch((err) => {
    console.error('跳转新增页失败:', err)
    ElMessage.error('跳转失败，请刷新页面重试')
  })
}

/**
 * 导出 Excel
 * 【优化】实现导出功能
 */
const handleExportExcel = async () => {
  const exportColumns: ColumnConfig<RecycleAssetExtended>[] = [
    { title: '回收资产编码', key: 'recycle_asset', default: '' },
    { title: '资产名称', key: 'recycle_asset_name', default: '' },
    { title: '回收人姓名', key: 'recycle_person_name', default: '' },
    { title: '存放仓库', key: 'storage_code', default: '' },
    {
      title: '回收数量',
      key: 'recycle_asset_number',
      default: '1',
      formatter: (val) => String(val),
    },
    {
      title: '回收日期',
      key: 'recycle_asset_date',
      default: '',
      formatter: (val) => formatDate(val as string | Date | null) || '',
    },
    { title: '资产保管人工号', key: 'using_person_jobcode', default: '' },
    { title: '资产保管人姓名', key: 'using_person_name', default: '' },
  ]

  // 选择导出范围
  let range: 'current' | 'all' | null = null
  try {
    await ElMessageBox.confirm(
      `当前页面 ${recycleAssetStore.list.length} 条，总共 ${recycleAssetStore.pagination.total} 条。请选择：`,
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

  // 获取数据
  let exportData: RecycleAssetExtended[] = []
  let fileName = ''

  if (range === 'current') {
    exportData = recycleAssetStore.list
    fileName = `回收资产列表_当前页面_${recycleAssetStore.list.length}条.xlsx`
  } else if (range === 'all') {
    ElMessage.info('正在准备全部数据，请稍候...')
    if (recycleAssetStore.pagination.total > 1000) {
      const confirm = await ElMessageBox.confirm(
        '数据量较大，导出可能需要一些时间，是否继续？',
        '导出确认',
        { confirmButtonText: '继续', cancelButtonText: '取消', type: 'warning' },
      ).catch(() => false)
      if (!confirm) return
    }
    try {
      const allData = await recycleAssetStore.getList({
        page: 1,
        page_size: recycleAssetStore.pagination.total,
      })
      exportData = allData
      fileName = `回收资产列表_全部_${allData.length}条.xlsx`
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
    sheetName: '回收资产列表',
    confirmMessage: `确定要导出 ${exportData.length} 条回收资产数据吗？`,
    emptyMessage: '暂无回收资产数据可导出',
    successMessage: '回收资产数据导出成功',
    errorMessage: '回收资产数据导出失败，请重试',
  })
}

/**
 * 遮罩层点击返回
 */
const handleMaskBack = () => {
  router.go(-1)
}
</script>

<style lang="scss" scoped>
@use '@/assets/styles/common-forms.scss' as *;

.recycleasset-details-root {
  @include list-container;
}

.table-container {
  @include table-container;
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
