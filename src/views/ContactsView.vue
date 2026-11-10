<!--
@file 通讯录页面，展示部门树与人员列表，支持搜索筛选
@component ContactsView.vue
@usedBy
  - router/index.ts: 路由懒加载通讯录页面
@dependsOn
  - stores/userStore: 员工数据接口（getList/getFuzzySearch）
  - stores/departmentStore: getDepartmentTree 获取部门树
  - composables/useDebouncedSearch: 防抖搜索
-->
<template>
  <div class="contacts-view">
    <!-- 左侧：部门树 -->
    <div class="contacts-sidebar">
      <el-card class="sidebar-card" body-style="padding: 12px;">
        <template #header>
          <div class="sidebar-header">
            <el-icon><OfficeBuilding /></el-icon>
            <span>部门</span>
            <el-button link size="small" @click="refreshDepartmentTree" class="refresh-btn">
              <el-icon><Refresh /></el-icon>
            </el-button>
          </div>
        </template>
        <DepartmentTree
          ref="departmentTreeRef"
          :data="departmentData"
          selectable
          @select="handleDepartmentSelect"
        />
      </el-card>
    </div>

    <!-- 右侧：人员列表 -->
    <div class="contacts-main">
      <el-card class="main-card">
        <template #header>
          <div class="card-header">
            <div class="header-left">
              <el-icon><User /></el-icon>
              <span>{{ selectedDepartmentName || '全部人员' }}</span>
              <el-tag
                v-if="selectedDepartmentCode"
                size="small"
                closable
                @close="clearDepartmentFilter"
              >
                {{ selectedDepartmentName }}
              </el-tag>
            </div>
            <div class="header-right">
              <el-select
                v-model="statusFilter"
                placeholder="全部状态"
                clearable
                style="width: 130px"
                @change="handleStatusChange"
              >
                <el-option label="在职" value="active" />
                <el-option label="离职" value="left" />
                <el-option label="退休" value="retirement" />
              </el-select>
              <el-input
                v-model="searchKeyword"
                placeholder="搜索姓名、工号..."
                clearable
                style="width: 240px"
              >
                <template #prefix>
                  <el-icon><Search /></el-icon>
                </template>
              </el-input>
            </div>
          </div>
        </template>

        <div v-if="loading" v-loading="true" class="loading-container" />

        <el-table v-else :data="contacts" stripe style="width: 100%">
          <el-table-column prop="employee_jobcode" label="工号" width="120" align="center" />
          <el-table-column prop="employee_name" label="姓名" width="120" />
          <el-table-column prop="employee_department_name" label="部门" min-width="150" />
          <el-table-column prop="employee_position" label="职位" min-width="120" />
          <el-table-column prop="employee_phone" label="联系电话" width="140" />
          <el-table-column prop="employee_email" label="邮箱" min-width="180" />
        </el-table>

        <el-pagination
          v-if="total > 0"
          class="pagination"
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :page-sizes="PAGE_SIZE_OPTIONS"
          :total="total"
          layout="total, sizes, prev, pager, next"
          @size-change="handleSizeChange"
          @current-change="fetchContacts"
        />
      </el-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { User, Search, OfficeBuilding, Refresh } from '@element-plus/icons-vue'
import { useUserStore } from '@/stores/userStore'
import { getDepartmentTree } from '@/stores/departmentStore'
import type { EmployeeExtended } from '@/types/user'
import type { DepartmentTreeNode } from '@/types/department'
import DepartmentTree from '@/components/componentsdetails/components/DepartmentTree.vue'
import { useDebouncedSearch } from '@/composables/useDebouncedSearch'
import { usePagedList } from '@/composables/usePagedList'
import { PAGE_SIZE_OPTIONS } from '@/utils/pagination'
import { logError } from '@/utils/logger'
import { notifyCallerError } from '@/utils/errorHandler'

const userStore = useUserStore()

// [S10/M-14] usePagedList 统一数据层：M-RC-13 stale 语义由其请求序号守卫承接；
// 双通道（关键词模糊搜索 / 列表）在 fetcher 内分流，部门/状态筛选走页内 refs。
const searchKeyword = ref('')
const statusFilter = ref('')
const selectedDepartmentCode = ref<string | null>(null)
const selectedDepartmentName = ref('')
const departmentData = ref<DepartmentTreeNode[]>([])

const {
  list: contacts,
  loading,
  total,
  currentPage,
  pageSize,
  search,
  refresh,
} = usePagedList<EmployeeExtended>({
  tag: 'ContactsView',
  errorMessage: '获取通讯录失败，请稍后重试',
  fixedParams: {},
  fetcher: async (params) => {
    const page = params.page as number
    const pageSize = params.page_size as number
    if (searchKeyword.value.trim()) {
      const response = await userStore.getFuzzySearch({
        keyword: searchKeyword.value.trim(),
        department_code: selectedDepartmentCode.value || undefined,
        page,
        page_size: pageSize,
      })
      return { results: response.results || [], count: response.count || 0 }
    }
    const res = await userStore.getList({
      department_code: selectedDepartmentCode.value || undefined,
      employee_status: statusFilter.value || undefined,
      page,
      page_size: pageSize,
    })
    // [M-RC-13] stale：store 返回 undefined 时透传 skipWrite，保留现有表格数据
    if (res === undefined) return { skipWrite: true, results: [], count: 0 }
    return { results: res, count: userStore.pagination.total }
  },
})

// 使用防抖搜索 composable
useDebouncedSearch(searchKeyword, () => {
  search()
})

const fetchDepartmentTree = async () => {
  try {
    departmentData.value = await getDepartmentTree()
  } catch (err) {
    logError('views/ContactsView', '获取部门树失败:', err)
    // [M-RC-09] 单出口：AxiosError 由拦截器已提示，仅非 AxiosError 弹一次
    notifyCallerError(err, '获取部门数据失败')
  }
}

const refreshDepartmentTree = () => {
  fetchDepartmentTree()
}

const handleStatusChange = () => {
  search()
}

// [M-3] 改每页条数回第 1 页（消解 EP size-change/current-change 双触发下页码语义分叉）
const handleSizeChange = () => {
  search()
}

// [S10] 写操作/翻页后的重载别名（保持当前页语义，模板零改动）
const fetchContacts = refresh

const handleDepartmentSelect = (department: DepartmentTreeNode) => {
  selectedDepartmentCode.value = department.department_code
  selectedDepartmentName.value = department.department_name
  search()
}

const clearDepartmentFilter = () => {
  selectedDepartmentCode.value = null
  selectedDepartmentName.value = ''
  search()
}

onMounted(() => {
  fetchDepartmentTree()
  fetchContacts()
})
</script>

<style scoped>
.contacts-view {
  display: flex;
  gap: 16px;
  padding: 24px;
  min-height: 100vh;
  background: var(--background-color);
}

.contacts-sidebar {
  width: 280px;
  flex-shrink: 0;
}

.sidebar-card {
  border-radius: 8px;
  height: calc(100vh - 48px);
  position: sticky;
  top: 24px;
}

.sidebar-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;

  .refresh-btn {
    margin-left: auto;
  }
}

.contacts-main {
  flex: 1;
  min-width: 0;
}

.main-card {
  border-radius: 8px;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 600;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.loading-container {
  min-height: 200px;
}

.pagination {
  display: flex;
  justify-content: center;
  margin-top: 16px;
}
</style>
