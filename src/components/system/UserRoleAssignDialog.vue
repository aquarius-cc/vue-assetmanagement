<!--
@file 用户角色分配弹窗，展示已分配角色和可分配角色列表
@component UserRoleAssignDialog.vue
@description
  - 提供用户角色分配弹窗的组件
  - 包含已分配角色和可分配角色列表
  - 提供添加角色和删除角色的功能
  - 提供关闭弹窗的功能
  - 提供刷新角色列表的功能
  - 提供关闭弹窗的功能
@usedBy
  - views/system/UserManagementPage.vue: 用户管理页面中分配角色
@dependsOn
  - api/userAPI: getUserRoles/assignUserRoles 用户角色相关接口
  - api/roleAPI: getAllRoles 获取所有角色接口
-->
<template>
  <el-dialog
    :model-value="visible"
    :title="`分配角色 — ${authUser?.auth_username || ''}`"
    width="600px"
    destroy-on-close
    @update:model-value="$emit('update:visible', $event)"
  >
    <div v-loading="loading" class="role-loading">
      <div v-if="loading" style="min-height: 120px" />
    </div>
    <template v-if="!loading">
      <div class="role-section">
        <div class="section-title">已分配角色</div>
        <div v-if="assignedRoles.length === 0" class="empty-hint">暂无分配角色</div>
        <div v-else class="assigned-tags">
          <el-tag
            v-for="item in assignedRoles"
            :key="item.id"
            closable
            @close="handleRemoveRole(item)"
          >
            {{ item.role_name }} {{ item.role_code }}
          </el-tag>
        </div>
      </div>
      <div class="role-section">
        <div class="section-title">添加角色</div>
        <div class="add-role-bar">
          <el-select v-model="selectedRoleId" filterable placeholder="选择角色" class="role-select">
            <el-option
              v-for="role in unassignedRoles"
              :key="role.id"
              :label="`${role.role_name} (${role.role_code})`"
              :value="role.id"
            />
          </el-select>
          <el-button
            type="primary"
            :disabled="selectedRoleId === null"
            :loading="adding"
            @click="handleAddRole"
          >
            添加
          </el-button>
        </div>
      </div>
    </template>
    <template #footer>
      <el-button @click="$emit('update:visible', false)">关闭</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { authUserAPI } from '@/api/authusers'
import { roleAPI } from '@/api/roles'
import { getErrorMessage } from '@/utils/errorHandler'
import type { AuthUser } from '@/types/authuser'
import type { UserRole } from '@/api/authusers'
import type { Role } from '@/types/roles'

const props = defineProps<{
  visible: boolean
  authUser: AuthUser | null
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  saved: []
}>()

const loading = ref(false)
const adding = ref(false)
const selectedRoleId = ref<number | null>(null)

const assignedRoles = ref<UserRole[]>([])
const allRoles = ref<Role[]>([])

const unassignedRoles = computed(() => {
  const assignedIds = new Set(assignedRoles.value.map((ur) => ur.role))
  return allRoles.value.filter((r) => !assignedIds.has(r.id))
})

const loadData = async () => {
  if (!props.authUser) return
  loading.value = true
  try {
    const [roles, userRoles] = await Promise.all([
      roleAPI.getRoles(),
      authUserAPI.getUserRoles(props.authUser.auth_id),
    ])
    allRoles.value = roles.results
    assignedRoles.value = userRoles.results
  } catch {
    ElMessage.error('加载角色数据失败')
  } finally {
    loading.value = false
  }
}

watch(
  () => props.visible,
  (val) => {
    if (val) {
      selectedRoleId.value = null
      loadData()
    }
  },
)

const handleAddRole = async () => {
  if (!props.authUser || selectedRoleId.value === null) return
  adding.value = true
  try {
    await authUserAPI.assignUserRole(props.authUser.auth_id, selectedRoleId.value)
    ElMessage.success('角色分配成功')
    selectedRoleId.value = null
    await loadData()
    emit('saved')
  } catch (error: unknown) {
    ElMessage.error(getErrorMessage(error, '角色分配失败'))
  } finally {
    adding.value = false
  }
}

const handleRemoveRole = async (userRole: UserRole) => {
  if (!props.authUser) return
  try {
    await ElMessageBox.confirm(`确定要移除角色「${userRole.role_name}」吗？`, '移除角色确认', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    })
  } catch {
    return
  }
  try {
    await authUserAPI.removeUserRole(props.authUser.auth_id, userRole.id)
    ElMessage.success('角色已移除')
    await loadData()
    emit('saved')
  } catch (error: unknown) {
    ElMessage.error(getErrorMessage(error, '移除角色失败'))
  }
}
</script>

<style scoped>
.role-loading {
  min-height: 120px;
}

.role-section {
  margin-bottom: 20px;
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 12px;
}

.empty-hint {
  color: var(--text-secondary);
  font-size: 13px;
}

.assigned-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.add-role-bar {
  display: flex;
  align-items: center;
  gap: 12px;
}

.role-select {
  flex: 1;
}
</style>
