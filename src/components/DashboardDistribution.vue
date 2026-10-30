<script setup lang="ts">
/**
 * @file 可复用饼图展示组件 — 部门分布 / 类型分布共用
 * @module components/DashboardDistribution
 * @callers DashboardPage.vue
 */
import { computed, type PropType } from 'vue'
import type { EChartsOption } from 'echarts'
// [M-26] 统一从按需注册插件导入：直连 'vue-echarts' 会绕过 plugins/echarts.ts
// 的组件注册，依赖同页其他组件的注册副作用（隐式耦合）
import { VChart } from '@/plugins/echarts'

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
      class="distribution-chart"
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
.distribution-chart {
  /* 固定饼图高度，切断与卡片高度的互测反馈（双列下 height:100% 每轮 +30px 自激膨胀） */
  flex: none;
  height: 280px;
  width: 100%;
}
.el-empty {
  padding-top: 40px;
}
</style>
