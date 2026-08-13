/**
 * @file 统一 3-way 响应式类型访问器，兼容 Ref / computed(get-set) / plain value
 * @module src/utils/reactiveAccess
 * @exports
 *   - readReactive: 读取 Ref / get() / 直接值
 *   - writeReactive: 写入 Ref / set() / 直接赋值
 *   - readStoreValue: 安全获取 ComputedRef / Ref / getter 的值
 * @callers
 *   - composables/usePaginationSearch
 *   - composables/usePaginationSearchState
 * @dependsOn
 *   - vue (isRef, Ref, ComputedRef)
 */

import { isRef, type Ref, type ComputedRef } from 'vue'

/** 读取值：兼容 Ref / get() / 直接值 */
export function readReactive<T>(value: unknown): T {
  if (isRef(value)) return (value as Ref<T>).value
  if (typeof value === 'object' && value !== null && 'get' in value) {
    return (value as { get(): T }).get()
  }
  return value as T
}

/** 写入值：兼容 Ref / set() / 直接赋值 */
export function writeReactive(value: unknown, val: unknown): void {
  if (isRef(value)) {
    ;(value as Ref).value = val
  } else if (typeof value === 'object' && value !== null && 'set' in value) {
    ;(value as { set(v: unknown): void }).set(val)
  }
}

/** 安全获取 ComputedRef/Ref/boolean/getter 的值 */
export function readStoreValue<T>(raw: ComputedRef<T> | Ref<T> | T | (() => T)): T {
  if (typeof raw === 'function') return (raw as () => T)()
  if (isRef(raw)) return raw.value
  if (raw && typeof raw === 'object' && 'value' in raw)
    return (raw as unknown as ComputedRef<T>).value
  return raw as T
}
