<!--
@file 智能列表数据管理容器，封装分页/搜索/数据加载逻辑
@component SmartListContainer
@usedBy
  - 多个 *Details.vue 页面（AssetContentDetails, ContractDetails 等）
@dependsOn
  - composables/usePaginationSearch: 分页搜索状态管理
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
import { computed, defineComponent, onMounted, ref, type PropType } from 'vue'
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

export default defineComponent({
  name: 'SmartListContainer',
  props: {
    storeConfig: {
      type: Object as PropType<PaginationSearchConfig<object>>,
      required: true,
    },
    autoLoad: {
      type: Boolean,
      default: true,
    },
    initialPage: {
      type: Number,
      default: 1,
    },
    initialPageSize: {
      type: Number,
      default: undefined,
    },
  },
  setup(props, { slots, expose }) {
    const {
      currentPage,
      pageSize,
      search,
      searchParams,
      total,
      isSearching,
      tableData,
      storeLoading,
      handleSizeChange,
      handleCurrentChange,
      performSearch,
      performSearchWithParams,
      refreshCurrentPage,
      resetToFirstPage,
      pageSizeOptions,
    } = usePaginationSearch<object>(props.storeConfig as PaginationSearchConfig<object>)

    // ===== 选中行状态 =====
    const selectedRows = ref<object[]>([])

    const handleSelectionChange = (rows: object[]) => {
      selectedRows.value = rows
    }

    const clearSelection = () => {
      selectedRows.value = []
    }

    // ===== 计算属性 =====
    const isLoading = computed(() => {
      return storeLoading.value || isSearching.value
    })

    // ===== 生命周期：自动加载数据 =====
    const hasLoaded = ref(false)

    onMounted(async () => {
      if (!props.autoLoad) {
        return
      }

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
        hasLoaded.value = false
      }
    })

    // ===== 暴露方法给父组件 =====
    expose({
      refresh: refreshCurrentPage,
      reset: resetToFirstPage,
      search: performSearch,
      searchWithParams: performSearchWithParams,
      currentPage,
      pageSize,
      data: tableData,
      clearSelection,
    })

    return {
      currentPage,
      pageSize,
      search,
      searchParams,
      total,
      isSearching,
      tableData,
      isLoading,
      selectedRows,
      pageSizeOptions,
      handleSizeChange,
      handleCurrentChange,
      performSearch,
      performSearchWithParams,
      refreshCurrentPage,
      resetToFirstPage,
      handleSelectionChange,
      clearSelection,
      slots,
    }
  },
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
