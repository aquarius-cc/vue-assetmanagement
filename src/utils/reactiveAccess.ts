/**
 * @file 统一 3-way 响应式类型访问器，兼容 Ref / computed(get-set) / plain value
 * @module src/utils/reactiveAccess
 * @exports
 *   - readReactive: 读取 Ref / get() / 直接值
 *   - writeReactive: 写入 Ref / set() / 直接赋值
 *   （readReactive 已于批次5 M-45 批B 坍缩进 readReactive——三元访问语义双实现，
 *    定义域 function/Ref/plain 为其真子集，4 处调用点已迁移）
 * @callers
 *   - composables/usePaginationSearch
 *   - components/componentsdetails/AssetContentDetails
 * @dependsOn
 *   - vue (isRef, Ref, ComputedRef)
 */

import { isRef, type Ref } from 'vue'

/** 读取值：兼容 Ref / get() / 直接值（含 store 字段 ComputedRef/Ref/plain 的读取） */
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
