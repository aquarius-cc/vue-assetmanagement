<!--
@file 用户登录页面，包含用户名密码登录表单与暗色模式切换
@component LogIn
@usedBy
  - router/index.ts: 路由懒加载
@dependsOn
  - stores/auth: 登录认证与Token管理
  - stores/app: 应用全局状态
  - api/network: 网络请求封装
-->
<template>
  <div class="login-container">
    <el-card class="login-card">
      <template #header>
        <div class="card-header">
          <h2>用户登录</h2>
        </div>
      </template>

      <el-form
        ref="formRef"
        :model="loginForm"
        :rules="loginRules"
        label-width="80px"
        class="login-form"
      >
        <!-- 用户名输入框 -->
        <el-form-item label="用户名" prop="username">
          <el-input
            v-model="loginForm.auth_username"
            placeholder="请输入用户名"
            clearable
            :prefix-icon="User"
            @keyup.enter="handleKeyPress"
          />
        </el-form-item>
        <!-- 密码输入框 -->
        <el-form-item label="密码" prop="password">
          <el-input
            v-model="loginForm.password"
            type="password"
            placeholder="请输入密码"
            show-password
            clearable
            :prefix-icon="Lock"
            @keyup.enter="handleKeyPress"
          />
        </el-form-item>

        <!-- 记住密码选项 -->
        <el-form-item>
          <el-row justify="space-between" align="middle">
            <el-col :span="12">
              <el-checkbox v-model="loginForm.rememberMe">记住密码</el-checkbox>
            </el-col>
            <el-col :span="12" style="text-align: right">
              <!-- 预留：其他操作按钮位置 -->
            </el-col>
          </el-row>
        </el-form-item>

        <!-- 登录按钮 -->
        <el-form-item class="login-btn-group">
          <el-button type="primary" class="login-btn" :loading="loading" @click="handleLogin">
            {{ loading ? '登录中...' : '登录' }}
          </el-button>
          <el-button @click="resetForm" class="login-reset">重置</el-button>
          <el-button type="info" :icon="Connection" @click="testNetwork" class="network-test">
            网络测试
          </el-button>
        </el-form-item>

        <!-- 登录错误提示：持久显示，直到用户手动关闭 -->
        <el-alert
          v-if="loginError"
          :title="loginError"
          type="error"
          show-icon
          :closable="true"
          @close="loginError = ''"
          class="login-error"
        />
      </el-form>
    </el-card>
  </div>
</template>
<script lang="ts" setup>
import { reactive, ref, onMounted } from 'vue'
import { User, Lock, Connection } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useAppStore } from '@/stores/app'
import type { LoginForm } from '@/types/authuser'
import { networkAPI } from '@/api/network'

const router = useRouter()
const authStore = useAuthStore()
const appStore = useAppStore()
const formRef = ref<FormInstance>()
const loading = ref(false)
/** 登录错误提示信息（持久显示，直到用户手动关闭） */
const loginError = ref('')

const loginForm = reactive<LoginForm>({
  auth_username: '',
  password: '',
  rememberMe: false,
})

// 初始化时检查是否已登录
onMounted(async () => {
  // 初始化用户状态（通道感知）：
  //   bearer 通道从加密存储恢复；cookie 通道经 refresh 端点验证会话并取 access
  await authStore.initAuthState()

  // 如果已登录（通过 token 验证），直接跳转到主页
  if (authStore.isLoggedIn && authStore.access_token) {
    // 恢复记住密码的用户名（优先从store获取，其次从加密存储读取）
    const savedRememberMe = localStorage.getItem('rememberMe') === 'true'

    if (savedRememberMe && authStore.authInfo) {
      loginForm.auth_username = authStore.authInfo.auth_username
      loginForm.rememberMe = true
    }
    router.replace('/main')
  }
})

/**
 * 用户名验证函数
 *
 * 验证规则：
 * 1. 必填项
 * 2. 长度 3-20 个字符
 * 3. 只能包含字母、数字和下划线
 *
 * 优化点：将复合错误提示拆分为单独提示，帮助用户精确定位问题
 */
const validateUsername = (_rule: unknown, value: string, callback: (error?: Error) => void) => {
  if (!value) {
    return callback(new Error('请输入用户名'))
  }
  if (value.length < 3) {
    return callback(new Error('用户名长度不能少于3个字符'))
  }
  if (value.length > 20) {
    return callback(new Error('用户名长度不能超过20个字符'))
  }
  if (!/^[a-zA-Z0-9_]+$/.test(value)) {
    return callback(new Error('用户名只能包含字母、数字和下划线'))
  }
  callback()
}

/**
 * 密码验证函数
 *
 * 验证规则：
 * 1. 必填项
 * 2. 长度 6-20 个字符
 * 3. 必须包含至少一个字母和一个数字
 *
 * 优化点：
 * - 将长度验证拆分为两个独立提示
 * - 将字符类型验证拆分为两个独立提示
 * - 帮助用户更清楚地了解密码要求
 */
const validatePassword = (_rule: unknown, value: string, callback: (error?: Error) => void) => {
  if (!value) {
    return callback(new Error('请输入密码'))
  }
  if (value.length < 6) {
    return callback(new Error('密码长度不能少于6位'))
  }
  if (value.length > 20) {
    return callback(new Error('密码长度不能超过20位'))
  }
  if (!/[a-zA-Z]/.test(value)) {
    return callback(new Error('密码需要包含至少一个字母'))
  }
  if (!/\d/.test(value)) {
    return callback(new Error('密码需要包含至少一个数字'))
  }
  callback()
}

// 表单验证规则
const loginRules: FormRules = {
  auth_username: [{ validator: validateUsername, trigger: 'blur' }],
  password: [{ validator: validatePassword, trigger: 'blur' }],
}

// 登录处理函数
const handleLogin = async () => {
  // console.log('API Base URL:', api.defaults.baseURL)
  if (!formRef.value) return
  try {
    // 清除之前的错误提示
    loginError.value = ''

    const valid = await formRef.value.validate().catch(() => false)
    if (valid) {
      loading.value = true
      appStore.setLoading(true)

      // 准备API调用数据
      const loginData: LoginForm = {
        auth_username: loginForm.auth_username,
        password: loginForm.password,
        rememberMe: loginForm.rememberMe,
      }

      // 调用用户store的登录方法
      const result = await authStore.login(loginData)

      if (result.success) {
        // 处理记住密码
        if (loginForm.rememberMe) {
          localStorage.setItem('savedUsername', loginForm.auth_username)
          localStorage.setItem('rememberMe', 'true')
        } else {
          localStorage.removeItem('savedUsername')
          localStorage.removeItem('rememberMe')
        }

        // 设置页面标题
        appStore.setPageTitle('首页')

        // 登录成功后跳转到主页面
        await router.push('/main')
      } else {
        // 登录失败：在表单内显示详细错误信息（持久显示，直到用户手动关闭）
        loginError.value = result.message || '登录失败'
      }
    }
  } catch (error: unknown) {
    // 表单验证失败：Element Plus validate() 拒绝时返回 { valid: false, errors: [...] }
    // 此时无需显示错误提示（表单字段下方已有校验提示）
    // 以下代码可删除（不再需要判断校验失败）
    // if (error && typeof error === 'object' && 'valid' in error) {
    //   return
    // }
    // 其他异常（网络异常、服务器错误等）
    console.error('登录异常:', error)
    loginError.value = '网络异常，请检查网络连接后重试'
  } finally {
    loading.value = false
    appStore.setLoading(false)
  }
}

// 重置表单
const resetForm = () => {
  if (!formRef.value) return
  formRef.value.resetFields()

  // 保留记住密码的用户名
  if (loginForm.rememberMe) {
    const savedUsername = localStorage.getItem('savedUsername')
    if (savedUsername) {
      loginForm.auth_username = savedUsername
    }
  }
}

const testNetwork = async () => {
  ElMessage.info('开始网络诊断...')

  const results = {
    connection: await networkAPI.testConnection(),
    login: await networkAPI.testLoginAPI(),
  }

  // 网络诊断结果已在下方消息中展示

  // 显示诊断结果
  let message = '🔍 网络诊断报告:\n\n'
  message += `📡 Django服务器连接: ${results.connection.status === 'success' ? '✅ 正常' : '❌ 失败'}\n`
  const loginIcon = results.login.status === 'success' ? '✅ 正常'
    : results.login.status === 'skipped' ? '⏭️ 已跳过' : '❌ 失败'
  message += `🔐 登录接口: ${loginIcon}\n\n`

  if (results.login.status === 'error') {
    message += '❗ 登录接口不存在，解决建议:\n'
    message += '🔹 启用Mock模式继续开发\n'
    message += '🔹 创建Django后端API接口\n'
    message += '🔹 查看控制台获取详细错误信息\n\n'
    message += '💡 点击下方 "Mock模式" 复选框可启用模拟数据登录'
  }

  ElMessage({
    message,
    type: results.login.status === 'success' ? 'success'
      : results.login.status === 'skipped' ? 'info' : 'warning',
    duration: 8000,
    showClose: true,
  })
}

// 键盘事件处理
const handleKeyPress = (event: KeyboardEvent) => {
  if (event.key === 'Enter') {
    handleLogin()
  }
}
</script>

<style scoped>
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: var(--gradient-purple);
}

.login-card {
  width: 480px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
  border-radius: 16px;
  border: none;
  overflow: hidden;
}

.card-header {
  text-align: center;
  padding: 24px;
  background: var(--gradient-card-highlight);
  border-bottom: 1px solid var(--border-color);
}

.card-header h2 {
  margin: 0;
  color: var(--text-primary);
  font-weight: 600;
  font-size: 22px;
}

.login-form {
  padding: 32px 40px 40px;
}

.login-btn-group {
  width: 100%;
  text-align: center;
  margin-top: 24px;
}

.login-btn,
.login-reset,
.network-test {
  margin: 0 8px;
  min-width: 100px;
  border-radius: 8px;
  font-weight: 500;
}

.network-test {
  /* margin-top: 6px; */
  font-size: 13px;
  background: var(--background-color);
  border-color: var(--border-color-input);
  color: var(--text-regular);
}

.login-btn {
  background: linear-gradient(
    135deg,
    var(--color-primary-light) 0%,
    var(--color-primary-light-mid) 100%
  );
  border: none;
}

.login-btn:hover {
  background: linear-gradient(
    135deg,
    var(--color-primary-light-mid) 0%,
    var(--color-primary-light-lighter) 100%
  );
}

.el-form-item:last-child {
  margin-bottom: 0;
}

:deep(.el-input__wrapper) {
  border-radius: 8px;
  padding: 4px 12px;
}

:deep(.el-button) {
  border-radius: 8px;
}

:deep(.el-form-item__label) {
  font-weight: 500;
  color: var(--text-primary);
}

.login-error {
  margin-top: 16px;
  border-radius: 8px;
}
</style>

<!-- 全局样式：ElMessage 纯文本模式保留换行 -->
<style>
.el-message .el-message__content {
  white-space: pre-line;
}
</style>
