<!--
@file 角色管理页面，支持角色增删改查与权限配置
@component RoleManage.vue
@usedBy
  - router/index.ts: 路由懒加载
@dependsOn
  - api/roles: 角色数据接口
  - composables/usePermission: 权限校验
  - composables/useDebouncedSearch: 防抖搜索
  - commoncomponents/DashboardRecentList.vue: 最近操作列表组件
-->
<template>
  <div class="role-manage">
    <el-card class="main-card">
      <template #header>
        <div class="card-header">
          <div class="header-left">
            <el-icon><User /></el-icon>
            <span>角色管理</span>
          </div>
          <div class="header-right">
            <el-input
              v-model="searchKeyword"
              placeholder="搜索角色名称..."
              clearable
              style="width: 200px"
            >
              <template #prefix>
                <el-icon><Search /></el-icon>
              </template>
            </el-input>
            <el-button v-if="isAdmin" type="primary" @click="openCreateDialog">
              <el-icon><Plus /></el-icon>
              新建角色
            </el-button>
          </div>
        </div>
      </template>

      <el-table v-loading="loading" :data="roles" stripe style="width: 100%">
        <el-table-column prop="role_code" label="角色编码" width="160" />
        <el-table-column prop="role_name" label="角色名称" width="140" />
        <el-table-column prop="role_level" label="层级" width="80" align="center" />
        <el-table-column prop="description" label="描述" min-width="200" show-overflow-tooltip />
        <el-table-column prop="is_system" label="系统内置" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="row.is_system ? 'info' : 'success'" size="small">
              {{ row.is_system ? '是' : '否' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="240" align="center" fixed="right">
          <template #default="{ row }">
            <el-button v-if="isAdmin" size="small" @click="openPermDialog(row)">权限</el-button>
            <el-button v-if="isAdmin" size="small" type="primary" @click="openEditDialog(row)"
              >编辑</el-button
            >
            <el-popconfirm
              v-if="isAdmin"
              :title="`确认删除角色「${row.role_name}」？`"
              :confirm-button-text="'确认'"
              :cancel-button-text="'取消'"
              @confirm="handleDelete(row)"
            >
              <template #reference>
                <el-button size="small" type="danger" :disabled="row.is_system">删除</el-button>
              </template>
            </el-popconfirm>
          </template>
        </el-table-column>
      </el-table>

      <el-pagination
        v-if="total > 0"
        class="pagination"
        v-model:current-page="currentPage"
        v-model:page-size="pageSize"
        :page-sizes="[10, 20, 50]"
        :total="total"
        layout="total, sizes, prev, pager, next"
        @size-change="fetchRoles"
        @current-change="fetchRoles"
      />
    </el-card>

    <!-- 新建/编辑角色弹窗 -->
    <el-dialog
      v-model="dialogVisible"
      :title="isEdit ? '编辑角色' : '新建角色'"
      width="480px"
      destroy-on-close
    >
      <el-form ref="formRef" :model="formData" :rules="formRules" label-width="90px">
        <el-form-item label="角色编码" prop="role_code">
          <el-input v-model="formData.role_code" placeholder="如 system_admin" :disabled="isEdit" />
        </el-form-item>
        <el-form-item label="角色名称" prop="role_name">
          <el-input v-model="formData.role_name" placeholder="如 系统管理员" />
        </el-form-item>
        <el-form-item label="层级" prop="role_level">
          <el-input-number v-model="formData.role_level" :min="1" :max="10" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="formData.description" type="textarea" :rows="3" />
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number v-model="formData.sort_order" :min="0" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmit">确认</el-button>
      </template>
    </el-dialog>

    <!-- 权限分配弹窗 -->
    <RolePermDialog v-model:visible="permDialogVisible" :role="currentRole" @saved="fetchRoles" />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { User, Search, Plus } from '@element-plus/icons-vue'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import { roleAPI } from '@/api/roles'
import { usePermission } from '@/composables/usePermission'
import { useDebouncedSearch } from '@/composables/useDebouncedSearch'
import type { Role, RoleCreateUpdateForm } from '@/types/roles'
import RolePermDialog from '@/components/system/RolePermDialog.vue'

// C2 修复：添加权限检查
const { isAdmin } = usePermission()

// ==================== 角色列表 ====================
const loading = ref(false)
const roles = ref<Role[]>([])
const total = ref(0)
const currentPage = ref(1)
const pageSize = ref(20)
const searchKeyword = ref('')

// 使用防抖搜索 composable
useDebouncedSearch(searchKeyword, () => {
  currentPage.value = 1
  fetchRoles()
})

const fetchRoles = async () => {
  loading.value = true
  try {
    const params: Record<string, string | number> = {
      page: currentPage.value,
      page_size: pageSize.value,
    }
    if (searchKeyword.value.trim()) {
      params.search = searchKeyword.value.trim()
    }
    const res = await roleAPI.getRoles(params)
    roles.value = res.results
    total.value = res.count
  } catch {
    ElMessage.error('获取角色列表失败')
  } finally {
    loading.value = false
  }
}

// ==================== 新建/编辑弹窗 ====================
const dialogVisible = ref(false)
const isEdit = ref(false)
const editingId = ref<number | null>(null)
const formRef = ref<FormInstance>()
const submitting = ref(false)

const formData = reactive<RoleCreateUpdateForm>({
  role_code: '',
  role_name: '',
  role_level: 1,
  description: '',
  sort_order: 0,
})

const formRules: FormRules = {
  role_code: [{ required: true, message: '请输入角色编码', trigger: 'blur' }],
  role_name: [{ required: true, message: '请输入角色名称', trigger: 'blur' }],
  role_level: [{ required: true, message: '请输入层级', trigger: 'blur' }],
}

const openCreateDialog = () => {
  isEdit.value = false
  editingId.value = null
  Object.assign(formData, {
    role_code: '',
    role_name: '',
    role_level: 1,
    description: '',
    sort_order: 0,
  })
  dialogVisible.value = true
}

const openEditDialog = (row: Role) => {
  isEdit.value = true
  editingId.value = row.id
  Object.assign(formData, {
    role_code: row.role_code,
    role_name: row.role_name,
    role_level: row.role_level,
    description: row.description,
    sort_order: row.sort_order,
  })
  dialogVisible.value = true
}

const handleSubmit = async () => {
  if (!formRef.value) return
  await formRef.value.validate(async (valid) => {
    if (!valid) return
    submitting.value = true
    try {
      if (isEdit.value && editingId.value) {
        await roleAPI.updateRole(editingId.value, { ...formData })
        ElMessage.success('更新成功')
      } else {
        await roleAPI.createRole({ ...formData })
        ElMessage.success('创建成功')
      }
      dialogVisible.value = false
      fetchRoles()
    } catch (error: unknown) {
      const msg =
        (error as { response?: { data?: { message?: string } }; message?: string })?.response?.data
          ?.message ||
        (error as { message?: string })?.message ||
        (isEdit.value ? '更新失败' : '创建失败')
      ElMessage.error(msg)
    } finally {
      submitting.value = false
    }
  })
}

const handleDelete = async (row: Role) => {
  try {
    await roleAPI.deleteRole(row.id)
    ElMessage.success('删除成功')
    fetchRoles()
  } catch (error: unknown) {
    const msg =
      (error as { response?: { data?: { message?: string } }; message?: string })?.response?.data
        ?.message ||
      (error as { message?: string })?.message ||
      '删除失败'
    ElMessage.error(msg)
  }
}

// ==================== 权限分配弹窗 ====================
const permDialogVisible = ref(false)
const currentRole = ref<Role | null>(null)

const openPermDialog = (row: Role) => {
  currentRole.value = row
  permDialogVisible.value = true
}

// ==================== 初始化 ====================
onMounted(() => {
  fetchRoles()
})
</script>

<style scoped>
.role-manage {
  padding: 24px;
  min-height: 100vh;
  background: var(--background-color);
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

.pagination {
  display: flex;
  justify-content: center;
  margin-top: 16px;
}
</style>
