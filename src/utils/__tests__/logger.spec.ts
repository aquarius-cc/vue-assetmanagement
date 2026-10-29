/**
 * logger trace_id 同步测试（M-RC-11）
 * @module utils/logger
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import { logInfo, syncTraceId, resetTraceId } from '../logger'

describe('logger trace_id 同源（M-RC-11）', () => {
  beforeEach(() => {
    resetTraceId()
    vi.spyOn(console, 'info').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('syncTraceId 后 console 日志 trace_id 与注入值同源（请求层闭环）', () => {
    syncTraceId('rid-from-request-header')

    logInfo('spec', 'hello')

    const line = (console.info as ReturnType<typeof vi.fn>).mock.calls[0][0] as string
    expect(JSON.parse(line).trace_id).toBe('rid-from-request-header')
  })

  it('每次 syncTraceId 覆写会话值（每请求唯一，OC-1 口径）', () => {
    syncTraceId('rid-1')
    logInfo('spec', 'first')
    syncTraceId('rid-2')
    logInfo('spec', 'second')

    const calls = (console.info as ReturnType<typeof vi.fn>).mock.calls
    expect(JSON.parse(calls[0][0]).trace_id).toBe('rid-1')
    expect(JSON.parse(calls[1][0]).trace_id).toBe('rid-2')
  })

  it('resetTraceId 后回到懒生成路径（登出/登录重置语义）', () => {
    syncTraceId('rid-old')
    resetTraceId()

    logInfo('spec', 'after-reset')

    const line = JSON.parse((console.info as ReturnType<typeof vi.fn>).mock.calls[0][0] as string)
    expect(line.trace_id).not.toBe('rid-old')
    expect(typeof line.trace_id).toBe('string')
  })
})
