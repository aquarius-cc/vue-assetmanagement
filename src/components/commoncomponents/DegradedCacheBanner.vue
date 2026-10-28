<!--
@file 全局降级数据提示条（M-RC-12）
@component DegradedCacheBanner
@usedBy
  - views/MainView.vue: 业务布局挂载（App.vue 含登录/404，不挂）
@dependsOn
  - api/request: degradedCacheKeys（GET 失败降级命中缓存的响应式集合）
@description
  任意 GET 降级命中缓存时显示黄条提示「当前为缓存数据」；
  同 URL 真实网络响应成功后信号清位、Banner 自动熄灭。
  单一 Banner 实例消费 Set 集合，避免按 URL 多横幅竞态。
-->
<template>
  <el-alert
    v-if="degraded"
    type="warning"
    :closable="false"
    show-icon
    class="degraded-cache-banner"
    title="当前为缓存数据，部分信息可能不是最新；网络恢复后将自动更新"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { degradedCacheKeys } from '@/api/request'

/** 任一 URL 处于降级态即显示（单一横幅，不按 URL 展开） */
const degraded = computed(() => degradedCacheKeys.size > 0)
</script>

<style scoped>
.degraded-cache-banner {
  margin-bottom: 12px;
}
</style>
