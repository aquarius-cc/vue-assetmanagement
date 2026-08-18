<script setup lang="ts">
/**
 * @file 可复用饼图展示组件 — 部门分布 / 类型分布共用
 * @module components/DashboardDistribution
 * @callers DashboardPage.vue
 */
import { computed, type PropType } from 'vue'
import type { EChartsOption } from 'echarts'
import VChart from 'vue-echarts'

const props = defineProps({
  chartOption: {
    type: Object as PropType<EChartsOption>,
    required: true,
  },
  loading: {
    type: Boolean,
    default: false,
  },
  emptyText: {
    type: String,
    default: '暂无数据',
  },
})

const hasData = computed(() => {
  const series = (props.chartOption as Record<string, unknown>)?.series as
    | Array<{ data?: unknown[] }>
    | undefined
  return series?.[0]?.data && series[0].data.length > 0
})
</script>

<template>
  <div class="distribution-wrapper">
    <VChart
      v-if="hasData"
      :option="props.chartOption"
      :loading="props.loading"
      autoresize
      style="height: 240px; width: 100%"
    />
    <el-empty v-else :description="props.emptyText" :image-size="80" />
  </div>
</template>

<style scoped>
.distribution-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
