<!--
@file 通知列表页面，支持按类型、优先级、已读状态筛选与分页
@component NotificationList
@usedBy
  - router/index.ts: 路由懒加载
@dependsOn
  - api/notification: 通知数据接口
  - utils/navigation: 安全跳转工具
  - utils/Format: 日期时间格式化
-->
<script setup lang="ts">
/**
 * 通知列表页面
 * 支持按类型、优先级、已读状态筛选，关键词搜索，分页
 */
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { isAxiosError } from 'axios'
import { notificationAPI } from '@/api/notification'
import { safeNavigate } from '@/utils/navigation'
import { formatDateTimeFull } from '@/utils/Format'
import type {
  NotificationItem,
  NotificationFilterParams,
  NotificationPaginatedData,
} from '@/types/notification'

// 筛选参数
const filters = reactive({
  notification_type: '',
  priority: '',
  is_read: '' as string,
  keyword: '',
})

// 分页
const pagination = reactive({
  page: 1,
  page_size: 20,
  total: 0,
})

// 数据
const notifications = ref<NotificationItem[]>([])
const loading = ref(false)

// 选项
const typeOptions = [
  { label: '全部', value: '' },
  { label: '审批', value: 'approval' },
  { label: '状态变更', value: 'status_change' },
  { label: '系统', value: 'system' },
]
const priorityOptions = [
  { label: '全部', value: '' },
  { label: '高', value: 'high' },
  { label: '中', value: 'medium' },
  { label: '低', value: 'low' },
]
const readOptions = [
  { label: '全部', value: '' },
  { label: '未读', value: 'false' },
  { label: '已读', value: 'true' },
]

const priorityColorMap: Record<string, string> = {
  high: 'danger',
  medium: 'warning',
  low: 'info',
}
const typeColorMap: Record<string, string> = {
  approval: 'primary',
  status_change: 'success',
  system: 'info',
}

async function fetchNotifications() {
  loading.value = true
  try {
    const params: NotificationFilterParams = {
      page: pagination.page,
      page_size: pagination.page_size,
    }
    if (filters.is_read) params.is_read = filters.is_read === 'true'
    if (filters.notification_type) params.notification_type = filters.notification_type
    if (filters.priority) params.priority = filters.priority
    if (filters.keyword) params.keyword = filters.keyword

    const data = (await notificationAPI.getNotifications(params)) as unknown as
      | NotificationItem[]
      | NotificationPaginatedData
    if (Array.isArray(data)) {
      notifications.value = data
      pagination.total = data.length
    } else {
      notifications.value = data.results || []
      pagination.total = data.count || 0
    }
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  pagination.page = 1
  fetchNotifications()
}

function handleReset() {
  filters.notification_type = ''
  filters.priority = ''
  filters.is_read = ''
  filters.keyword = ''
  pagination.page = 1
  fetchNotifications()
}

function handlePageChange(page: number) {
  pagination.page = page
  fetchNotifications()
}

function handleSizeChange(size: number) {
  pagination.page_size = size
  pagination.page = 1
  fetchNotifications()
}

async function handleMarkRead(row: NotificationItem) {
  if (!row.is_read) {
    try {
      await notificationAPI.markRead(row.id)
      row.is_read = true
    } catch (err) {
      if (!isAxiosError(err)) {
        ElMessage.warning((err as Error).message || '标记已读失败')
      }
    }
  }
  if (row.related_url) {
    safeNavigate(row.related_url)
  }
}

async function handleMarkAllRead() {
  try {
    await notificationAPI.markAllRead()
    fetchNotifications()
  } catch (err) {
    if (!isAxiosError(err)) {
      ElMessage.warning((err as Error).message || '操作失败')
    }
  }
}

onMounted(fetchNotifications)
</script>

<template>
  <div class="notification-list">
    <div class="page-header">
      <h2>通知中心</h2>
      <el-button type="primary" @click="handleMarkAllRead">全部已读</el-button>
    </div>

    <!-- 筛选栏 -->
    <el-card shadow="never" class="filter-card">
      <el-form :inline="true" @submit.prevent="handleSearch">
        <el-form-item label="类型">
          <el-select
            v-model="filters.notification_type"
            placeholder="全部"
            clearable
            style="width: 120px"
          >
            <el-option
              v-for="opt in typeOptions"
              :key="opt.value"
              :label="opt.label"
              :value="opt.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="优先级">
          <el-select v-model="filters.priority" placeholder="全部" clearable style="width: 100px">
            <el-option
              v-for="opt in priorityOptions"
              :key="opt.value"
              :label="opt.label"
              :value="opt.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="filters.is_read" placeholder="全部" clearable style="width: 100px">
            <el-option
              v-for="opt in readOptions"
              :key="opt.value"
              :label="opt.label"
              :value="opt.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="搜索">
          <el-input
            v-model="filters.keyword"
            placeholder="标题/内容"
            clearable
            style="width: 200px"
            @clear="handleSearch"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">查询</el-button>
          <el-button @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 通知列表 -->
    <el-card shadow="never">
      <el-table
        :data="notifications"
        v-loading="loading"
        stripe
        @row-click="handleMarkRead"
        style="cursor: pointer"
      >
        <el-table-column label="状态" width="70" align="center">
          <template #default="{ row }">
            <el-tag v-if="!row.is_read" type="danger" size="small">未读</el-tag>
            <el-tag v-else type="info" size="small">已读</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="类型" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="typeColorMap[row.type] || 'info'" size="small">
              {{
                row.type === 'approval'
                  ? '审批'
                  : row.type === 'status_change'
                    ? '状态变更'
                    : '系统'
              }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="优先级" width="80" align="center">
          <template #default="{ row }">
            <el-tag :type="priorityColorMap[row.priority] || 'info'" size="small" effect="dark">
              {{ row.priority === 'high' ? '高' : row.priority === 'medium' ? '中' : '低' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="title" label="标题" min-width="200" show-overflow-tooltip />
        <el-table-column prop="message" label="内容" min-width="300" show-overflow-tooltip />
        <el-table-column label="时间" width="180">
          <template #default="{ row }">
            {{ formatDateTimeFull(row.created_at) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="80" align="center">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click.stop="handleMarkRead(row)">
              {{ row.related_url ? '查看' : '已读' }}
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination-wrapper">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.page_size"
          :total="pagination.total"
          :page-sizes="[10, 20, 50]"
          layout="total, sizes, prev, pager, next, jumper"
          @current-change="handlePageChange"
          @size-change="handleSizeChange"
        />
      </div>
    </el-card>
  </div>
</template>

<style scoped>
.notification-list {
  padding: 20px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.page-header h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
}

.filter-card {
  margin-bottom: 16px;
}

.pagination-wrapper {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}
</style>
