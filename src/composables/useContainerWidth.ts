/**
 * @file 容器内容盒宽 RO 观察 composable（列固定极窄降级共用判据）
 * @module composables/useContainerWidth
 * @exports
 *   - useContainerWidth: 观察元素 ref 的 contentRect.width
 * @callers
 *   - components/commoncomponents/CommonList.vue: 列固定极窄降级
 *   - components/asset/GroupedAssetChildTable.vue: 列固定极窄降级
 */
import { ref, onMounted, onBeforeUnmount, type Ref } from 'vue'

export function useContainerWidth(elementRef: Ref<HTMLElement | null>) {
  /** 观测宽；初始 +∞ = RO 缺失（jsdom）/未回调时保持常态 */
  const containerWidth = ref(Number.POSITIVE_INFINITY)
  let resizeObserver: ResizeObserver | null = null

  onMounted(() => {
    if (typeof ResizeObserver === 'undefined' || !elementRef.value) return
    resizeObserver = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect?.width
      if (typeof width === 'number') containerWidth.value = width
    })
    resizeObserver.observe(elementRef.value)
  })

  onBeforeUnmount(() => {
    resizeObserver?.disconnect()
    resizeObserver = null
  })

  return { containerWidth }
}
