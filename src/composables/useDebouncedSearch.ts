/**
 * @file 防抖搜索，统一 watch + debounce 逻辑并防止内存泄漏
 * @module composables/useDebouncedSearch
 * @exports
 *   - useDebouncedSearch: 防抖搜索 composable
 *   - UseDebouncedSearchOptions: 配置选项类型
 * @callers
 *   - views/ContactsView.vue
 *   - views/system/AuthUserManage.vue
 *   - views/system/RoleManage.vue
 * @dependsOn
 *   - vue: watch / onUnmounted
 *   - lodash-es: debounce
 */
import { onUnmounted, watch, type Ref } from 'vue'
import { debounce } from 'lodash-es'

export interface UseDebouncedSearchOptions {
  /** 延迟时间（毫秒），默认 300 */
  delay?: number
  /** 是否在延迟开始前调用，默认 false */
  leading?: boolean
  /** 是否在延迟结束后调用，默认 true */
  trailing?: boolean
}

export function useDebouncedSearch<T>(
  source: Ref<T>,
  callback: (value: T) => void,
  options: UseDebouncedSearchOptions = {},
) {
  const { delay = 300, leading = false, trailing = true } = options

  const debouncedCallback = debounce(callback, delay, { leading, trailing })

  watch(source, (newValue) => {
    debouncedCallback(newValue)
  })

  // 清理定时器（防止内存泄漏）
  onUnmounted(() => {
    debouncedCallback.cancel()
  })

  return { debouncedCallback }
}
