<!--
  SmartListContainer.vue
  智能列表数据管理容器组件

  职责：封装分页、搜索、数据加载等数据管理逻辑
  通过 slot 将管理好的数据状态暴露给子组件（如 CommonList）

  设计原则：
  1. 单一职责：本组件只负责数据管理，不负责 UI 展示
  2. 数据向下传递：通过 slot props 将状态传递给子组件
  3. 事件向上冒泡：子组件的事件通过 emit 传递给父组件处理
  4. 自动加载：组件挂载时自动发起首次数据请求

  使用示例：
  <SmartListContainer :store-config="storeConfig">
    <template #default="{
      data, loading, currentPage, pageSize, total, search,
      handleSizeChange, handleCurrentChange, refresh
    }">
      <CommonList
        :data="data"
        :loading="loading"
        v-model:current-page="currentPage"
        v-model:page-size="pageSize"
        :total="total"
        :columns="columns"
        @search="handleSearch"
      />
    </template>
  </SmartListContainer>
-->
<template>
  <div class="smart-list-container">
    <!--
      默认插槽：将数据管理状态通过 slot props 传递给子组件
      子组件可以是 CommonList 或任何自定义列表组件
    -->
    <slot
      :data="tableData"
      :loading="isLoading"
      :current-page="currentPage"
      :page-size="pageSize"
      :total="total"
      :search="search"
      :search-params="searchParams"
      :is-searching="isSearching"
      :page-size-options="pageSizeOptions"
      :handle-size-change="handleSizeChange"
      :handle-current-change="handleCurrentChange"
      :perform-search="performSearch"
      :perform-search-with-params="performSearchWithParams"
      :refresh="refreshCurrentPage"
      :reset="resetToFirstPage"
      :selected-rows="selectedRows"
      :handle-selection-change="handleSelectionChange"
      :clear-selection="clearSelection"
    >
      <!--
        透传插槽：将子组件（如 CommonList）的插槽透传给父组件
        使父组件能够自定义列渲染等插槽内容
      -->
      <template v-for="(_, name) in $slots" :key="name">
        <slot :name="name" />
      </template>
    </slot>
  </div>
</template>

<script lang="ts">
/**
 * 组件名称定义
 * 用于在 Vue DevTools 中识别组件
 */
export default {
  name: 'SmartListContainer',
}
</script>

<script lang="ts" setup generic="T extends object">
// ===== 导入顺序：Vue 核心 → 第三方库 → @/ 内部模块 =====
import { computed, onMounted, ref } from 'vue'
import type { PropType } from 'vue'
import { ElMessage } from 'element-plus'
import { usePaginationSearch, type PaginationSearchConfig } from '@/composables/usePaginationSearch'

// ======================================================================
// 调用链文档（调试用）
//
// 【页面级调用链】
// 页面 (如 AssetDetails.vue)
//   └─ SmartListContainer(:store-config="storeConfig")
//       ├─ usePaginationSearch(storeConfig)          ← 核心 composable
//       │   ├─ reactiveAccess.readReactive()         ← 读取 pagination page/page_size/total
//       │   ├─ reactiveAccess.writeReactive()        ← 写入 pagination
//       │   ├─ usePaginationSearchState()            ← 搜索状态管理
//       │   │   ├─ performSearch()                   ← 单关键词搜索
//       │   │   │   └─ searchConfig.performSearch()  ← 调用 store 的搜索 API
//       │   │   └─ performSearchWithParams()         ← 多参数搜索
//       │   │       └─ searchConfig.performSearchWithParams()
//       │   ├─ loadList(page, page_size)             ← 加载列表数据
//       │   │   └─ store.getList(params)             ← 调用 createEntityStore 的 API
//       │   ├─ handleSizeChange(newSize)             ← 每页条数变更
//       │   │   ├─ performSearch() 或 loadList()     ← 根据是否有搜索词决定
//       │   ├─ handleCurrentChange(newPage)          ← 页码变更
//       │   │   ├─ performSearch() 或 loadList()
//       │   └─ refreshCurrentPage()                  ← 刷新当前页
//       │       └─ performSearch() 或 loadList()
//       │
//       ├─ CommonList(:data="tableData")             ← UI 展示层
//       │   ├─ el-pagination                         ← 分页控件
//       │   │   ├─ @current-change → handleCurrentChange
//       │   │   └─ @size-change → handleSizeChange
//       │   ├─ SearchBar                             ← 搜索栏
//       │   │   └─ @search → performSearch / performSearchWithParams
//       │   └─ CommonListActions                     ← 操作按钮（新增/删除/导出）
//       │
//       └─ defineExpose({ refresh, reset, performSearch })
//           └─ 父组件可通过 ref 调用
//
// 【数据流】
// 用户操作 → SmartListContainer → usePaginationSearch → store API → 后端
// 后端响应 → store.pagination.total 更新 → total computed 触发 → 模板响应式更新
// 搜索结果 → searchResults ref → tableData computed 切换数据源 → CommonList 展示
//
// 【refreshFlag 自动刷新机制】
// 子页面（如批量导入成功）→ store.setRefreshFlag(true)
//   → watch(refreshFlag) 触发 → refreshCurrentPage()
//   → performSearch() 或 loadList() → 列表自动刷新
// ======================================================================

// ===== Props 定义 =====
/**
 * Props 接口定义
 * 使用 Vue 的 PropType 进行运行时类型检查
 */
const props = defineProps({
  /**
   * Store 配置对象
   * 包含数据获取方法、分页状态、搜索配置等
   * 必需参数，由父组件传入
   */
  storeConfig: {
    type: Object as PropType<PaginationSearchConfig<T>>,
    required: true,
  },

  /**
   * 是否自动加载数据
   * 默认为 true，组件挂载时自动发起首次请求
   * 设为 false 时，需父组件手动调用 refresh 方法
   */
  autoLoad: {
    type: Boolean,
    default: true,
  },

  /**
   * 初始页码
   * 首次加载时的默认页码，默认为 1
   */
  initialPage: {
    type: Number,
    default: 1,
  },

  /**
   * 初始每页条数
   * 首次加载时的默认分页大小
   * 如未指定，使用 storeConfig.defaultPageSize 或 20
   */
  initialPageSize: {
    type: Number,
    default: undefined,
  },
})

// ===== 使用 Composable 管理分页和搜索状态 =====
/**
 * usePaginationSearch 是核心的分页搜索逻辑复用函数
 * 它内部管理了 currentPage、pageSize、search、loading 等响应式状态
 * 并提供了 handleSizeChange、handleCurrentChange、performSearch 等方法
 */
const {
  // 状态
  currentPage,
  pageSize,
  search,
  searchParams,
  total,
  isSearching,
  tableData,
  storeLoading,

  // 方法
  handleSizeChange,
  handleCurrentChange,
  performSearch,
  performSearchWithParams,
  refreshCurrentPage,
  resetToFirstPage,

  // 配置
  pageSizeOptions,
} = usePaginationSearch<T>(props.storeConfig)

// ===== 选中行状态 =====
/**
 * 当前选中的行数据
 * 由 CommonList 的 selection-change 事件更新
 * 用于批量删除等批量操作场景
 */
const selectedRows = ref<T[]>([])

/**
 * 处理多选行变化
 * 当 CommonList 触发 selection-change 时更新选中状态
 * @param rows 当前选中的所有行数据
 */
const handleSelectionChange = (rows: T[]) => {
  selectedRows.value = rows
}

/**
 * 清空选中状态
 * 批量删除成功后调用，重置选中行
 * 同时通知子组件（如 CommonList）清空表格勾选状态
 */
const clearSelection = () => {
  selectedRows.value = []
}

// ===== 计算属性 =====
/**
 * 加载状态计算属性
 * 合并 store 的 loading 状态和搜索中的状态
 * 任一状态为 true 时，显示加载中
 */
const isLoading = computed(() => {
  return storeLoading.value || isSearching.value
})

// ===== 生命周期：自动加载数据 =====
/**
 * 组件挂载时自动加载数据
 * 根据 autoLoad prop 决定是否自动发起请求
 * 使用 initialPage 和 initialPageSize 作为初始参数
 *
 * 【修复】添加 hasLoaded 标志防止重复请求
 * 由于某些路由配置（如可选参数路由 :asset_code?）可能导致组件多次挂载，
 * 需要确保数据只加载一次
 */
const hasLoaded = ref(false)

onMounted(async () => {
  if (!props.autoLoad) {
    return
  }

  // 防止重复加载
  if (hasLoaded.value) {
    console.warn('[SmartListContainer] 数据已加载，跳过重复请求')
    return
  }
  hasLoaded.value = true

  try {
    const pageSizeValue = props.initialPageSize ?? props.storeConfig.defaultPageSize ?? 20
    await props.storeConfig.store.getList({
      page: props.initialPage,
      page_size: pageSizeValue,
    })
  } catch (error) {
    console.error('[SmartListContainer] 初始加载失败:', error)
    ElMessage.error(props.storeConfig.messages?.loadFailed ?? '加载数据失败')
    // 重置标志，允许下次尝试
    hasLoaded.value = false
  }
})

// ===== 暴露方法给父组件 =====
/**
 * 通过 defineExpose 暴露内部方法
 * 父组件可通过 ref 获取这些方法来手动控制数据加载
 *
 * 暴露的方法：
 * - refresh: 刷新当前页数据
 * - reset: 重置到第一页并清空搜索
 * - performSearch: 执行搜索
 */
defineExpose({
  /**
   * 刷新当前页数据
   * 根据当前是否有搜索词，决定是重新搜索还是重新加载列表
   */
  refresh: refreshCurrentPage,

  /**
   * 重置到第一页
   * 清空搜索词、搜索状态，回到初始状态
   */
  reset: resetToFirstPage,

  /**
   * 执行搜索
   * @param keyword 搜索关键词
   */
  search: performSearch,

  /**
   * 执行多参数搜索
   * @param params 搜索参数对象（key-value 对）
   */
  searchWithParams: performSearchWithParams,

  /**
   * 当前页码（响应式）
   * 父组件可通过 ref 读取当前页码
   */
  currentPage,

  /**
   * 每页条数（响应式）
   * 父组件可通过 ref 读取当前分页大小
   */
  pageSize,

  /**
   * 表格数据（响应式）
   * 父组件可通过 ref 读取当前数据
   */
  data: tableData,

  /**
   * 清空选中状态
   * 批量删除成功后调用，重置选中行
   */
  clearSelection,
})
</script>

<style scoped>
/**
 * SmartListContainer 样式
 * 作为容器组件，本身不展示可见内容
 * 仅作为数据管理逻辑的封装层
 */
.smart-list-container {
  width: 100%;
  height: 100%;
}
</style>
