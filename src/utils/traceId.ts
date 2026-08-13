/** 生成全局唯一 trace_id（OC-1）：优先 crypto.randomUUID，降级时间戳+随机数 */
export function generateTraceId(): string {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`
}
