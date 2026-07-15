<template>
  <el-tag :type="tagType" size="small" effect="light">
    {{ displayText }}
  </el-tag>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import {
  getStatusInfo,
  ASSET_STATUS_MAP,
  OUTASSET_STATUS_MAP,
  APPROVAL_STATUS_MAP,
  REPAIR_STATUS_MAP,
  HARD_DISK_STATUS_MAP,
  EMPLOYEE_STATUS_MAP,
} from '@/utils/statusMapping'

const props = defineProps<{
  /** 状态值 */
  status: string
  /** 状态映射类型，默认 asset */
  mapType?: 'asset' | 'outasset' | 'approval' | 'repair' | 'harddisk' | 'employee'
  /** 自定义映射表 */
  customMap?: Record<string, { label: string; type: string }>
}>()

const MAP_SELECTOR = {
  asset: ASSET_STATUS_MAP,
  outasset: OUTASSET_STATUS_MAP,
  approval: APPROVAL_STATUS_MAP,
  repair: REPAIR_STATUS_MAP,
  harddisk: HARD_DISK_STATUS_MAP,
  employee: EMPLOYEE_STATUS_MAP,
} as const

const statusInfo = computed(() => {
  const map = props.customMap || MAP_SELECTOR[props.mapType || 'asset']
  return getStatusInfo(props.status, map)
})

const tagType = computed(() => statusInfo.value.type)
const displayText = computed(() => statusInfo.value.label)
</script>
