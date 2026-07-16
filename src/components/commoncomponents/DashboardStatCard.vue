<!--
  DashboardStatCard.vue
  仪表盘统计卡片通用组件 — 从 DashboardPage 提取的重复卡片模式
  接收 title/icon/statistics/refreshable 渲染统一格式
-->
<template>
  <el-card class="info-card" :class="cardClass">
    <template #header>
      <div class="card-header">
        <el-icon><component :is="icon" /></el-icon>
        <span>{{ title }}</span>
        <el-button
          v-if="refreshable"
          link
          size="small"
          :icon="Refresh"
          :loading="loading"
          class="refresh-btn"
          @click="$emit('refresh')"
        >
          刷新
        </el-button>
        <slot name="header-extra" />
      </div>
    </template>
    <!-- 统计数据 -->
    <div v-if="stats && stats.length > 0" class="statistics">
      <div v-for="(stat, idx) in stats" :key="idx" class="stat-item">
        <div class="stat-number" :class="stat.class">{{ stat.value }}</div>
        <div class="stat-label">{{ stat.label }}</div>
      </div>
    </div>
    <!-- 内容区（插槽） -->
    <slot />
  </el-card>
</template>

<script lang="ts" setup>
import { Refresh } from '@element-plus/icons-vue'

export interface StatItem {
  value: string | number
  label: string
  class?: string
}

defineProps<{
  title: string
  icon: string
  stats?: StatItem[]
  refreshable?: boolean
  loading?: boolean
  cardClass?: string
}>()

defineEmits<{
  refresh: []
}>()
</script>

<style scoped>
.statistics {
  display: flex;
  justify-content: space-around;
  margin-bottom: 20px;
}

.stat-item {
  text-align: center;
}

.stat-number {
  font-size: 28px;
  font-weight: 700;
  margin-bottom: 8px;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.stat-number.pending-waste {
  color: var(--el-color-warning);
}

.stat-number.wasted {
  color: var(--el-color-danger);
}

.stat-label {
  font-size: 13px;
  opacity: 0.85;
}
</style>
