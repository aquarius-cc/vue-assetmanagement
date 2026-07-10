<template>
  <div class="contacts-view">
    <el-card class="contacts-card">
      <template #header>
        <div class="card-header">
          <el-icon><User /></el-icon>
          <span>通讯录</span>
        </div>
      </template>

      <div class="search-bar">
        <el-input
          v-model="searchKeyword"
          placeholder="搜索姓名、工号..."
          clearable
          @input="handleSearch"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>
      </div>

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
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { User, Search } from '@element-plus/icons-vue'
import { userAPI } from '@/api/user'
import type { EmployeeExtended } from '@/utils/User'

const loading = ref(true)
const contacts = ref<EmployeeExtended[]>([])
const total = ref(0)
const currentPage = ref(1)
const pageSize = ref(20)
const searchKeyword = ref('')

let searchTimer: ReturnType<typeof setTimeout> | null = null

const fetchContacts = async () => {
  loading.value = true
  try {
    if (searchKeyword.value.trim()) {
      const response = await userAPI.getFuzzySearch({
        keyword: searchKeyword.value.trim(),
        page: currentPage.value,
        page_size: pageSize.value,
      })
      contacts.value = response.results || []
      total.value = response.count || 0
    } else {
      const response = await userAPI.getUserList({
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
  justify-content: center;
  padding: 24px;
  min-height: 100vh;
  background: var(--background-color);
}

.contacts-card {
  width: 100%;
  max-width: 960px;
  border-radius: 8px;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 600;
}

.search-bar {
  margin-bottom: 16px;
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
