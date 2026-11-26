/**
 * CSP 违规探针回归（【MA-15】C6 / M-HYG-01 对称 cleanup）
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { cleanupCspViolationProbe, installCspViolationProbe } from '../cspProbe'

vi.mock('@/utils/logger', () => ({ logError: vi.fn() }))

const windowFlags = window as unknown as Record<string, unknown>

describe('cspProbe', () => {
  beforeEach(() => {
    delete windowFlags.__cspProbeInstalled
  })

  afterEach(() => {
    cleanupCspViolationProbe()
    vi.restoreAllMocks()
  })

  it('install 幂等：重复调用只挂一个 securitypolicyviolation 监听器', () => {
    const addSpy = vi.spyOn(window, 'addEventListener')
    installCspViolationProbe()
    installCspViolationProbe()
    installCspViolationProbe()
    expect(addSpy.mock.calls.filter(([type]) => type === 'securitypolicyviolation')).toHaveLength(1)
  })

  it('cleanup 移除监听并清除标志位', () => {
    installCspViolationProbe()
    const removeSpy = vi.spyOn(window, 'removeEventListener')

    cleanupCspViolationProbe()

    expect(removeSpy).toHaveBeenCalledWith('securitypolicyviolation', expect.any(Function))
    expect(windowFlags.__cspProbeInstalled).toBeUndefined()
  })

  it('cleanup 后可重新安装成功', () => {
    installCspViolationProbe()
    cleanupCspViolationProbe()
    expect(windowFlags.__cspProbeInstalled).toBeUndefined()

    const addSpy = vi.spyOn(window, 'addEventListener')
    installCspViolationProbe()
    expect(addSpy.mock.calls.filter(([type]) => type === 'securitypolicyviolation')).toHaveLength(1)
    expect(windowFlags.__cspProbeInstalled).toBe(true)
  })

  it('cleanup 幂等：未安装时调用不报错', () => {
    expect(() => cleanupCspViolationProbe()).not.toThrow()
  })
})
