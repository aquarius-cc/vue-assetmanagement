<script setup lang="ts">
/**
 * @file 资产趋势折线图 — 月份选择 + ECharts 折线图
 * @module components/DashboardAssetTrend
 * @callers DashboardPage.vue
 */
import { ref, type PropType } from 'vue'
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
})

const emit = defineEmits<{
  (e: 'month-change', value: string): void
}>()

// [M-33] 本地日期/月份拼接收敛至 Format.ts 单一事实源（toLocalDateString）
import { toLocalDateString } from '@/utils/Format'

const now = new Date()
const selectedMonth = ref(toLocalDateString(now).slice(0, 7))

const handleMonthChange = (val: string | Date) => {
  if (!val) return
  const d = val instanceof Date ? val : new Date(val)
  const year = d.getFullYear()
  const month = d.getMonth() + 1
  const startDate = toLocalDateString(new Date(year, month - 1, 1))
  const lastDay = new Date(year, month, 0).getDate()
  const endDate = toLocalDateString(new Date(year, month - 1, lastDay))
  selectedMonth.value = startDate.slice(0, 7)
  emit('month-change', `${startDate}|${endDate}`)
}
</script>

<template>
  <div class="trend-wrapper">
    <div class="trend-header">
      <span class="trend-title">资产新增趋势</span>
      <el-date-picker
        v-model="selectedMonth"
        type="month"
        placeholder="选择月份"
        size="small"
        format="YYYY-MM"
        value-format="YYYY-MM"
        :clearable="false"
        style="width: 140px"
        @change="handleMonthChange"
      />
    </div>
    <VChart :option="props.chartOption" :loading="props.loading" autoresize class="trend-chart" />
  </div>
</template>

<style scoped>
.trend-wrapper {
  display: flex;
  flex-direction: column;
  height: 100%;
}
.trend-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
  flex-shrink: 0;
}
.trend-chart {
  flex: 1;
  min-height: 220px;
  width: 100%;
}
.trend-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-dark);
}
</style>
