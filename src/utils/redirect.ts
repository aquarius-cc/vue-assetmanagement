/**
 * [AUD-54/BF-151] 站内重定向路径防御（纯函数，可测）。
 *
 * 仅接受以单个 / 开头的站内绝对路径；拒绝:
 * - 非字符串（undefined/数字等查询参数异常形态）
 * - 空串
 * - `//evil.com` 协议相对跳转
 * - `/\evil.com` 反斜杠起始（部分浏览器将其归一化为协议相对跳转）
 *
 * 消费点：LogIn.vue 登录回跳、api/request.ts buildLoginRedirectUrl 会话失效回跳。
 * 两处共用同一防线（DR-1），fallback 由调用方按各自语义传入。
 */
export function sanitizeRedirect(redirect: unknown, fallback: string): string {
  if (typeof redirect !== 'string') return fallback
  if (!redirect.startsWith('/') || redirect.startsWith('//') || redirect.startsWith('/\\')) {
    return fallback
  }
  return redirect
}
