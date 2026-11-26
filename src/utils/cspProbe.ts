/**
 * CSP 违规探针（【MA-15】C6，默认关闭）
 *
 * 构建期 VITE_CSP_PROBE === 'true' 时才挂 securitypolicyviolation 监听，
 * 违规事件经 logger → frontend_log 既有通道上报（复用 60/min 限流与白名单脱敏）。
 * 零违规零成本；部署侧不设该变量即为关闭态。
 */

const CSP_PROBE_FLAG = '__cspProbeInstalled'
let violationListener: ((event: SecurityPolicyViolationEvent) => void) | null = null

/**
 * 安装 CSP 违规探针（幂等：重复调用不重复挂载）
 */
export function installCspViolationProbe(): void {
  if (
    typeof window === 'undefined' ||
    (window as unknown as Record<string, unknown>)[CSP_PROBE_FLAG]
  ) {
    return
  }
  ;(window as unknown as Record<string, unknown>)[CSP_PROBE_FLAG] = true

  violationListener = (event) => {
    // 动态延迟导入,避免探针未启用时的任何额外首屏成本
    void import('@/utils/logger').then(({ logError }) => {
      logError(
        'utils/cspProbe',
        `CSP violation: ${event.effectiveDirective} blocked ${event.blockedURI}`,
        new Error(
          `document-uri=${event.documentURI} violated-directive=${event.effectiveDirective} ` +
            `blocked-uri=${event.blockedURI} disposition=${event.disposition} status=${event.statusCode}`,
        ),
      )
    })
  }
  window.addEventListener('securitypolicyviolation', violationListener)
}

/** 卸载 CSP 探针并清除标志位，允许重新安装 */
export function cleanupCspViolationProbe(): void {
  if (typeof window === 'undefined') return
  if (violationListener) {
    window.removeEventListener('securitypolicyviolation', violationListener)
  }
  violationListener = null
  delete (window as unknown as Record<string, unknown>)[CSP_PROBE_FLAG]
}
