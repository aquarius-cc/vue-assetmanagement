<script setup lang="ts">
/**
 * @file 资产趋势 Section — 折线图 + 月份选择
 * @module components/DashboardTrendSection
 * @callers DashboardPage.vue
 */
import type { EChartsOption } from 'echarts'
import type { PropType } from 'vue'
import DashboardAssetTrend from '@/components/DashboardAssetTrend.vue'

defineProps({
  chartOption: {
    type: Object as PropType<EChartsOption>,
    required: true,
  },
  loading: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits<{
  (e: 'month-change', dateRange: string): void
}>()
</script>

<template>
  <div class="section-card">
    <DashboardAssetTrend
      :chart-option="chartOption"
      :loading="loading"
      @month-change="(val) => emit('month-change', val)"
    />
  </div>
</template>

<style scoped lang="scss">
@use '@/assets/styles/dashboard-sections' as *;

.section-card {
  @include section-card;
}
</style>
