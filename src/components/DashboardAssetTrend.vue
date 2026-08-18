<script setup lang="ts">
/**
 * @file 资产趋势折线图 — 月份选择 + ECharts 折线图
 * @module components/DashboardAssetTrend
 * @callers DashboardPage.vue
 */
import { ref, type PropType } from 'vue'
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
})

const emit = defineEmits<{
  (e: 'month-change', value: string): void
}>()

const now = new Date()
const selectedMonth = ref(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`)

const handleMonthChange = (val: string | Date) => {
  if (!val) return
  const d = val instanceof Date ? val : new Date(val)
  const year = d.getFullYear()
  const month = d.getMonth() + 1
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`
  const lastDay = new Date(year, month, 0).getDate()
  const endDate = `${year}-${String(month).padStart(2, '0')}-${lastDay}`
  selectedMonth.value = `${year}-${String(month).padStart(2, '0')}`
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
    <VChart
      :option="props.chartOption"
      :loading="props.loading"
      autoresize
      style="height: 220px; width: 100%"
    />
  </div>
</template>

<style scoped>
.trend-wrapper {
  display: flex;
  flex-direction: column;
}
.trend-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}
.trend-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text-primary, #1f2937);
}
</style>
