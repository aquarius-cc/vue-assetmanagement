<!--
@file 认证用户管理页面，支持用户增删改查与权限分配
@component AuthUserManage.vue
@usedBy
  - router/index.ts: 路由懒加载
@dependsOn
  - api/authusers: 认证用户数据接口
  - composables/usePermission: 权限校验
  - composables/useDebouncedSearch: 防抖搜索
-->
<template>
  <div class="authuser-manage">
    <el-card class="main-card">
      <template #header>
        <div class="card-header">
          <div class="header-left">
            <el-icon><User /></el-icon>
            <span>认证用户管理</span>
          </div>
          <div class="header-right">
            <el-input
              v-model="searchKeyword"
              placeholder="搜索用户名..."
              clearable
              style="width: 200px"
            >
              <template #prefix>
                <el-icon><Search /></el-icon>
              </template>
            </el-input>
            <el-button v-if="isAdmin" type="primary" @click="openCreateDialog">
              <el-icon><Plus /></el-icon>
              新建用户
            </el-button>
          </div>
        </div>
      </template>

      <el-table v-loading="loading" :data="authUsers" stripe style="width: 100%">
        <el-table-column prop="auth_id" label="用户ID" width="80" align="center" />
        <el-table-column prop="auth_username" label="用户名" width="140" />
        <el-table-column prop="email" label="邮箱" min-width="180" show-overflow-tooltip />
        <el-table-column prop="auth_phone" label="联系电话" width="140" />
        <el-table-column prop="auth_is_active" label="状态" width="80" align="center">
          <template #default="{ row }">
            <el-tag :type="row.auth_is_active ? 'success' : 'info'" size="small">
              {{ row.auth_is_active ? '激活' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="绑定员工" width="160">
          <template #default="{ row }">
            <span v-if="row.bound_employee">
              {{ row.bound_employee.employee_name }} ({{ row.bound_employee.employee_jobcode }})
            </span>
            <span v-else class="unbound-hint">未绑定</span>
          </template>
        </el-table-column>
        <el-table-column prop="last_login" label="最后登录" width="160">
          <template #default="{ row }">
            {{ row.last_login ? formatDate(row.last_login) : '从未登录' }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="240" align="center" fixed="right">
          <template #default="{ row }">
            <el-button v-if="isAdmin" size="small" @click="openBindDialog(row)">绑定</el-button>
            <el-button v-if="isAdmin" size="small" @click="openRoleDialog(row)">角色</el-button>
            <el-button v-if="isAdmin" size="small" type="primary" @click="openEditDialog(row)"
              >编辑</el-button
            >
            <el-popconfirm
              v-if="isAdmin"
              :title="`确认删除用户「${row.auth_username}」？`"
              :confirm-button-text="'确认'"
              :cancel-button-text="'取消'"
              @confirm="handleDelete(row)"
            >
              <template #reference>
                <el-button size="small" type="danger">删除</el-button>
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
        @size-change="fetchAuthUsers"
        @current-change="fetchAuthUsers"
      />
    </el-card>

    <!-- 新建/编辑用户弹窗 -->
    <el-dialog
      v-model="dialogVisible"
      :title="isEdit ? '编辑用户' : '新建用户'"
      width="480px"
      destroy-on-close
    >
      <el-form ref="formRef" :model="formData" :rules="formRules" label-width="100px">
        <el-form-item label="用户名" prop="auth_username">
          <el-input
            v-model="formData.auth_username"
            placeholder="请输入用户名"
            :disabled="isEdit"
          />
        </el-form-item>
        <el-form-item v-if="!isEdit" label="密码" prop="password">
          <el-input
            v-model="formData.password"
            type="password"
            placeholder="请输入密码"
            show-password
          />
        </el-form-item>
        <el-form-item label="邮箱" prop="email">
          <el-input v-model="formData.email" placeholder="请输入邮箱" />
        </el-form-item>
        <el-form-item label="联系电话" prop="auth_phone">
          <el-input v-model="formData.auth_phone" placeholder="请输入联系电话" />
        </el-form-item>
        <el-form-item label="状态">
          <el-switch v-model="formData.auth_is_active" active-text="激活" inactive-text="禁用" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmit">确认</el-button>
      </template>
    </el-dialog>

    <!-- 绑定员工弹窗 -->
    <BindAuthUserDialog
      v-model:visible="bindDialogVisible"
      mode="from-authuser"
      :auth-user="currentAuthUserForBind"
      @saved="fetchAuthUsers"
    />

    <!-- 角色分配弹窗 -->
    <UserRoleAssignDialog v-model:visible="roleDialogVisible" :auth-user="currentAuthUser" />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { User, Search, Plus } from '@element-plus/icons-vue'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import { authUserAPI } from '@/api/authusers'
import { getErrorMessage } from '@/utils/errorHandler'
import { usePermission } from '@/composables/usePermission'
import { useDebouncedSearch } from '@/composables/useDebouncedSearch'
import type { AuthUser, AuthUserCreateForm } from '@/types/authuser'
import BindAuthUserDialog from '@/components/system/BindAuthUserDialog.vue'
import UserRoleAssignDialog from '@/components/system/UserRoleAssignDialog.vue'

// 权限检查
// 实际上 usePermission 已经导出了 isAdmin,
// 并且 isAdmin 的判断逻辑已经包含了 isSuperuser 的判断,直接解构 isAdmin,不需要别名
const { isAdmin } = usePermission()

// ==================== 用户列表 ====================
const loading = ref(false)
const authUsers = ref<AuthUser[]>([])
const total = ref(0)
const currentPage = ref(1)
const pageSize = ref(20)
const searchKeyword = ref('')

// 使用防抖搜索 composable
useDebouncedSearch(searchKeyword, () => {
  currentPage.value = 1
  fetchAuthUsers()
})

const fetchAuthUsers = async () => {
  loading.value = true
  try {
    const params: Record<string, string | number> = {
      page: currentPage.value,
      page_size: pageSize.value,
    }
    if (searchKeyword.value.trim()) {
      params.search = searchKeyword.value.trim()
    }
    const res = await authUserAPI.getAuthUsers(params)
    authUsers.value = res.results
    total.value = res.count
    // bound_employee 已由后端列表接口内联返回，无需额外请求
  } catch {
    ElMessage.error('获取用户列表失败')
  } finally {
    loading.value = false
  }
}

const formatDate = (dateStr: string) => {
  const d = new Date(dateStr)
  return d.toLocaleString('zh-CN')
}

// ==================== 新建/编辑弹窗 ====================
const dialogVisible = ref(false)
const isEdit = ref(false)
const editingId = ref<number | null>(null)
const formRef = ref<FormInstance>()
const submitting = ref(false)

const formData = reactive<AuthUserCreateForm>({
  auth_username: '',
  password: '',
  email: '',
  auth_phone: '',
  auth_is_active: true,
  auth_is_staff: false,
})

const formRules: FormRules = {
  auth_username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [
    {
      required: true,
      message: '请输入密码',
      trigger: 'blur',
      validator: (_rule, _value, callback) => {
        if (!isEdit.value && !formData.password) {
          callback(new Error('请输入密码'))
        } else {
          callback()
        }
      },
    },
  ],
  auth_phone: [{ required: true, message: '请输入联系电话', trigger: 'blur' }],
}

const openCreateDialog = () => {
  isEdit.value = false
  editingId.value = null
  Object.assign(formData, {
    auth_username: '',
    password: '',
    email: '',
    auth_phone: '',
    auth_is_active: true,
    auth_is_staff: false,
  })
  dialogVisible.value = true
}

const openEditDialog = (row: AuthUser) => {
  isEdit.value = true
  editingId.value = row.auth_id
  Object.assign(formData, {
    auth_username: row.auth_username,
    password: '',
    email: row.email || '',
    auth_phone: row.auth_phone,
    auth_is_active: row.auth_is_active,
    auth_is_staff: row.auth_is_staff,
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
        const updateData: Partial<AuthUserCreateForm> = { ...formData }
        if (!updateData.password) delete updateData.password
        await authUserAPI.updateAuthUser(editingId.value, updateData)
        ElMessage.success('更新成功')
      } else {
        await authUserAPI.createAuthUser({ ...formData })
        ElMessage.success('创建成功')
      }
      dialogVisible.value = false
      fetchAuthUsers()
    } catch (error: unknown) {
      ElMessage.error(getErrorMessage(error, isEdit.value ? '更新失败' : '创建失败'))
    } finally {
      submitting.value = false
    }
  })
}

// 计算当前绑定的用户信息
// 用于在绑定员工弹窗中显示当前绑定的员工信息
const currentAuthUserForBind = computed(() => {
  if (!currentAuthUser.value) return null
  return {
    id: currentAuthUser.value.auth_id,
    username: currentAuthUser.value.auth_username,
  }
})

const handleDelete = async (row: AuthUser) => {
  try {
    await authUserAPI.deleteAuthUser(row.auth_id)
    ElMessage.success('删除成功')
    fetchAuthUsers()
  } catch (error: unknown) {
    ElMessage.error(getErrorMessage(error, '删除失败'))
  }
}

// ==================== 绑定员工弹窗 ====================
const bindDialogVisible = ref(false)
const currentAuthUser = ref<AuthUser | null>(null)

const openBindDialog = (row: AuthUser) => {
  currentAuthUser.value = row
  bindDialogVisible.value = true
}

// ==================== 角色分配弹窗 ====================
const roleDialogVisible = ref(false)

const openRoleDialog = (row: AuthUser) => {
  currentAuthUser.value = row
  roleDialogVisible.value = true
}

// ==================== 初始化 ====================
onMounted(() => {
  fetchAuthUsers()
})
</script>

<style scoped>
.authuser-manage {
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

.unbound-hint {
  color: var(--text-secondary);
  font-size: 13px;
}
</style>
