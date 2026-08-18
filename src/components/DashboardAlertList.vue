<script setup lang="ts">
/**
 * @file 可复用告警列表组件 — 即将到期 / 维护提醒共用
 * @module components/DashboardAlertList
 * @callers DashboardPage.vue
 */
import { computed, type PropType } from 'vue'
import type { DashboardAlertItem } from '@/types/dashboard'

const props = defineProps({
  items: {
    type: Array as PropType<DashboardAlertItem[]>,
    required: true,
  },
  loading: {
    type: Boolean,
    default: false,
  },
  labelField: {
    type: String,
    required: true,
  },
  emptyText: {
    type: String,
    default: '暂无告警',
  },
})

const emit = defineEmits<{
  (e: 'select', assetCode: string): void
}>()

const displayItems = computed(() => props.items.slice(0, 10))
</script>

<template>
  <div class="alert-list-wrapper">
    <el-table
      :data="displayItems"
      v-loading="props.loading"
      size="small"
      :show-header="false"
      empty-text=""
      style="width: 100%"
      @row-click="(row: DashboardAlertItem) => emit('select', row.asset_code)"
    >
      <el-table-column prop="asset_name" min-width="0" />
      <el-table-column :prop="props.labelField" min-width="0" align="right">
        <template #default="{ row }">
          <span class="alert-label">{{ row[props.labelField] }}</span>
        </template>
      </el-table-column>
    </el-table>
    <el-empty
      v-if="!props.loading && props.items.length === 0"
      :description="props.emptyText"
      :image-size="60"
    />
  </div>
</template>

<style scoped>
.alert-list-wrapper {
  min-height: 120px;
}
.alert-label {
  font-size: 12px;
  color: var(--color-text-secondary, #6b7280);
}
</style>
