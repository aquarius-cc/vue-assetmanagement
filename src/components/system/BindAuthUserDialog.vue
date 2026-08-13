<!--
@file 绑定认证用户弹窗，支持查看绑定状态、解绑和替换绑定用户
@component BindAuthUserDialog.vue
@usedBy
  - views/system/UserManagementPage.vue: 用户管理页面中绑定认证用户弹窗
  - views/system/AuthUserManage.vue: 认证用户管理页面中绑定认证用户弹窗
@dependsOn
  - api/authUserAPI: getAuthUserInfo/bindAuthUser/unbindAuthUser 认证用户相关接口
  - api/employeeAPI: getEmployeeInfo/getEmployeeList 员工相关接口
  - api/roleAPI: getRoleList 角色相关接口
-->
<template>
  <el-dialog
    :model-value="visible"
    :title="dialogTitle"
    width="640px"
    destroy-on-close
    @update:model-value="$emit('update:visible', $event)"
  >
    <div v-loading="loading" class="loading-area">
      <div v-if="loading" style="min-height: 120px" />
    </div>
    <template v-if="!loading">
      <template v-if="boundEmployee">
        <el-descriptions :column="2" border size="small">
          <el-descriptions-item label="工号">{{
            boundEmployee.employee_jobcode
          }}</el-descriptions-item>
          <el-descriptions-item label="姓名">{{
            boundEmployee.employee_name
          }}</el-descriptions-item>
          <el-descriptions-item label="状态">{{
            boundEmployee.employee_status
          }}</el-descriptions-item>
          <el-descriptions-item label="绑定用户">{{
            boundEmployee.auth_user_username || '无'
          }}</el-descriptions-item>
        </el-descriptions>
        <div class="action-row">
          <el-button
            type="danger"
            plain
            :loading="actionLoading"
            :disabled="!boundEmployee?.employee_jobcode"
            @click="handleUnbind"
            >解绑</el-button
          >
          <el-button type="warning" plain :loading="actionLoading" @click="showSearch = true"
            >替换</el-button
          >
        </div>
      </template>
      <template v-else>
        <div class="search-section">
          <el-input v-model="searchKeyword" placeholder="搜索员工姓名或工号" clearable />
          <div v-if="searchResults.length" class="search-results">
            <div
              v-for="emp in searchResults"
              :key="emp.employee_jobcode"
              class="search-item"
              @click="handleSelectEmployee(emp)"
            >
              <span class="emp-name">{{ emp.employee_name }}</span>
              <span class="emp-jobcode">{{ emp.employee_jobcode }}</span>
              <el-tag size="small" type="info">{{ emp.employee_status }}</el-tag>
            </div>
          </div>
          <div v-else-if="searchKeyword && !searching" class="empty-tip">无匹配结果</div>
        </div>
      </template>
    </template>
    <template #footer>
      <el-button @click="$emit('update:visible', false)">取消</el-button>
      <template v-if="!boundEmployee && mode === 'from-authuser'">
        <el-button
          type="primary"
          :disabled="!selectedEmployee"
          :loading="actionLoading"
          @click="handleBind"
        >
          绑定
        </el-button>
      </template>
      <template v-else-if="showSearch">
        <el-button
          type="primary"
          :disabled="!selectedEmployee"
          :loading="actionLoading"
          @click="handleReplace"
        >
          确认替换
        </el-button>
      </template>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { authUserAPI } from '@/api/authusers'
import { useDebouncedSearch } from '@/composables/useDebouncedSearch'
import type { EmployeeBrief } from '@/api/authusers'

interface Props {
  visible: boolean
  mode: 'from-authuser' | 'from-employee'
  authUser?: { id: number; username: string } | null
  employeeJobcode?: string
  employeeName?: string
}

const props = withDefaults(defineProps<Props>(), {
  authUser: null,
  employeeJobcode: '',
  employeeName: '',
})

const emit = defineEmits<{
  'update:visible': [value: boolean]
  saved: []
}>()

const loading = ref(false)
const actionLoading = ref(false)
const boundEmployee = ref<EmployeeBrief | null>(null)
const searchKeyword = ref('')
const searchResults = ref<EmployeeBrief[]>([])
const searching = ref(false)
const selectedEmployee = ref<EmployeeBrief | null>(null)
const showSearch = ref(false)

const dialogTitle = ref('绑定用户')

// 使用防抖搜索 composable
useDebouncedSearch(searchKeyword, async (value) => {
  if (!value.trim()) {
    searchResults.value = []
    selectedEmployee.value = null
    return
  }
  searching.value = true
  try {
    searchResults.value = await authUserAPI.searchEmployees(value.trim())
  } catch {
    searchResults.value = []
  } finally {
    searching.value = false
  }
})

const loadBindStatus = async () => {
  if (props.mode === 'from-authuser' && props.authUser) {
    loading.value = true
    try {
      const result = await authUserAPI.getBoundEmployee(props.authUser.id)
      // 【防御性校验】确保返回数据包含 employee_jobcode，防止 undefined 传入后续 API
      boundEmployee.value = result && result.employee_jobcode ? result : null
      dialogTitle.value = `绑定用户 — ${props.authUser.username}`
    } catch {
      boundEmployee.value = null
    } finally {
      loading.value = false
    }
  } else if (props.mode === 'from-employee' && props.employeeJobcode) {
    loading.value = true
    dialogTitle.value = `绑定用户 — ${props.employeeName || props.employeeJobcode}`
    boundEmployee.value = null
    loading.value = false
  }
}

watch(
  () => props.visible,
  (val) => {
    if (val) {
      boundEmployee.value = null
      searchKeyword.value = ''
      searchResults.value = []
      selectedEmployee.value = null
      showSearch.value = false
      loadBindStatus()
    }
  },
)

const handleSelectEmployee = (emp: EmployeeBrief) => {
  selectedEmployee.value = emp
  searchKeyword.value = `${emp.employee_name} (${emp.employee_jobcode})`
  searchResults.value = []
}

const handleBind = async () => {
  if (!selectedEmployee.value?.employee_jobcode || !props.authUser) {
    return
  }
  actionLoading.value = true
  try {
    await authUserAPI.bindAuthUser(selectedEmployee.value.employee_jobcode, props.authUser.username)
    ElMessage.success('绑定成功')
    emit('update:visible', false)
    emit('saved')
  } catch (error: unknown) {
    const msg = (error as { message?: string })?.message || '绑定失败'
    ElMessage.error(msg)
  } finally {
    actionLoading.value = false
  }
}

const handleUnbind = async () => {
  if (!boundEmployee.value?.employee_jobcode) {
    ElMessage.error('未找到绑定的员工信息，请刷新后重试')
    return
  }
  try {
    await ElMessageBox.confirm(
      `确认解绑员工 ${boundEmployee.value.employee_name} 的用户绑定？`,
      '解绑确认',
      { type: 'warning' },
    )
  } catch {
    return
  }
  actionLoading.value = true
  try {
    await authUserAPI.unbindAuthUser(boundEmployee.value.employee_jobcode)
    ElMessage.success('解绑成功')
    emit('update:visible', false)
    emit('saved')
  } catch (error: unknown) {
    const msg = (error as { message?: string })?.message || '解绑失败'
    ElMessage.error(msg)
  } finally {
    actionLoading.value = false
  }
}

const handleReplace = async () => {
  if (!selectedEmployee.value?.employee_jobcode || !props.authUser) return
  actionLoading.value = true
  try {
    await authUserAPI.replaceAuthUser(
      selectedEmployee.value.employee_jobcode,
      props.authUser.username,
    )
    ElMessage.success('替换成功')
    emit('update:visible', false)
    emit('saved')
  } catch (error: unknown) {
    const msg = (error as { message?: string })?.message || '替换失败'
    ElMessage.error(msg)
  } finally {
    actionLoading.value = false
  }
}
</script>

<style scoped>
.loading-area {
  min-height: 80px;
}

.action-row {
  display: flex;
  gap: 12px;
  margin-top: 16px;
}

.search-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.search-results {
  border: 1px solid var(--border-color-light);
  border-radius: 4px;
  max-height: 240px;
  overflow-y: auto;
}

.search-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 16px;
  cursor: pointer;
  transition: background-color 0.15s;
}

.search-item:hover {
  background-color: var(--background-color);
}

.emp-name {
  font-weight: 500;
}

.emp-jobcode {
  color: var(--text-secondary);
  font-size: 13px;
}

.empty-tip {
  text-align: center;
  color: var(--text-secondary);
  padding: 24px 0;
}
</style>
