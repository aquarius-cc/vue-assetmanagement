<!--
@file 仪表盘用户信息卡片，展示当前用户头像/账号/登录时长/时间
@component DashboardUserInfo
@usedBy
  - components/DashboardPage.vue: 仪表盘用户信息区域
@dependsOn
  - (无外部依赖，纯展示组件)
-->
<template>
  <el-card class="info-card user-info-card">
    <template #header>
      <div class="card-header">
        <div class="user-info-header">
          <el-icon><User /></el-icon>
          <span>用户信息</span>
        </div>
        <el-button type="primary" size="small" class="logout-btn" @click="$emit('logout')"
          >退出</el-button
        >
      </div>
    </template>
    <div class="user-profile">
      <div class="user-avatar">
        <el-avatar :size="60">
          {{ authInfo.real_name ? authInfo.real_name.charAt(0) : 'U' }}
        </el-avatar>
      </div>
      <div class="user-details">
        <h3>{{ authInfo.real_name || '用户' }}</h3>
        <p>账号: {{ authInfo.auth_name || '--' }}</p>
      </div>
    </div>
    <div class="session-info">
      <div class="session-item">
        <span class="session-label">本次登录时长</span>
        <span class="session-value">{{ loginDuration }}</span>
      </div>
    </div>
    <div class="time-info">
      <p class="current-time">{{ currentTime }}</p>
      <p class="current-date">{{ currentDate }}</p>
    </div>
  </el-card>
</template>

<script lang="ts" setup>
import { User } from '@element-plus/icons-vue'

defineProps<{
  authInfo: { real_name: string; auth_name: string }
  loginDuration: string
  currentTime: string
  currentDate: string
}>()

defineEmits<{
  logout: []
}>()
</script>

<style lang="scss" scoped>
@use '@/assets/styles/common-forms.scss' as *;

.user-info-card {
  background: var(--gradient-pink);

  :deep(.el-card__header) {
    background: var(--overlay-white-light);
    border-bottom: 1px solid var(--overlay-white-medium);
  }

  :deep(.el-card__body) {
    background: var(--gradient-pink);
    color: $white;
  }

  .user-profile {
    display: flex;
    align-items: center;
    gap: 16px;
    margin-bottom: 20px;

    .user-avatar {
      flex-shrink: 0;
    }

    .user-details {
      h3 {
        margin: 0 0 4px 0;
        color: $white;
        font-size: 18px;
      }

      p {
        margin: 0;
        color: var(--overlay-white-text);
        font-size: 14px;
      }
    }

    .logout-btn {
      background: var(--overlay-white-medium);
      border: 1px solid var(--overlay-white-strong);
      color: $white;
      margin-left: auto;

      &:hover {
        background: var(--overlay-white-strong);
      }
    }
  }

  .session-info {
    background: var(--overlay-white-light);
    border-radius: 8px;
    padding: 12px 16px;
    margin-bottom: 16px;
    backdrop-filter: blur(10px);

    .session-item {
      display: flex;
      justify-content: space-between;
      align-items: center;

      .session-label {
        font-size: 13px;
        opacity: 0.9;
      }

      .session-value {
        font-size: 16px;
        font-weight: 600;
        font-family: 'Courier New', monospace;
      }
    }
  }

  .time-info {
    text-align: center;
    padding: 16px;
    background: var(--overlay-white-light);
    border-radius: 8px;
    backdrop-filter: blur(10px);

    .current-time {
      font-size: 28px;
      font-weight: 700;
      margin: 0 0 8px 0;
      letter-spacing: 2px;
      text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
    }

    .current-date {
      font-size: 14px;
      margin: 0;
      opacity: 0.9;
    }
  }

  @media (max-width: 767px) {
    .user-profile {
      flex-direction: column;
      text-align: center;
      gap: 12px;

      .user-details {
        h3 {
          font-size: 16px;
        }

        p {
          font-size: 13px;
        }
      }
    }

    .session-info {
      padding: 8px 12px;

      .session-value {
        font-size: 14px;
      }
    }

    .time-info {
      padding: 12px;

      .current-time {
        font-size: 24px;
      }

      .current-date {
        font-size: 12px;
      }
    }
  }
}
</style>
