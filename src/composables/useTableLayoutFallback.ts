/**
 * @file 表格挂载后布局重算 composable（消除列表页列宽首算抖动）
 * @module composables/useTableLayoutFallback
 * @exports
 *   - useTableLayoutFallback: 等待 onReady 完成后 nextTick 重算 EP 表格布局
 * @callers
 *   - components/commoncomponents/CommonList.vue
 *   - components/GroupedAssetTable.vue
 *   - views/system/RoleManage.vue
 *   - views/system/AuthUserManage.vue
 */
import { nextTick, onMounted, type Ref } from 'vue'

export interface RelayoutTarget {
  doLayout?: () => void
}

export function useTableLayoutFallback<T extends RelayoutTarget | null>(
  tableRef: Ref<T>,
  onReady?: () => void | Promise<unknown>,
) {
  const relayout = async () => {
    await nextTick()
    tableRef.value?.doLayout?.()
  }

  onMounted(async () => {
    try {
      if (onReady) await onReady()
    } finally {
      await relayout()
    }
  })

  return { relayout }
}
