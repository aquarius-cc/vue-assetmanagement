/**
 * @file JSON 往返深拷贝（DR-4：收敛表单快照与日志上下文的重复实现）
 * @module utils/deepClone
 */

/** JSON 往返深拷贝；循环引用/函数会抛错，调用方按需捕获 */
export function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}
