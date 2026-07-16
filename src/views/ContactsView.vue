<template>
  <div class="contacts-view">
    <!-- 左侧：部门树 -->
    <div class="contacts-sidebar">
      <el-card class="sidebar-card" body-style="padding: 12px;">
        <template #header>
          <div class="sidebar-header">
            <el-icon><OfficeBuilding /></el-icon>
            <span>部门</span>
          </div>
        </template>
        <DepartmentTree ref="departmentTreeRef" selectable @select="handleDepartmentSelect" />
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
              <el-input
                v-model="searchKeyword"
                placeholder="搜索姓名、工号..."
                clearable
                style="width: 240px"
                @input="handleSearch"
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
          :page-sizes="[10, 20, 50]"
          :total="total"
          layout="total, sizes, prev, pager, next"
          @size-change="fetchContacts"
          @current-change="fetchContacts"
        />
      </el-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { User, Search, OfficeBuilding } from '@element-plus/icons-vue'
import { userAPI } from '@/api/user'
import type { EmployeeExtended } from '@/utils/User'
import DepartmentTree from '@/components/componentsdetails/components/DepartmentTree.vue'

const loading = ref(true)
const contacts = ref<EmployeeExtended[]>([])
const total = ref(0)
const currentPage = ref(1)
const pageSize = ref(20)
const searchKeyword = ref('')
const selectedDepartmentCode = ref<string | null>(null)
const selectedDepartmentName = ref('')
const departmentTreeRef = ref<InstanceType<typeof DepartmentTree>>()

let searchTimer: ReturnType<typeof setTimeout> | null = null

const fetchContacts = async () => {
  loading.value = true
  try {
    if (searchKeyword.value.trim()) {
      const response = await userAPI.getFuzzySearch({
        keyword: searchKeyword.value.trim(),
        department_code: selectedDepartmentCode.value || undefined,
        page: currentPage.value,
        page_size: pageSize.value,
      })
      contacts.value = response.results || []
      total.value = response.count || 0
    } else {
      const response = await userAPI.getUserList({
        department_code: selectedDepartmentCode.value || undefined,
        page: currentPage.value,
        page_size: pageSize.value,
      })
      contacts.value = response.results || []
      total.value = response.count || 0
    }
  } catch (err) {
    console.error('获取通讯录失败:', err)
  } finally {
    loading.value = false
  }
}

const handleDepartmentSelect = (data: { code: string; name: string }) => {
  selectedDepartmentCode.value = data.code
  selectedDepartmentName.value = data.name
  currentPage.value = 1
  fetchContacts()
}

const clearDepartmentFilter = () => {
  selectedDepartmentCode.value = null
  selectedDepartmentName.value = ''
  currentPage.value = 1
  fetchContacts()
}

const handleSearch = () => {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    currentPage.value = 1
    fetchContacts()
  }, 300)
}

onMounted(() => {
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
