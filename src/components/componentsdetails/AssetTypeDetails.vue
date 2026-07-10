<!--
  AssetTypeDetails.vue
  资产分类列表页面（重构版）

  架构调整：
  1. 使用 SmartListContainer 封装数据管理逻辑（分页、搜索、加载）
  2. CommonList 只负责 UI 展示，不管理数据
  3. 解决原架构中前端过滤不准确、无分页的问题

  数据流：
  SmartListContainer (数据管理) → slot props → CommonList (纯展示)

  功能：
  - 展示资产分类列表（支持后端分页和搜索）
  - 新增分类、编辑分类、删除分类（带确认弹窗）
  - 批量导入
  - 子路由：新增/编辑表单（浮层遮罩）
-->
<template>
  <div class="asset-type-details-root">
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
            :show-detail-button="false"
            :show-actions="true"
            :enable-edit="true"
            :enable-delete="true"
            :enable-selection="true"
            :row-key="'asset_type_code'"
            :action-column-width="180"
            :page-size-options="slotProps.pageSizeOptions"
            @size-change="slotProps.handleSizeChange"
            @current-change="slotProps.handleCurrentChange"
            @search="slotProps.performSearch"
            @edit="handleEdit"
            @delete="handleDelete"
            @selection-change="slotProps.handleSelectionChange"
          >
            <!-- 资产分类类型列自定义渲染 -->
            <template #asset_type_category="{ row }">
              <el-tag :type="getAssetTypeTagType(row.asset_type_category)">
                {{ assetTypeMapping[row.asset_type_category] || '未知分类' }}
              </el-tag>
            </template>
          </CommonList>

          <!-- 底部固定按钮组 -->
          <div class="bottom-buttons">
            <el-button type="success" @click="handleAddAssetType">新增资产分类</el-button>
            <el-button type="warning" @click="handleBatchImport">批量导入</el-button>
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

    <!-- 子路由遮罩容器（新增/编辑表单浮层） -->
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
  name: 'AssetTypeDetails',
}
</script>

<script lang="ts" setup>
// ===== 导入顺序：Vue 核心 → 第三方库 → @/ 内部模块 =====
import { ref, watch, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { isAxiosError } from 'axios'
import SmartListContainer from '@/components/commoncomponents/SmartListContainer.vue'
import CommonList from '@/components/commoncomponents/CommonList.vue'
import type { TableColumn } from '@/components/commoncomponents/CommonList.vue'
import type { PaginationSearchConfig } from '@/composables/usePaginationSearch'
import type { AssetType } from '@/utils/AssetType'
import { useAssetTypeStore } from '@/stores/assetTypeStore'
import { assetTypeMapping } from '@/utils/Format'
import type { SmartListContainerExpose } from '@/types/common'

// ===== 状态与实例 =====
const route = useRoute()
const router = useRouter()
const assetTypeStore = useAssetTypeStore()

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

// ===== 辅助函数 =====

/**
 * 获取资产分类类型对应的 el-tag 类型
 * @param category 资产分类类型值
 * @returns 标签类型
 */
const getAssetTypeTagType = (
  category: string,
): 'success' | 'primary' | 'warning' | 'danger' | 'info' => {
  switch (category) {
    case 'hardware':
      return 'success'
    case 'software':
      return 'primary'
    case 'lowvalue':
      return 'warning'
    case 'other':
      return 'danger'
    default:
      return 'info'
  }
}

// ===== 表格列配置 =====
/**
 * 表格列定义
 * 每一列的渲染方式、标题、宽度等属性
 */
const columns: TableColumn[] = [
  { type: 'index', label: '序号', width: 60, align: 'center' },
  { prop: 'asset_type_code', label: '资产分类码', width: 150, align: 'center' },
  { prop: 'asset_type_primary', label: '一级分类名称', width: 150, align: 'left' },
  { prop: 'asset_type_secondary', label: '二级分类名称', width: 150, align: 'left' },
  {
    type: 'custom',
    prop: 'asset_type_category',
    label: '资产分类类型',
    width: 130,
    align: 'center',
    slotName: 'asset_type_category',
  },
  { prop: 'asset_type_description', label: '资产分类描述', width: 200, align: 'left' },
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
const storeConfig: PaginationSearchConfig<AssetType> = {
  store: {
    /**
     * 获取列表数据
     * @param params 分页查询参数
     * @returns 包含 count 和 results 的响应对象
     */
    getList: async (params) => {
      const response = await assetTypeStore.getList(params)
      return {
        count: assetTypeStore.pagination.total,
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
        get: () => assetTypeStore.pagination.page,
        set: (val: number) => {
          assetTypeStore.pagination.page = val
        },
      },
      page_size: {
        get: () => assetTypeStore.pagination.page_size,
        set: (val: number) => {
          assetTypeStore.pagination.page_size = val
        },
      },
      total: {
        get: () => assetTypeStore.pagination.total,
        set: (val: number) => {
          assetTypeStore.pagination.total = val
        },
      },
    },
    /**
     * 列表数据（computed 保持响应式）
     */
    list: computed(() => assetTypeStore.list),
    /**
     * 加载状态（computed 保持响应式）
     */
    loading: computed(() => assetTypeStore.loading),
    /**
     * 刷新标志（computed 保持响应式）
     * 用于子页面（如批量导入、表单编辑）通知列表刷新
     */
    refreshFlag: computed(() => assetTypeStore.refreshFlag),
    /**
     * 设置刷新标志
     * 子页面调用后，usePaginationSearch 会自动监听并触发列表刷新
     */
    setRefreshFlag: (flag: boolean) => assetTypeStore.setRefreshFlag(flag),
  },
  /**
   * 搜索配置
   * 【优化】改为后端搜索，支持多字段搜索
   */
  search: {
    performSearch: async (keyword: string, page: number, page_size: number) => {
      const response = await assetTypeStore.getList({ search: keyword, page, page_size })
      return {
        count: assetTypeStore.pagination.total,
        results: response,
      }
    },
  },
  defaultPageSize: 10,
  messages: {
    loadFailed: '加载资产分类列表失败',
    searchFailed: '搜索资产分类失败',
    invalidPage: '页码超出范围，已跳转至最后一页',
  },
}

// ===== 路由监听：控制子路由遮罩 =====
/**
 * 监听路由变化，判断是否需要显示子路由遮罩层
 * 当访问子路由（如新增/编辑页）时显示遮罩
 */
watch(
  () => route.matched,
  (matched) => {
    const hasParent = matched.some((item) => item.name === 'AssetTypeDetails')
    const isSelfTop = matched[matched.length - 1]?.name === 'AssetTypeDetails'
    isChildRouteActive.value = hasParent && !isSelfTop
  },
  { immediate: true },
)

// ===== 事件处理 =====

/**
 * 新增资产分类
 */
const handleAddAssetType = () => {
  router.push({ name: 'AssetTypeForm', query: {} }).catch((err) => {
    console.error('跳转新增页面失败:', err)
    ElMessage.error('跳转失败，请刷新页面重试')
  })
}

/**
 * 批量导入
 */
const handleBatchImport = () => {
  router.push({ name: 'AssetTypeBatchImport' }).catch((err) => {
    console.error('跳转批量导入页面失败:', err)
    ElMessage.error('跳转失败，请刷新页面重试')
  })
}

/**
 * 编辑资产分类
 * @param row 行数据
 */
const handleEdit = (row: AssetType) => {
  if (!row.asset_type_code) {
    ElMessage.error('无法编辑：资产分类编码不存在')
    return
  }
  router
    .push({
      name: 'AssetTypeForm',
      query: { code: row.asset_type_code },
    })
    .catch((err) => {
      console.error('跳转编辑页面失败:', err)
      ElMessage.error('跳转失败，请刷新页面重试')
    })
}

/**
 * 删除资产分类
 * 【优化】添加二次确认弹窗，防止误删
 * @param row 行数据
 */
const handleDelete = async (row: AssetType) => {
  if (!row.asset_type_code) {
    ElMessage.error('无法删除：资产分类编码不存在')
    return
  }

  try {
    // 二次确认
    await ElMessageBox.confirm('确定要删除该资产分类吗？删除后数据不可恢复！', '删除确认', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    })
    await assetTypeStore.remove(row.asset_type_code)
    ElMessage.success('删除成功')
    // 【架构优化】通过 SmartListContainer 刷新列表，保持数据一致性
    smartListRef.value?.refresh()
  } catch (err) {
    if (err === 'cancel') return // 用户取消删除
    if (isAxiosError(err) && err.response?.status === 404) {
      ElMessage.error('无法删除：资产分类不存在或已被删除')
    } else if (isAxiosError(err) && err.response?.status === 400) {
      ElMessage.error('无法删除：该资产分类已被使用，不能删除')
    } else {
      console.error('删除失败:', err)
      ElMessage.error('删除失败，请重试')
    }
  }
}

/**
 * 批量删除资产分类
 * 弹出确认框，确认后调用 store.removeBatch 执行批量删除
 * @param rows 选中的资产分类行数据
 */
const handleBatchDelete = async (rows: AssetType[] | undefined) => {
  if (!rows || rows.length === 0) {
    ElMessage.warning('请先选择要删除的数据')
    return
  }

  // 提取选中的资产分类编码
  const codes = rows
    .map((row) => row.asset_type_code)
    .filter((code): code is string => !!code)

  if (codes.length === 0) {
    ElMessage.error('无法删除：选中的数据缺少资产分类编码')
    return
  }

  try {
    // 二次确认弹窗
    await ElMessageBox.confirm(
      `确定要删除选中的 ${codes.length} 条资产分类吗？删除后数据不可恢复！`,
      '批量删除确认',
      {
        confirmButtonText: '确定删除',
        cancelButtonText: '取消',
        type: 'warning',
      },
    )

    // 执行批量删除
    await assetTypeStore.removeBatch(codes)

    // 清空选中状态并刷新列表
    smartListRef.value?.clearSelection()
    await smartListRef.value?.refresh()
  } catch (err) {
    if (err === 'cancel') return // 用户取消删除
    console.error('批量删除失败:', err)
    ElMessage.error('批量删除失败，请重试')
  }
}

/**
 * 遮罩层点击返回
 */
const handleMaskBack = () => {
  router.go(-1)
}
</script>

<style lang="scss" scoped>
// 导入公共样式 mixin 库（使用现代 @use 语法）
@use '@/assets/styles/common-forms.scss' as *;
@use '@/assets/styles/global-scroll.scss' as *;

// 根容器：使用统一列表容器样式
.asset-type-details-root {
  @include list-container;

  .table-container {
    @include table-container;
    margin-bottom: 80px; // 为底部按钮预留空间
  }
}

// 底部按钮：复用全局底部按钮样式
.bottom-buttons {
  @include bottom-buttons;
}

// 子路由遮罩容器：复用全局样式
.router-mask-container {
  @include router-mask-container;

  .mask {
    @include mask;
  }

  .child-router-container {
    @include child-router-container;
  }
}

// 可选：覆盖 Element Plus 表格内滚动条样式（不影响全局）
.el-scrollbar {
  .el-scrollbar__bar.is-horizontal {
    height: 8px;
  }
  .el-scrollbar__bar.is-vertical {
    width: 8px;
  }
  .el-scrollbar__thumb {
    opacity: 1;
    background-color: var(--text-placeholder);
    box-shadow: 0 0 3px rgba(0, 0, 0, 0.15);
  }
}

@include responsive-design;
</style>
