<script lang="ts" setup>
import { useRouter } from 'vue-router'
import { ref } from 'vue'

const router = useRouter()
const visible = defineModel<boolean>('visible', { required: true })

const userName = ref('')
const userPassword = ref('')

function toLogin() {
  visible.value = false
  router.push({
    path: '/login',
  })
}
</script>

<template>
  <el-dialog v-model="visible" title="登录" width="500" center>
    <div class="login-box">
      <div class="form-item">
        <span class="form-label">用户名：</span>
        <el-input
          v-model="userName"
          placeholder="请输入用户名"
          clearable
        />
      </div>
      <div class="form-item">
        <span class="form-label">密码：</span>
        <el-input
          v-model="userPassword"
          type="password"
          placeholder="请输入密码"
          show-password
          clearable
        />
      </div>
    </div>
    <template #footer>
      <div class="dialog-footer">
        <el-button @click="visible = false">取消</el-button>
        <el-button type="primary" @click="toLogin">登录</el-button>
      </div>
    </template>
  </el-dialog>
</template>

<style lang="scss" scoped>
@use '@/assets/styles/common-forms.scss' as *;

.login-box {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 24px 16px;
  box-sizing: border-box;

  .form-item {
    display: flex;
    align-items: center;
    gap: 12px;

    .form-label {
      flex-shrink: 0;
      width: 80px;
      text-align: right;
      font-size: 14px;
      font-weight: 500;
      color: $text-primary;
    }

    .el-input {
      flex: 1;
    }
  }
}

.dialog-footer {
  display: flex;
  justify-content: center;
  gap: 16px;

  .el-button {
    min-width: 100px;
    border-radius: 8px;
    font-weight: 500;
  }
}
</style>
