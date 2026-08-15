/**
 * @file CSRF Token 读取工具（cookie 通道必用）
 * @module utils/csrf
 * @exports
 *   - getCsrfToken: 从 csrftoken Cookie 读取 CSRF Token
 * @description
 *   后端 Cookie 通道强制 CSRF（非安全方法），csrftoken Cookie 为 JS 可读，
 *   通过 X-CSRFToken 请求头回传（后端 base.py CORS_ALLOW_HEADERS 已放行）。
 */

/**
 * 从 document.cookie 读取 csrftoken
 * @returns CSRF Token；不存在或非浏览器环境返回 null
 */
export function getCsrfToken(): string | null {
  if (typeof document === 'undefined' || typeof document.cookie !== 'string') return null
  // csrftoken Cookie 名硬编码于后端 config/settings/base.py CSRF_COOKIE_NAME
  const match = document.cookie.match(/(?:^|;\s*)csrftoken=([^;]*)/)
  if (!match) return null
  try {
    return decodeURIComponent(match[1])
  } catch {
    return match[1]
  }
}
