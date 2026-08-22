<!--
@file 员工列表管理页面，展示所有员工信息并支持增删改查及批量操作
@component UserDetails.vue
@usedBy
  - views/system/UserDetails.vue: 通过 router-view 渲染员工列表
  - views/system/UserManagementPage.vue: 用户管理页面中渲染员工列表
  - components/system/UserRoleAssignDialog.vue: 用户角色分配弹窗
  - api/userAPI: getUserRoles/assignUserRoles 用户角色相关接口
  - api/roleAPI: getRolePermissions 获取角色权限码列表接口
  - api/permissionAPI: getPermissionList 获取权限列表接口
@dependsOn
  - composables/useSmartListConfig: 列表配置
  - stores/userStore: 员工数据管理
  - components/commoncomponents/SmartListContainer: 数据管理容器
  - components/commoncomponents/CommonList: 列表展示组件
-->
<template>
  <div class="user-details-root">
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
            <!-- 状态列自定义渲染 -->
            <template #employee_status="{ row }">
              <span>{{ getStatusDisplay(row.employee_status) }}</span>
            </template>
            <!-- 部门列自定义渲染 -->
            <template #employee_department_name="{ row }">
              <span>{{ row.employee_department?.department_name || '-' }}</span>
            </template>
          </CommonList>

          <!-- 底部固定按钮组 -->
          <div class="bottom-buttons">
            <el-button type="success" @click="handleAddUser">新增员工</el-button>
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
            <el-button
              type="warning"
              :disabled="slotProps.selectedRows?.length !== 1"
              @click="openBindDialog(slotProps.selectedRows![0])"
            >
              绑定账号
            </el-button>
          </div>
        </template>
      </SmartListContainer>

      <!-- 子路由遮罩容器（新增/编辑表单浮层） -->
      <div v-if="isChildRouteActive" class="router-mask-container">
        <div class="mask" @click="handleMaskBack"></div>
        <div class="child-router-container">
          <router-view />
        </div>
      </div>
    </div>

    <BindAuthUserDialog
      v-model:visible="bindDialogVisible"
      mode="from-employee"
      :employee-jobcode="bindEmployeeJobcode"
      :employee-name="bindEmployeeName"
      @success="smartListRef?.refresh()"
    />
  </div>
</template>

<script lang="ts" setup>
defineOptions({ name: 'UserDetails' })

// ===== 导入顺序：Vue 核心 → 第三方库 → @/ 内部模块 =====
import { ref, watch, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { showErrorMessage, getAxiosStatus } from '@/utils/errorHandler'
import SmartListContainer from '@/components/commoncomponents/SmartListContainer.vue'
import CommonList from '@/components/commoncomponents/CommonList.vue'
import type { PaginationSearchConfig } from '@/composables/usePaginationSearch'
import type { SmartListContainerExpose } from '@/types/common'
import type { EmployeeExtended } from '@/types/user'
import BindAuthUserDialog from '@/components/system/BindAuthUserDialog.vue'
import { useUserStore } from '@/stores/userStore'
import { useDepartmentStore } from '@/stores/departmentStore'
import { userAPI } from '@/api/user'
import { getStatusDisplay } from '@/utils/Format'
import { userDetailsColumns as columns } from './userDetails.columns'
import { createUserExcelExport } from '@/composables/useUserExcelExport'

// ===== 状态与实例 =====
const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const departmentStore = useDepartmentStore()

/**
 * SmartListContainer 组件引用
 * 用于调用容器暴露的方法（如 refresh、reset）
 * 使用 SmartListContainerExpose 类型确保类型安全
 */
const smartListRef = ref<SmartListContainerExpose | null>(null)

// 绑定弹窗
const bindDialogVisible = ref(false)
const bindEmployeeJobcode = ref('')
const bindEmployeeName = ref('')

const openBindDialog = (row: EmployeeExtended) => {
  bindEmployeeJobcode.value = row.employee_jobcode
  bindEmployeeName.value = row.employee_name || ''
  bindDialogVisible.value = true
}

/**
 * 子路由激活状态
 * 用于控制子路由遮罩层的显示
 */
const isChildRouteActive = ref(false)

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
 * - search: 搜索配置（后端搜索，使用 search 参数）
 */
const storeConfig: PaginationSearchConfig<EmployeeExtended> = {
  store: {
    /**
     * 获取列表数据
     * @param params 分页查询参数
     * @returns 包含 count 和 results 的响应对象
     */
    getList: async (params) => {
      const response = await userStore.getList(params)
      return {
        count: userStore.pagination.total,
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
        get: () => userStore.pagination.page,
        set: (val: number) => {
          userStore.pagination.page = val
        },
      },
      page_size: {
        get: () => userStore.pagination.page_size,
        set: (val: number) => {
          userStore.pagination.page_size = val
        },
      },
      total: {
        get: () => userStore.pagination.total,
        set: (val: number) => {
          userStore.pagination.total = val
        },
      },
    },
    /**
     * 列表数据（computed 保持响应式）
     */
    list: computed(() => userStore.list),
    /**
     * 加载状态（computed 保持响应式）
     */
    loading: computed(() => userStore.loading),
    /**
     * 刷新标志（computed 保持响应式）
     * 用于子页面（如批量导入、表单编辑）通知列表刷新
     */
    refreshFlag: computed(() => userStore.refreshFlag),
    /**
     * 设置刷新标志
     * 子页面调用后，usePaginationSearch 会自动监听并触发列表刷新
     */
    setRefreshFlag: (flag: boolean) => userStore.setRefreshFlag(flag),
  },
  /**
   * 搜索配置
   * 【修复】使用 getFuzzySearch API 进行后端模糊搜索，而非 getList（不支持 search 参数）
   */
  search: {
    performSearch: async (keyword: string, page: number, page_size: number) => {
      const response = await userAPI.getFuzzySearch({ keyword, page, page_size })
      return {
        count: response.count,
        results: response.results as EmployeeExtended[],
      }
    },
  },
  defaultPageSize: 20,
  messages: {
    loadFailed: '加载用户列表失败',
    searchFailed: '搜索用户失败',
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
    const hasParent = matched.some((item) => item.name === 'UserDetails')
    const isSelfTop = matched[matched.length - 1]?.name === 'UserDetails'
    isChildRouteActive.value = hasParent && !isSelfTop
  },
  { immediate: true },
)

// ===== 事件处理 =====

/**
 * 新增员工
 */
const handleAddUser = () => {
  router.push({ name: 'UserForm', query: {} }).catch((err) => {
    showErrorMessage(err, '跳转失败，请刷新页面重试')
  })
}

/**
 * 批量导入
 */
const handleBatchImport = () => {
  router.push({ name: 'UserBatchImport' }).catch((err) => {
    showErrorMessage(err, '跳转失败，请刷新页面重试')
  })
}

/**
 * 编辑员工
 * @param row 行数据
 */
const handleEdit = (row: EmployeeExtended) => {
  if (!row.employee_jobcode) {
    ElMessage.error('无法编辑：员工工号不存在')
    return
  }
  router
    .push({
      name: 'UserForm',
      query: { jobcode: row.employee_jobcode },
    })
    .catch((err) => {
      showErrorMessage(err, '跳转失败，请刷新页面重试')
    })
}

/**
 * 删除员工
 * 【优化】添加二次确认弹窗，防止误删
 * 删除成功后通过 SmartListContainer 刷新列表
 * @param row 行数据
 */
const handleDelete = async (row: EmployeeExtended) => {
  if (!row.employee_jobcode) {
    ElMessage.error('无法删除：员工工号不存在')
    return
  }

  try {
    // 二次确认
    await ElMessageBox.confirm(
      `确定要删除员工 "${row.employee_name}" 吗？删除后数据不可恢复！`,
      '删除确认',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      },
    )
    await userStore.remove(row.employee_jobcode)
    ElMessage.success('删除成功')
    // 【架构优化】通过 SmartListContainer 刷新列表，保持数据一致性
    smartListRef.value?.refresh()
  } catch (err) {
    if (err === 'cancel') return // 用户取消删除
    const status = getAxiosStatus(err)
    if (status === 404) {
      ElMessage.error('无法删除：员工不存在或已被删除')
    } else if (status === 400) {
      ElMessage.error('无法删除：该员工有关联数据，不能删除')
    } else {
      showErrorMessage(err, '删除失败，请重试')
    }
  }
}

/**
 * 批量删除
 * 弹出确认框，确认后调用 store.removeBatch 执行批量删除
 * @param rows 选中的行数据
 */
const handleBatchDelete = async (rows: EmployeeExtended[] | undefined) => {
  if (!rows || rows.length === 0) {
    ElMessage.warning('请先选择要删除的数据')
    return
  }

  // 提取选中的唯一标识字段（根据实体类型调整字段名）
  const codes = rows.map((row) => row.employee_jobcode).filter((code): code is string => !!code)

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

    await userStore.removeBatch(codes)
    smartListRef.value?.clearSelection()
    await smartListRef.value?.refresh()
  } catch (err) {
    if (err === 'cancel') return
    showErrorMessage(err, '批量删除失败，请重试')
  }
}

/**
 * 遮罩层点击返回
 * 统一使用 router.go(-1) 返回上一页
 */
const handleMaskBack = () => {
  router.go(-1)
}

// ===== 导出 Excel（组合式函数，DR-5 物理提取）=====
const handleExportExcel = createUserExcelExport({ userStore, departmentStore })
</script>

<style lang="scss" scoped src="./UserDetails.scss"></style>