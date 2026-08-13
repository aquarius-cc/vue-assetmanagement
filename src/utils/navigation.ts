/**
 * @file 安全导航工具，验证 URL 为内部路径后执行 router.push()，防止开放重定向攻击
 * @module src/utils/navigation
 * @exports
 *   - safeNavigate: 安全导航到指定 URL（仅允许 / 开头的内部路径）
 * @callers
 *   - views/NotificationList
 * @dependsOn
 *   - @/router
 */

import router from '@/router'

/**
 * 安全导航到指定 URL
 *
 * 仅允许以 `/` 开头的内部路径，拦截：
 * - 完整 URL（http://... 或 https://...）
 * - 协议相对路径（//evil.com）
 * - 危险协议（javascript:、data:、vbscript:）
 * - 空值/undefined
 *
 * @param url - 目标路径
 */
export function safeNavigate(url: string | null | undefined): void {
  if (
    !url ||
    /^https?:\/\//i.test(url) ||
    url.startsWith('//') ||
    /^\s*(javascript|data|vbscript):/i.test(url)
  ) {
    return
  }
  router.push(url)
}
