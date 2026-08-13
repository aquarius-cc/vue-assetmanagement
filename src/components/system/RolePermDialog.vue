<!--
@file 角色权限分配弹窗，展示权限树并支持全选/全不选操作
@component RolePermDialog
@usedBy
  - views/system/RoleManagementPage.vue: 角色管理页面中分配权限
@dependsOn
  - api/roleAPI: getRolePermissions/updateRolePermissions 角色权限相关接口
  - api/permissionAPI: getAllPermissions 获取所有权限接口
-->
<template>
  <el-dialog
    :model-value="visible"
    :title="`分配权限 — ${role?.role_name || ''}`"
    width="680px"
    destroy-on-close
    @update:model-value="$emit('update:visible', $event)"
  >
    <div v-loading="permLoading" class="perm-loading">
      <div v-if="permLoading" style="min-height: 200px" />
    </div>
    <template v-if="!permLoading">
      <div class="perm-toolbar">
        <el-button size="small" @click="selectAllPerms">全选</el-button>
        <el-button size="small" @click="deselectAllPerms">全不选</el-button>
        <span class="perm-count"
          >已选 {{ selectedPermCodes.length }} / {{ allPermCodes.length }}</span
        >
      </div>
      <el-collapse v-model="expandedModules">
        <el-collapse-item v-for="mod in permissionModules" :key="mod.name" :name="mod.name">
          <template #title>
            <div class="module-header">
              <el-checkbox
                :model-value="isModuleAllChecked(mod)"
                :indeterminate="isModuleIndeterminate(mod)"
                @change="(val: boolean | string | number) => toggleModule(mod, val === true)"
              >
                <span class="module-label">{{ mod.label }}</span>
              </el-checkbox>
              <el-tag size="small" type="info">{{ mod.codes.length }} 项</el-tag>
            </div>
          </template>
          <div class="perm-grid">
            <el-checkbox
              v-for="code in mod.codes"
              :key="code.value"
              :model-value="selectedPermCodes.includes(code.value)"
              :label="code.value"
              @change="(val: boolean | string | number) => togglePermCode(code.value, val === true)"
            >
              {{ code.label }}
            </el-checkbox>
          </div>
        </el-collapse-item>
      </el-collapse>
    </template>
    <template #footer>
      <el-button @click="$emit('update:visible', false)">取消</el-button>
      <el-button type="primary" :loading="permSaving" @click="handleSavePermissions">
        保存权限
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { roleAPI } from '@/api/roles'
import { permissionsAPI } from '@/api/permissions'
import type { Role } from '@/types/roles'

interface PermCodeItem {
  value: string
  label: string
}

interface PermModule {
  name: string
  label: string
  codes: PermCodeItem[]
}

const props = defineProps<{
  visible: boolean
  role: Role | null
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  saved: []
}>()

const permLoading = ref(false)
const permSaving = ref(false)
const selectedPermCodes = ref<string[]>([])
const expandedModules = ref<string[]>([])
const allPermCodes = ref<string[]>([])
const permissionModules = ref<PermModule[]>([])

const MODULE_LABELS: Record<string, string> = {
  asset: '资产管理',
  outasset: '出库管理',
  recycle: '回收管理',
  damaged: '待报废管理',
  waste: '已报废管理',
  broken: '已损坏管理',
  lost: '已遗失管理',
  found: '找回管理',
  repair: '维修管理',
  contract: '合同管理',
  storage: '仓库管理',
  assettype: '资产类型',
  harddisk: '硬盘序列号',
  employee: '员工管理',
  department: '部门管理',
  user: '用户管理',
  unregistered: '未登记资产',
  notification: '通知管理',
  auditlog: '审计日志',
  dashboard: '仪表盘',
  system_config: '系统配置',
}

const ACTION_LABELS: Record<string, string> = {
  read: '查看',
  create: '创建',
  update: '编辑',
  delete: '删除',
  approve: '审批',
  export: '导出',
}

function groupPermissions(codes: string[]): PermModule[] {
  const map = new Map<string, PermCodeItem[]>()
  for (const code of codes) {
    const colonIdx = code.indexOf(':')
    const mod = colonIdx > 0 ? code.slice(0, colonIdx) : code
    const action = colonIdx > 0 ? code.slice(colonIdx + 1) : code
    if (!map.has(mod)) map.set(mod, [])
    map.get(mod)!.push({
      value: code,
      label: ACTION_LABELS[action] || action,
    })
  }
  const modules: PermModule[] = []
  for (const [name, items] of map) {
    modules.push({
      name,
      label: MODULE_LABELS[name] || name,
      codes: items,
    })
  }
  return modules
}

const loadPermissions = async () => {
  if (!props.role) return
  permLoading.value = true
  selectedPermCodes.value = []

  try {
    const [allPerms, rolePermRes] = await Promise.all([
      permissionsAPI.getAllPermissions(),
      roleAPI.getRolePermissions(props.role.id),
    ])

    allPermCodes.value = allPerms.map((p) => p.permission_code)
    permissionModules.value = groupPermissions(allPermCodes.value)
    selectedPermCodes.value = rolePermRes.permissions || []
    expandedModules.value = permissionModules.value.map((m) => m.name)
  } catch {
    ElMessage.error('获取权限数据失败')
  } finally {
    permLoading.value = false
  }
}

watch(
  () => props.visible,
  (val) => {
    if (val) loadPermissions()
  },
)

const isModuleAllChecked = (mod: PermModule): boolean => {
  return mod.codes.every((c) => selectedPermCodes.value.includes(c.value))
}

const isModuleIndeterminate = (mod: PermModule): boolean => {
  const checked = mod.codes.filter((c) => selectedPermCodes.value.includes(c.value)).length
  return checked > 0 && checked < mod.codes.length
}

const toggleModule = (mod: PermModule, checked: boolean) => {
  const codeSet = new Set(mod.codes.map((c) => c.value))
  if (checked) {
    const newCodes = mod.codes
      .filter((c) => !selectedPermCodes.value.includes(c.value))
      .map((c) => c.value)
    selectedPermCodes.value = [...selectedPermCodes.value, ...newCodes]
  } else {
    selectedPermCodes.value = selectedPermCodes.value.filter((c) => !codeSet.has(c))
  }
}

const togglePermCode = (code: string, checked: boolean) => {
  if (checked) {
    if (!selectedPermCodes.value.includes(code)) {
      selectedPermCodes.value = [...selectedPermCodes.value, code]
    }
  } else {
    selectedPermCodes.value = selectedPermCodes.value.filter((c) => c !== code)
  }
}

const selectAllPerms = () => {
  selectedPermCodes.value = [...allPermCodes.value]
}

const deselectAllPerms = () => {
  selectedPermCodes.value = []
}

const handleSavePermissions = async () => {
  if (!props.role) return
  permSaving.value = true
  try {
    await roleAPI.setRolePermissions(props.role.id, {
      permission_codes: selectedPermCodes.value,
    })
    ElMessage.success('权限设置成功')
    emit('update:visible', false)
    emit('saved')
  } catch (error: unknown) {
    const msg =
      (error as { response?: { data?: { message?: string } }; message?: string })?.response?.data
        ?.message ||
      (error as { message?: string })?.message ||
      '权限设置失败'
    ElMessage.error(msg)
  } finally {
    permSaving.value = false
  }
}
</script>

<style scoped>
.perm-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.perm-count {
  margin-left: auto;
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.module-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.module-label {
  font-weight: 600;
}

.perm-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 24px;
  padding: 8px 0;
}
</style>
