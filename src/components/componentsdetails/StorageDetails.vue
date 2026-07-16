<!--
  StorageDetails.vue
  仓库列表页面（重构版）
  
  架构调整：
  1. 使用 SmartListContainer 封装数据管理逻辑（分页、搜索、加载）
  2. CommonList 只负责 UI 展示，不管理数据
  3. 从本地搜索改为后端搜索，与其他列表页保持一致
  
  数据流：
  SmartListContainer (数据管理) → slot props → CommonList (纯展示)
  
  功能：
  - 展示仓库列表（支持增删改查）
  - 子路由：新增/编辑仓库表单（浮层遮罩）
-->
<template>
  <div class="storage-details-root">
    <div class="table-container">
      <!-- 
        表格容器
        使用 SmartListContainer 管理数据，通过 slot 将数据传递给 CommonList
      -->
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
            :show-detail-button="false"
            :enable-search="true"
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
            <!-- 仓库类型列自定义渲染 -->
            <template #storage_type="{ row }">
              <span>{{ storageMapping[row.storage_type] || '未知类型' }}</span>
            </template>
          </CommonList>

          <!-- 底部固定按钮（新增） -->
          <div class="bottom-buttons">
            <el-button type="primary" @click="handleAddStorage">新增仓库</el-button>
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

      <!-- 子路由遮罩容器（新增/编辑表单浮层） -->
      <div v-if="isChildRouteActive" class="router-mask-container">
        <div class="mask" @click="handleMaskBack"></div>
        <div class="child-router-container">
          <router-view></router-view>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
/**
 * 组件名称定义
 * 必须与路由 meta.componentName 一致
 */
export default {
  name: 'StorageDetails',
}
</script>

<script lang="ts" setup>
// ===== 导入顺序：Vue 核心 → 第三方库 → @/ 内部模块 =====
import { ref, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import SmartListContainer from '@/components/commoncomponents/SmartListContainer.vue'
import CommonList from '@/components/commoncomponents/CommonList.vue'
import type { TableColumn } from '@/components/commoncomponents/CommonList.vue'
import type { SmartListContainerExpose } from '@/types/common'
import { useStorageStore } from '@/stores/storageStore'
import { useSmartListConfig } from '@/composables/useSmartListConfig'
import type { Storage } from '@/utils/Storage'
import { storageMapping } from '@/utils/Format'

// ===== 状态与实例 =====
const router = useRouter()
const route = useRoute()
const storageStore = useStorageStore()

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
  { prop: 'storage_code', label: '仓库编码', width: 180, align: 'center' },
  { prop: 'storage_name', label: '仓库名称', width: 180, align: 'left' },
  {
    type: 'custom',
    prop: 'storage_type',
    label: '仓库类型',
    width: 130,
    align: 'center',
    slotName: 'storage_type',
  },
  { prop: 'storage_address', label: '仓库地址', width: 250, align: 'left' },
  { prop: 'storage_description', label: '仓库描述', width: 250, align: 'left' },
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
 * - search: 搜索配置（统一使用 storageStore.getList）
 */
const storeConfig = useSmartListConfig<Storage>({
  store: storageStore,
  entityName: '仓库',
  defaultPageSize: 10,
})

// ===== 路由监听：控制子路由遮罩 =====
/**
 * 监听路由变化，判断是否需要显示子路由遮罩层
 * 当存在父路由且当前不是顶层路由时，表示进入了子路由
 */
watch(
  () => route.matched,
  (matched) => {
    const hasParentRoute = matched.some((item) => item.name === 'StorageDetails')
    const isSelfTop = matched[matched.length - 1]?.name === 'StorageDetails'
    isChildRouteActive.value = hasParentRoute && !isSelfTop
  },
  { immediate: true },
)

// ===== 事件处理 =====

/**
 * 编辑仓库
 * @param row 待编辑的行数据
 */
const handleEdit = (row: Storage) => {
  if (!row.storage_code) {
    ElMessage.error('仓库编码不存在，无法编辑')
    return
  }
  router.push({ name: 'StorageForm', query: { code: row.storage_code } }).catch((err) => {
    ElMessage.error(`跳转失败: ${err.message || '未知错误'}`)
  })
}

/**
 * 删除仓库
 * 添加二次确认弹窗，防止误删
 * @param row 待删除的行数据
 */
const handleDelete = (row: Storage) => {
  if (!row.storage_code) {
    ElMessage.error('仓库编码不存在，无法删除')
    return
  }
  ElMessageBox.confirm('确定要删除该仓库吗？删除后不可恢复。', '删除确认', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning',
  })
    .then(() => {
      return storageStore.remove(row.storage_code)
    })
    .then(() => {
      ElMessage.success('仓库删除成功')
      // 通过 SmartListContainer 刷新列表，保持数据一致性
      smartListRef.value?.refresh()
    })
    .catch((error) => {
      if (error !== 'cancel') {
        ElMessage.error(`删除失败: ${error.message || '未知错误'}`)
      }
    })
}

/**
 * 批量删除
 * 弹出确认框，确认后调用 store.removeBatch 执行批量删除
 * @param rows 选中的行数据
 */
const handleBatchDelete = async (rows: Storage[] | undefined) => {
  if (!rows || rows.length === 0) {
    ElMessage.warning('请先选择要删除的数据')
    return
  }

  // 提取选中的唯一标识字段（根据实体类型调整字段名）
  const codes = rows.map((row) => row.storage_code).filter((code): code is string => !!code)

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

    await storageStore.removeBatch(codes)
    smartListRef.value?.clearSelection()
    await smartListRef.value?.refresh()
  } catch (err) {
    if (err === 'cancel') return
    console.error('批量删除失败:', err)
    ElMessage.error('批量删除失败，请重试')
  }
}

/**
 * 新增仓库
 */
const handleAddStorage = () => {
  router.push({ name: 'StorageForm' }).catch((err) => {
    ElMessage.error(`跳转失败: ${err.message || '未知错误'}`)
  })
}

/**
 * 批量导入仓库
 * 跳转到 StorageBatchImport 子路由
 */
const handleBatchImport = () => {
  router.push({ name: 'StorageBatchImport' }).catch((err) => {
    ElMessage.error(`跳转失败: ${err.message || '未知错误'}`)
  })
}

/**
 * 遮罩层点击返回
 * 使用 router.go(-1) 与其他模块保持一致
 */
const handleMaskBack = () => {
  router.go(-1)
}
</script>

<style lang="scss" scoped>
@use '@/assets/styles/common-forms.scss' as *;

.storage-details-root {
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
