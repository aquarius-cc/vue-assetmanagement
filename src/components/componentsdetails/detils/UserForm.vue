<!--
  UserForm.vue
  员工表单页（新增 / 编辑）
  模式判断：路由 query 中有 jobcode 参数 → 编辑模式，否则 → 新增模式
-->
<template>
  <div class="user-form" v-loading="isLoading" element-loading-text="加载中...">
    <el-card class="box-card">
      <template #header>
        <div class="card-header">
          <el-icon><Plus /></el-icon>
          <span>{{ isEdit ? '编辑用户信息' : '新增用户' }}</span>
        </div>
      </template>

      <el-form
        ref="userFormRef"
        :model="userForm"
        :rules="formRules"
        label-width="140px"
        size="default"
        class="full-width-form"
      >
        <el-row :gutter="20">
          <el-col :span="24">
            <h3 class="section-title">员工信息</h3>
          </el-col>

          <!-- 工号：编辑模式不可编辑，新增模式可编辑 -->
          <el-col :xs="24" :sm="24" :md="12">
            <el-form-item label="用户工号" prop="employee_jobcode">
              <el-input
                v-model="userForm.employee_jobcode"
                placeholder="请输入用户工号"
                :disabled="isEdit"
                clearable
              />
            </el-form-item>
          </el-col>

          <!-- 姓名：所有模式均可编辑 -->
          <el-col :xs="24" :sm="24" :md="12">
            <el-form-item label="用户姓名" prop="employee_name">
              <el-input v-model="userForm.employee_name" placeholder="请输入用户姓名" clearable />
            </el-form-item>
          </el-col>

          <!-- 状态：所有模式均可编辑 -->
          <el-col :xs="24" :sm="24" :md="12">
            <el-form-item label="用户状态" prop="employee_status">
              <el-select
                v-model="userForm.employee_status"
                placeholder="请选择用户状态"
                style="width: 100%"
              >
                <el-option v-for="item in EmployeeStatus" :key="item" :label="item" :value="item" />
              </el-select>
            </el-form-item>
          </el-col>

          <!-- 部门：所有模式均可编辑 -->
          <el-col :xs="24" :sm="24" :md="12">
            <el-form-item label="所属部门" prop="employee_department_code">
              <el-select
                v-model="userForm.employee_department_code"
                placeholder="请选择所属部门"
                style="width: 100%"
              >
                <el-option
                  v-for="department in departmentList"
                  :key="department.value"
                  :label="department.label"
                  :value="department.value"
                />
              </el-select>
            </el-form-item>
          </el-col>

          <!-- 手机号：编辑模式不可编辑，新增模式可编辑 -->
          <el-col :xs="24" :sm="24" :md="12">
            <el-form-item label="手机号" prop="employee_phone">
              <el-input v-model="userForm.employee_phone" placeholder="请输入手机号" clearable />
            </el-form-item>
          </el-col>

          <!-- 位置：所有模式均可编辑 -->
          <el-col :xs="24" :sm="24" :md="12">
            <el-form-item label="位置" prop="employee_location">
              <el-input v-model="userForm.employee_location" placeholder="请输入位置" clearable />
            </el-form-item>
          </el-col>

          <!-- 备注：所有模式均可编辑 -->
          <el-col :xs="24" :sm="24" :md="12">
            <el-form-item label="备注" prop="employee_description">
              <el-input
                v-model="userForm.employee_description"
                placeholder="请输入备注(例：员工/部长/主管)"
                clearable
              />
            </el-form-item>
          </el-col>

          <!-- 排序顺序：可选字段，不填默认为 0 -->
          <el-col :xs="24" :sm="24" :md="12">
            <el-form-item label="排序顺序" prop="sort_order">
              <el-input-number
                v-model="userForm.sort_order"
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
        <div class="form-actions">
          <el-button v-if="!isEdit" @click="resetForm">重置</el-button>
          <el-button type="primary" @click="submitForm" :loading="userStore.loading">
            {{ isEdit ? '保存修改' : '提交' }}
          </el-button>
          <el-button type="info" @click="goBack">返回</el-button>
        </div>
      </el-form>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElForm, ElFormItem, ElInput, ElButton, ElMessage } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import { EmployeeStatus } from '@/utils/User'
import type { FormInstance, FormRules } from 'element-plus'
import type { EmployeeCreateForm, EmployeeExtended } from '@/utils/User'
import { useUserStore } from '@/stores'
import { useDepartmentStore } from '@/stores'

// // 定义用户表单类型接口
// interface UserForm {
//   user_jobcode: string; // 工号
//   user_name: string; // 姓名
//   dept: string; // 部门
//   phone: string; // 手机号
//   email: string; // 邮箱
// }

// 初始化路由实例
const router = useRouter()
const route = useRoute()
const userStore = useUserStore()
const departmentStore = useDepartmentStore()

// 表单Ref
const userFormRef = ref<FormInstance>()
// 加载状态（用于编辑模式下加载数据时显示 loading）
const isLoading = ref(false)

// 表单数据初始化
const userForm = reactive<EmployeeCreateForm>({
  employee_name: '',
  employee_jobcode: '',
  employee_phone: '',
  employee_location: '',
  employee_status: EmployeeStatus.ACTIVE,
  employee_department_code: '',
  employee_description: '',
  // 排序顺序：初始为 undefined，不填时 Store 层会默认传 0
  sort_order: undefined,
})

// 判断是否为编辑模式：通过路由query中的user_jobcode是否存在
const isEdit = computed(() => {
  return !!route.query.jobcode
})

// 表单校验规则
// 注意：规则键名必须与 userForm 的字段名完全一致，否则验证不会生效
const formRules = reactive<FormRules>({
  employee_name: [
    { required: true, message: '请输入员工姓名', trigger: 'blur' },
    { min: 2, max: 20, message: '员工姓名长度在 2 到 20 个字符', trigger: 'blur' },
  ],
  employee_jobcode: [
    { required: true, message: '请输入员工工号', trigger: 'blur' },
    {
      pattern: /^[A-Z][0-9]{5}$/,
      message: '员工工号格式为一个大写字母+5个数字（例如：A12345）',
      trigger: 'blur',
    },
  ],
  employee_phone: [
    { required: true, message: '请输入员工电话', trigger: 'blur' },
    {
      pattern: /^1[3-9]\d{9}$/,
      message: '请输入正确的手机号码格式（例如：13812345678）',
      trigger: 'blur',
    },
  ],
  employee_status: [{ required: true, message: '请选择员工状态', trigger: 'change' }],
  employee_department_code: [{ required: true, message: '请选择员工部门', trigger: 'change' }],
  employee_location: [
    {
      validator: (
        rule: FormRules,
        value: string,
        callback: (error?: Error | undefined) => void,
      ) => {
        if (!value || value.trim() === '') {
          callback(new Error('请输入员工位置'))
        } else {
          callback()
        }
      },
      trigger: 'blur',
    },
  ],
  employee_description: [
    { required: true, message: '请输入员工描述', trigger: 'blur' },
    { min: 0, max: 200, message: '员工描述长度在 0 到 200 个字符', trigger: 'blur' },
  ],
})

const departmentList = computed(() => {
  return departmentStore.list.map((item) => ({
    label: item.department_name,
    value: item.department_code,
  }))
})
console.log('departmentList:', departmentList.value)
/**
 * 加载用户数据（编辑模式）
 */
const loadUserData = async () => {
  if (!isEdit.value) return

  try {
    isLoading.value = true
    // 确保列表有数据，无数据则重新拉取
    if (!userStore.list || userStore.list.length === 0) {
      await userStore.getList()
    }
    const targetUser = await getUserInfo(route.query.jobcode as string)
    // console.log('获取到的用户信息:', targetUser)
    if (targetUser) {
      // Object.assign(userForm, targetUser)
      userForm.employee_name = targetUser.employee_name
      userForm.employee_jobcode = targetUser.employee_jobcode
      userForm.employee_phone = targetUser.employee_phone
      userForm.employee_location = targetUser.employee_location
      userForm.employee_status = targetUser.employee_status
      userForm.employee_department_code = targetUser.employee_department?.department_code || ''
      userForm.employee_description = targetUser.employee_description || ''
      userForm.sort_order = targetUser.sort_order || undefined // 确保排序顺序为 undefined
    } else {
      ElMessage.error('用户不存在')
      goBack()
    }
  } catch (error) {
    console.error('获取用户信息失败：', error)
    ElMessage.error('获取用户信息失败，请联系管理员！')
  } finally {
    isLoading.value = false
  }
}

/**
 * 页面挂载时初始化
 */
onMounted(async () => {
  if (!departmentStore.list || departmentStore.list.length === 0) {
    await departmentStore.getList({ page: 1, page_size: 9999 })
    /**
     * - departmentStore 配置了 enablePagination: true, defaultPageSize: 10
     * - 调用 departmentStore.getList() 不传参数 → 默认只加载 10 条
     * - 访问过部门管理页面后，store 里可能有更多数据，所以再次进入时下拉框数据齐全
     * 本质原因： 下拉框需要全量部门数据，但 getList() 带分页只返回 10 条。
     * 所以直接传入 page: 1, page_size: 9999 来获取所有部门数据。
     */
  }
  await loadUserData()
})

/**
 * 监听路由参数变化：处理从人员A编辑跳转到人员B编辑的场景
 * Vue Router 复用相同组件时不会重新触发 onMounted，需要手动监听
 */
watch(
  () => route.query.jobcode,
  async (newJobcode, oldJobcode) => {
    if (newJobcode && newJobcode !== oldJobcode) {
      // 工号变化，重新加载用户数据
      await loadUserData()
    }
  },
)

/**
 * 模拟接口：根据工号获取用户信息（编辑模式用）
 * @param jobcode 工号
 * @returns 用户信息Promise
 */
const getUserInfo = (jobcode: string): Promise<EmployeeExtended | null> => {
  // 实际项目中替换为axios/fetch请求后端接口
  return new Promise((resolve) => {
    setTimeout(() => {
      userStore.getById(jobcode).then((res) => {
        resolve(res)
      })
    }, 300)
  })
}

/**
 * 提交表单
 */
const submitForm = async () => {
  if (!userFormRef.value) return

  try {
    // 表单校验
    await userFormRef.value.validate()

    // 区分新增/编辑逻辑（实际项目中替换为接口请求）
    if (isEdit.value) {
      // 编辑模式：调用编辑接口
      await userStore.update(userForm)
      // 刷新列表数据
      userStore.setRefreshFlag(true)
      // 显示成功提示
      ElMessage.success('编辑用户成功！')
    } else {
      // 新增模式：调用新增接口
      await userStore.create(userForm)
      // 刷新列表数据
      userStore.setRefreshFlag(true)
      // 显示成功提示
      ElMessage.success('新增用户成功！')
    }
    // 提交成功后返回上一页
    goBack()
  } catch (error) {
    // 校验失败/接口异常处理
    ElMessage.error('表单校验失败，请检查输入！')
    console.error('表单提交失败：', error)
  }
}

/**
 * 重置表单
 */
const resetForm = () => {
  if (!userFormRef.value) return

  // 重置表单数据和校验状态
  userFormRef.value.resetFields()

  // 编辑模式下保留工号（不可编辑）
  if (isEdit.value) {
    userForm.employee_jobcode = route.query.jobcode as string
  }
}

/**
 * 返回上一页
 */
const goBack = () => {
  router.back()
  // 也可指定返回某个路由：router.push({ name: 'UserList' });
}
</script>

<style lang="scss" scoped>
// 使用公共样式 mixin（与 OutAssetForm 保持一致）
@use '@/assets/styles/common-forms.scss' as *;

.user-form {
  // 继承公共表单容器样式（如不存在则忽略）
  @extend .form-container !optional;
}
</style>
