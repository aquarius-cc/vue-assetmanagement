<!--
  DepartmentForm.vue
  部门表单页（新增 / 编辑）
  模式判断：路由 query 中有 code 参数 → 编辑模式，否则 → 新增模式
-->
<template>
  <div class="department-form">
    <el-card class="box-card">
      <template #header>
        <div class="card-header">
          <el-icon><Plus /></el-icon>
          <span>{{ isEdit ? '部门编辑' : '部门录入' }}</span>
        </div>
      </template>

      <el-form
        ref="formRef"
        :model="departmentForm"
        :rules="rules"
        label-width="140px"
        size="default"
        class="full-width-form"
      >
        <el-row :gutter="20">
          <el-col :span="24">
            <h3 class="section-title">部门信息</h3>
          </el-col>

          <el-col :xs="24" :sm="24" :md="12">
            <el-form-item label="部门编码" prop="department_code">
              <el-input
                v-model="departmentForm.department_code"
                placeholder="请输入部门编码"
                :readonly="isEdit"
                clearable
              />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="24" :md="12">
            <el-form-item label="部门名称" prop="department_name">
              <el-input
                v-model="departmentForm.department_name"
                placeholder="请输入部门名称"
                clearable
              />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="24" :md="12">
            <el-form-item label="部门信息员" prop="department_information">
              <el-input
                v-model="departmentForm.department_information"
                placeholder="请输入部门信息员"
                clearable
              />
            </el-form-item>
          </el-col>
          <!-- 排序顺序：可选字段，不填默认为 0 -->
          <el-col :xs="24" :sm="24" :md="12">
            <el-form-item label="排序顺序" prop="sort_order">
              <el-input-number
                v-model="departmentForm.sort_order"
                :min="0"
                :max="9999"
                :step="1"
                placeholder="不填默认为 0"
                controls-position="right"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
        </el-row>

        <!-- 操作按钮 -->
        <el-row justify="center">
          <el-col :span="24" class="form-actions">
            <el-button v-if="!isEdit" @click="resetForm">重置</el-button>
            <el-button type="success" @click="submitForm" :loading="departmentStore.loading">
              提交
            </el-button>
            <el-button type="primary" @click="goBack">返回</el-button>
          </el-col>
        </el-row>
      </el-form>
    </el-card>
  </div>
</template>

<script lang="ts">
export default {
  name: 'DepartmentForm',
}
</script>

<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import { useRouter, useRoute } from 'vue-router'
import { isAxiosError } from 'axios'
import { useDepartmentStore } from '@/stores/departmentStore'
import type { DepartmentCreateForm } from '@/types/department'

// ===== 路由与 Store =====
const route = useRoute()
const router = useRouter()
const departmentStore = useDepartmentStore()
const formRef = ref()
const isLoading = ref(false)

// ===== 模式判断 =====
const isEdit = computed(() => !!route.query.code)

// ===== 表单数据 =====
const departmentForm = ref<DepartmentCreateForm>({
  department_code: '',
  department_name: '',
  department_information: '',
  // 排序顺序：初始为 undefined，不填时 Store 层会默认传 0
  sort_order: undefined,
})

// ===== 表单验证规则（统一使用 blur 触发） =====
const rules = {
  department_code: [
    { required: true, message: '请输入部门编码', trigger: 'blur' },
    { min: 3, max: 20, message: '部门编码长度在 3 到 20 个字符', trigger: 'blur' },
  ],
  department_name: [
    { required: true, message: '请输入部门名称', trigger: 'blur' },
    { min: 2, max: 100, message: '部门名称长度在 2 到 100 个字符', trigger: 'blur' },
  ],
  department_information: [
    { required: true, message: '请输入部门信息员', trigger: 'blur' },
    { min: 2, max: 200, message: '部门信息员长度在 2 到 200 个字符', trigger: 'blur' },
  ],
}

// ===== 初始化 =====
onMounted(async () => {
  // 编辑模式需加载数据
  if (!isEdit.value) return

  const code = route.query.code as string
  if (!code) {
    ElMessage.error('缺少部门编码参数')
    router.push('/main/departmentdetails')
    return
  }

  try {
    isLoading.value = true

    // 确保 store 中有列表数据（列表页可能未提前请求）
    // if (!departmentStore.list || departmentStore.list.length === 0) {
    //   await departmentStore.getList()
    // }

    // 直接调用 getById 获取详情（store 需实现该方法）
    const detail = await departmentStore.getById(code)
    if (detail) {
      departmentForm.value = {
        department_code: detail.department_code,
        department_name: detail.department_name,
        department_information: detail.department_information,
        // 回显排序顺序（后端返回的 sort_order 为 number 类型）
        sort_order: detail.sort_order,
      }
    } else {
      ElMessage.error('未找到对应部门，请检查部门编码是否正确')
      router.push('/main/departmentdetails')
    }
  } catch (error: unknown) {
    console.error('加载部门详情失败:', error)
    ElMessage.error('加载部门数据失败，请稍后重试')
  } finally {
    isLoading.value = false
  }
})

// ===== 提交表单 =====
// 编辑时使用 update，需传入 department_code 字段
const submitForm = () => {
  formRef.value.validate(async (valid: boolean) => {
    if (!valid) {
      ElMessage.error('请完善必填信息！')
      return
    }

    try {
      if (isEdit.value) {
        // 编辑模式：调用 update，注意 departmentStore.update 期望 Partial<Department> 或 DepartmentUpdateForm
        // 确保 update 方法接收包含 department_code 的对象
        await departmentStore.update({
          department_code: departmentForm.value.department_code,
          department_name: departmentForm.value.department_name,
          department_information: departmentForm.value.department_information,
          // 排序顺序：有值则传，undefined 时不传（保持后端原值）
          ...(departmentForm.value.sort_order !== undefined && {
            sort_order: departmentForm.value.sort_order,
          }),
        })
        ElMessage.success('部门修改成功！')
      } else {
        // 新增模式：调用 create
        await departmentStore.create(departmentForm.value)
        ElMessage.success('部门录入成功！')
      }

      // 通知列表页刷新
      departmentStore.setRefreshFlag(true)
      router.push('/main/departmentdetails')
    } catch (error: unknown) {
      // 类型安全错误处理
      if (isAxiosError(error)) {
        const msg = error.response?.data?.message || error.message
        ElMessage.error(`操作失败：${msg}`)
      } else if (error instanceof Error) {
        ElMessage.error(`操作失败：${error.message}`)
      } else {
        ElMessage.error('操作失败：发生未知错误')
      }
      console.error('部门操作失败:', error)
    }
  })
}

// ===== 重置表单（仅新增模式） =====
const resetForm = () => {
  formRef.value.resetFields()
  ElMessage.info('表单已重置')
}

// ===== 返回上一页 =====
const goBack = () => {
  router.go(-1)
}
</script>

<style scoped lang="scss">
.department-form {
  padding: 24px;
  box-sizing: border-box;
  width: 100%;
  height: 100%;

  .box-card {
    margin: 0;
    height: 100%;
    display: flex;
    flex-direction: column;

    .card-header {
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: bold;
      color: var(--color-primary-light);

      .el-icon {
        font-size: 20px;
      }
    }
  }

  .full-width-form {
    width: 100%;
    flex: 1;
  }

  .section-title {
    color: var(--text-primary);
    font-size: 20px;
    font-weight: bold;
    margin: 20px 0 16px 0;
    padding-bottom: 8px;
    border-bottom: 2px solid var(--color-primary-light);
  }

  .el-form .el-form-item {
    margin-bottom: 20px;
  }

  .form-actions {
    text-align: center;
    margin-top: 20px;

    .el-button {
      margin: 0 8px;
    }
  }
}

// Element Plus 输入框样式优化
:deep(.el-input__wrapper) {
  box-shadow: 0 0 0 1px var(--border-color-input) inset;

  &:hover {
    box-shadow: 0 0 0 1px var(--border-color-input-dark) inset;
  }

  &.is-focus {
    box-shadow: 0 0 0 1px var(--color-primary-light) inset;
  }
}

:deep(.el-textarea__inner) {
  box-shadow: 0 0 0 1px var(--border-color-input) inset;

  &:hover {
    box-shadow: 0 0 0 1px var(--border-color-input-dark) inset;
  }

  &:focus {
    box-shadow: 0 0 0 1px var(--color-primary-light) inset;
  }
}
</style>
