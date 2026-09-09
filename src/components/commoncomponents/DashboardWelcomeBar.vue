<!--
@file 仪表盘欢迎栏，展示问候语 + 当前账号 + 实时时间 + 退出按钮
@component DashboardWelcomeBar
@usedBy
  - components/DashboardPage.vue: 仪表盘顶部欢迎区域
@dependsOn
  - (无外部依赖，纯展示组件，数据由父组件传递)
-->
<template>
  <section class="welcome-bar">
    <div class="welcome-greeting">
      <span class="greeting-badge">仪表盘</span>
      <h2 class="greeting-title">
        {{ greeting }}{{ authInfo.real_name ? '，' + authInfo.real_name : '' }}
      </h2>
      <p class="greeting-sub">
        {{ authInfo.auth_name ? '账号 ' + authInfo.auth_name : '' }} · 欢迎回来，今天也要高效工作
      </p>
    </div>

    <div class="welcome-side">
      <div class="session-info">
        <span class="session-label">本次登录时长</span>
        <span class="session-value">{{ loginDuration }}</span>
      </div>
      <div class="time-info">
        <span class="current-time">{{ currentTime }}</span>
        <span class="current-date">{{ currentDate }}</span>
      </div>
      <el-button type="primary" plain size="small" class="logout-btn" @click="$emit('logout')"
        >退出</el-button
      >
    </div>
  </section>
</template>

<script lang="ts" setup>
import { computed } from 'vue'

defineProps<{
  authInfo: { real_name: string; auth_name: string }
  loginDuration: string
  currentTime: string
  currentDate: string
}>()

defineEmits<{
  logout: []
}>()

const greeting = computed(() => {
  const hour = new Date().getHours()
  if (hour < 6) return '夜深了'
  if (hour < 12) return '早上好'
  if (hour < 14) return '中午好'
  if (hour < 18) return '下午好'
  return '晚上好'
})
</script>

<style lang="scss" scoped>
@use '@/assets/styles/common-forms.scss' as *;

.welcome-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 20px 24px;
  margin-bottom: 16px;
  border-radius: 8px;
  background: var(--card-background);
  border: 1px solid var(--border-color-light);
  box-shadow: var(--card-shadow);
  flex-wrap: wrap;
  /* 入场交错动画 */
  opacity: 0;
  transform: translateY(-8px);
  animation: welcome-in 0.5s ease forwards;

  .welcome-greeting {
    display: flex;
    flex-direction: column;
    gap: 8px;
    min-width: 0;
    flex: 1;

    .greeting-badge {
      align-self: flex-start;
      font-size: 12px;
      line-height: 1;
      padding: 4px 12px;
      border-radius: 4px;
      color: var(--color-primary);
      background: var(--color-primary-lighter);
      letter-spacing: 1px;
    }

    .greeting-title {
      margin: 0;
      font-size: 20px;
      font-weight: 700;
      color: var(--text-dark);
    }

    .greeting-sub {
      margin: 0;
      font-size: 13px;
      color: var(--text-secondary);
    }
  }

  .welcome-side {
    display: flex;
    align-items: center;
    gap: 16px;
    flex-shrink: 0;

    .session-info {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      line-height: 1.3;

      .session-label {
        font-size: 12px;
        color: var(--text-secondary);
      }

      .session-value {
        font-size: 16px;
        font-weight: 600;
        color: var(--text-dark);
        font-family: 'Courier New', monospace;
      }
    }

    .time-info {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      line-height: 1.3;
      padding: 0 16px;
      border-right: 1px solid var(--border-color-light);
      border-left: 1px solid var(--border-color-light);

      .current-time {
        font-size: 20px;
        font-weight: 700;
        color: var(--text-dark);
        letter-spacing: 1px;
      }

      .current-date {
        font-size: 12px;
        color: var(--text-secondary);
      }
    }

    .logout-btn {
      flex-shrink: 0;
    }
  }
}

@keyframes welcome-in {
  from {
    opacity: 0;
    transform: translateY(-8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (max-width: 767px) {
  .welcome-bar {
    padding: 16px;
    flex-direction: column;
    align-items: flex-start;

    .welcome-side {
      width: 100%;
      flex-wrap: wrap;
      gap: 12px;

      .session-info {
        align-items: flex-start;
      }

      .time-info {
        align-items: flex-start;
        padding: 0;
        border: none;
      }

      .logout-btn {
        margin-left: auto;
      }
    }
  }
}

@media (prefers-reduced-motion: reduce) {
  .welcome-bar {
    opacity: 1;
    transform: none;
    animation: none;
  }
}
</style>
