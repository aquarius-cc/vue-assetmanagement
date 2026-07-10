<!--
  DepartmentDetails.vue
  部门管理列表页（重构版 - 方案A架构）

  架构调整：
  1. 引入 SmartListContainer 管理数据（分页、搜索、加载状态）
  2. CommonList 纯展示，不管理数据
  3. 搜索统一使用 departmentStore.getList({ search: keyword }) 后端搜索
  4. 删除后使用 smartListRef.value?.refresh() 刷新列表
  5. 移除 isDataLoaded 和 onMounted 中的 getList() 调用（SmartListContainer 自动加载）

  数据流：
  SmartListContainer (数据管理) → slot props → CommonList (纯展示)

  功能：
  - 展示部门列表（支持后端分页和搜索）
  - 新增部门、编辑部门、删除部门（带确认弹窗）
  - 批量导入
  - 子路由：新增/编辑表单（浮层遮罩）
-->
<template>
  <div class="department-details-root">
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
            :show-detail-button="false"
            :show-actions="true"
            :enable-edit="true"
            :enable-delete="true"
            :enable-selection="true"
            :search-placeholder="'搜索部门...'"
            :page-size-options="slotProps.pageSizeOptions"
            @size-change="slotProps.handleSizeChange"
            @current-change="slotProps.handleCurrentChange"
            @search="slotProps.performSearch"
            @edit="handleEdit"
            @delete="handleDelete"
            @selection-change="slotProps.handleSelectionChange"
          />

          <!-- 底部固定按钮组 -->
          <div class="bottom-buttons">
            <el-button type="primary" @click="handleAdd">新增部门</el-button>
            <el-button type="success" @click="handleBatchImport">批量导入</el-button>
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
  name: 'DepartmentDetails',
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
import type { Department } from '@/utils/Department'
import { useDepartmentStore } from '@/stores/departmentStore'
import type { SmartListContainerExpose } from '@/types/common'

// ===== 状态与实例 =====
const route = useRoute()
const router = useRouter()
const departmentStore = useDepartmentStore()

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
  { type: 'index', label: '序号', width: 80, align: 'center' },
  { prop: 'department_code', label: '部门编码', width: 140, align: 'center' },
  { prop: 'department_name', label: '部门名称', width: 200, align: 'center' },
  { prop: 'sort_order', label: '排序', width: 80, align: 'center' },
  { prop: 'department_information', label: '部门信息员', width: 160, align: 'center' },
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
 * - search: 搜索配置（后端搜索）
 */
const storeConfig: PaginationSearchConfig<Department> = {
  store: {
    /**
     * 获取列表数据
     * @param params 分页查询参数
     * @returns 包含 count 和 results 的响应对象
     */
    getList: async (params) => {
      const response = await departmentStore.getList(params)
      return {
        count: departmentStore.pagination.total,
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
        get: () => departmentStore.pagination.page,
        set: (val: number) => {
          departmentStore.pagination.page = val
        },
      },
      page_size: {
        get: () => departmentStore.pagination.page_size,
        set: (val: number) => {
          departmentStore.pagination.page_size = val
        },
      },
      total: {
        get: () => departmentStore.pagination.total,
        set: (val: number) => {
          departmentStore.pagination.total = val
        },
      },
    },
    /**
     * 列表数据（computed 保持响应式）
     */
    list: computed(() => departmentStore.list),
    /**
     * 加载状态（computed 保持响应式）
     */
    loading: computed(() => departmentStore.loading),
    /**
     * 刷新标志（computed 保持响应式）
     * 用于子页面（如批量导入、表单编辑）通知列表刷新
     */
    refreshFlag: computed(() => departmentStore.refreshFlag),
    /**
     * 设置刷新标志
     * 子页面调用后，usePaginationSearch 会自动监听并触发列表刷新
     */
    setRefreshFlag: (flag: boolean) => departmentStore.setRefreshFlag(flag),
  },
  /**
   * 搜索配置
   * 使用后端搜索，统一调用 departmentStore.getList({ search: keyword })
   */
  search: {
    performSearch: async (keyword: string, page: number, page_size: number) => {
      const response = await departmentStore.getList({ search: keyword, page, page_size })
      return {
        count: departmentStore.pagination.total,
        results: response,
      }
    },
  },
  defaultPageSize: 20,
  messages: {
    loadFailed: '加载部门列表失败',
    searchFailed: '搜索部门失败',
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
    const hasParent = matched.some((item) => item.name === 'DepartmentDetails')
    const isSelfTop = matched[matched.length - 1]?.name === 'DepartmentDetails'
    isChildRouteActive.value = hasParent && !isSelfTop
  },
  { immediate: true },
)

// ===== 事件处理 =====

/**
 * 新增部门：跳转到表单页面（子路由）
 */
const handleAdd = () => {
  router.push({ name: 'DepartmentForm', query: {} }).catch((err) => {
    console.error('新增部门跳转失败:', err)
    ElMessage.error('跳转失败，请刷新页面重试')
  })
}

/**
 * 批量导入：跳转到批量导入页面
 */
const handleBatchImport = () => {
  router.push({ name: 'DepartmentBatchImport' }).catch((err) => {
    console.error('批量导入跳转失败:', err)
    ElMessage.error('跳转失败，请刷新页面重试')
  })
}

/**
 * 编辑部门：携带部门编码跳转到表单页面
 * @param row 行数据
 */
const handleEdit = (row: Department) => {
  if (!row.department_code) {
    ElMessage.warning('部门编码缺失，无法编辑')
    return
  }
  router
    .push({
      name: 'DepartmentForm',
      query: { code: row.department_code },
    })
    .catch((err) => {
      console.error('编辑部门跳转失败:', err)
      ElMessage.error('跳转失败，请刷新页面重试')
    })
}

/**
 * 删除部门：二次确认后删除，并通过 SmartListContainer 刷新列表
 * @param row 行数据
 */
const handleDelete = async (row: Department) => {
  if (!row.department_code) {
    ElMessage.error('无法删除：部门编码不存在')
    return
  }

  try {
    // 二次确认
    await ElMessageBox.confirm('确定要删除该部门吗？删除后数据不可恢复！', '删除确认', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    })
    await departmentStore.remove(row.department_code)
    ElMessage.success('删除成功')
    // 【架构优化】通过 SmartListContainer 刷新列表，保持数据一致性
    smartListRef.value?.refresh()
  } catch (err) {
    if (err === 'cancel') return // 用户取消删除
    console.error('删除部门异常:', err)
    ElMessage.error('删除失败，请重试')
  }
}

/**
 * 批量删除
 * 弹出确认框，确认后调用 store.removeBatch 执行批量删除
 * @param rows 选中的行数据
 */
const handleBatchDelete = async (rows: Department[] | undefined) => {
  if (!rows || rows.length === 0) {
    ElMessage.warning('请先选择要删除的数据')
    return
  }

  // 提取选中的唯一标识字段（根据实体类型调整字段名）
  const codes = rows
    .map((row) => row.department_code)
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

    await departmentStore.removeBatch(codes)
    smartListRef.value?.clearSelection()
    await smartListRef.value?.refresh()
  } catch (err) {
    if (err === 'cancel') return
    console.error('批量删除失败:', err)
    ElMessage.error('批量删除失败，请重试')
  }
}

/**
 * 遮罩层点击：关闭子路由，返回列表页
 * 统一使用 router.go(-1) 返回上一页
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
.department-details-root {
  @include list-container;

  .table-container {
    @include table-container;
    margin-bottom: 80px; // 为底部按钮预留空间
  }
}

// 底部按钮：复用全局底部按钮样式
.bottom-buttons {
  @include bottom-buttons;

  .el-button {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
    transition: all 0.3s ease;

    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    }
  }
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

// 响应式微调（与全局 responsive-design 互补，针对本页面特有类名）
@include responsive-design;

@media (max-width: 768px) {
  .department-details-root {
    padding: 8px;
  }
}
</style>
