<!--
@file 状态标签组件，将状态枚举值映射为彩色标签展示
@component StatusTag
@usedBy
  - componentsdetails/AssetContentDetails.vue: 资产列表状态列
  - componentsdetails/OutAssetDetails.vue: 出库列表状态列
  - detils/BasicAssetDetails.vue: 资产详情状态展示
  - detils/OutAssetBasicDetails.vue: 出库详情状态展示
  - views/ScanAssetView.vue: 扫码资产状态
  - views/AssetLogsView.vue: 操作日志状态
@dependsOn
  - utils/statusMapping: 状态枚举映射表
-->
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

  // 验证状态值合法性
  const isValidStatus = (
    status: string,
    map: Record<string, { label: string; type: string }>,
  ): boolean => {
    return Object.keys(map).includes(status)
  }

  if (!isValidStatus(props.status, map)) {
    console.warn(
      `[StatusTag] Invalid status "${props.status}" for mapType "${props.mapType || 'asset'}"`,
    )
    return {
      label: props.status, // 显示原始状态值
      type: 'info', // 使用info类型标记
    }
  }

  return getStatusInfo(props.status, map)
})

const tagType = computed(() => statusInfo.value.type)
const displayText = computed(() => statusInfo.value.label)
</script>
