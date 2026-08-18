<script setup lang="ts">
/**
 * @file 双饼图 Section — 部门分布 + 类型分布
 * @module components/DashboardDistributionSection
 * @callers DashboardPage.vue
 */
import type { EChartsOption } from 'echarts'
import type { PropType } from 'vue'
import DashboardDistribution from '@/components/DashboardDistribution.vue'

defineProps({
  deptPieOption: {
    type: Object as PropType<EChartsOption>,
    required: true,
  },
  typePieOption: {
    type: Object as PropType<EChartsOption>,
    required: true,
  },
  deptLoading: {
    type: Boolean,
    default: false,
  },
  typeLoading: {
    type: Boolean,
    default: false,
  },
})
</script>

<template>
  <el-row :gutter="16" class="distribution-row">
    <el-col :xs="24" :sm="24" :md="12" :lg="12" :xl="12">
      <div class="section-card">
        <h4 class="section-title">部门资产分布</h4>
        <DashboardDistribution
          :chart-option="deptPieOption"
          :loading="deptLoading"
          empty-text="暂无部门分布数据"
        />
      </div>
    </el-col>
    <el-col :xs="24" :sm="24" :md="12" :lg="12" :xl="12">
      <div class="section-card">
        <h4 class="section-title">资产类型分布</h4>
        <DashboardDistribution
          :chart-option="typePieOption"
          :loading="typeLoading"
          empty-text="暂无类型分布数据"
        />
      </div>
    </el-col>
  </el-row>
</template>

<style scoped lang="scss">
@use '@/assets/styles/dashboard-sections' as *;

.distribution-row {
  margin: 0;
}
.section-card {
  @include section-card;
}
.section-title {
  @include section-title;
}
</style>
