/**
 * 前端结构化日志工具（OC-2 前端收敛，DR-4 单一仓库）
 *
 * 输出 JSON 单行，字段对齐后端结构化日志：time / level / module / message / trace_id。
 * trace_id 自 utils/traceId 生成并缓存在模块级，便于同页多次日志关联。
 *
 * @callers
 *   - api/*.ts / stores/*.ts / router/guards.ts（F-P2-2 首批）
 * @dependsOn
 *   - utils/traceId
 */

import { generateTraceId } from '@/utils/traceId'

/** 日志级别 */
export type LogLevel = 'info' | 'warn' | 'error'

/** 调用方可携带的上下文（序列化进日志） */
export type LogContext = Record<string, unknown>

let sessionTraceId: string | null = null

/** 获取（懒生成）当前页会话 trace_id */
function getTraceId(): string {
  if (!sessionTraceId) {
    sessionTraceId = generateTraceId()
  }
  return sessionTraceId
}

/** 重置 trace_id（测试或路由整页跳转时可选调用） */
export function resetTraceId(): void {
  sessionTraceId = null
}

function emit(
  level: LogLevel,
  module: string,
  message: string,
  context?: LogContext,
  err?: unknown,
): void {
  const entry: Record<string, unknown> = {
    time: new Date().toISOString(),
    level,
    trace_id: getTraceId(),
    module,
    message,
  }
  if (context && Object.keys(context).length > 0) {
    entry.context = context
  }
  if (err !== undefined) {
    entry.error = err instanceof Error ? { name: err.name, message: err.message } : err
  }
  const line = JSON.stringify(entry)
  if (level === 'error') {
    console.error(line)
  } else if (level === 'warn') {
    console.warn(line)
  } else {
    // eslint-disable-next-line no-console -- logger 是全仓唯一 console 出口（DR-4/OC-2）
    console.info(line)
  }
}

/** info 级日志 */
export function logInfo(module: string, message: string, context?: LogContext): void {
  emit('info', module, message, context)
}

/** warn 级日志 */
export function logWarn(module: string, message: string, context?: LogContext): void {
  emit('warn', module, message, context)
}

/** error 级日志（err 可传 Error 实例，自动取 name/message） */
export function logError(
  module: string,
  message: string,
  err?: unknown,
  context?: LogContext,
): void {
  emit('error', module, message, context, err)
}
