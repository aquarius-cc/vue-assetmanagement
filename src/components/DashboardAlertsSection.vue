<script setup lang="ts">
/**
 * @file 双列表 Section — 即将到期 + 维护提醒
 * @module components/DashboardAlertsSection
 * @callers DashboardPage.vue
 */
import type { PropType } from 'vue'
import type { DashboardAlertItem } from '@/types/dashboard'
import DashboardAlertList from '@/components/DashboardAlertList.vue'

defineProps({
  expiringAssets: {
    type: Array as PropType<DashboardAlertItem[]>,
    required: true,
  },
  maintenanceReminders: {
    type: Array as PropType<DashboardAlertItem[]>,
    required: true,
  },
  expiringLoading: {
    type: Boolean,
    default: false,
  },
  maintenanceLoading: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits<{
  (e: 'select-asset', assetCode: string): void
}>()
</script>

<template>
  <el-row :gutter="16" class="alerts-row">
    <el-col :xs="24" :sm="24" :md="12" :lg="12" :xl="12">
      <div class="section-card">
        <h4 class="section-title">即将到期资产</h4>
        <DashboardAlertList
          :items="expiringAssets"
          :loading="expiringLoading"
          label-field="expire_date"
          empty-text="暂无即将到期资产"
          @select="(code) => emit('select-asset', code)"
        />
      </div>
    </el-col>
    <el-col :xs="24" :sm="24" :md="12" :lg="12" :xl="12">
      <div class="section-card">
        <h4 class="section-title">维护提醒</h4>
        <DashboardAlertList
          :items="maintenanceReminders"
          :loading="maintenanceLoading"
          label-field="maintenance_date"
          empty-text="暂无维护提醒"
          @select="(code) => emit('select-asset', code)"
        />
      </div>
    </el-col>
  </el-row>
</template>

<style scoped lang="scss">
@use '@/assets/styles/dashboard-sections' as *;

.alerts-row {
  margin: 0;
}
.section-card {
  @include section-card;
}
.section-title {
  @include section-title;
}
</style>
