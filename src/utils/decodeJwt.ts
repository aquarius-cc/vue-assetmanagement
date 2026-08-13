/**
 * @file JWT 解码工具（不验证签名，仅解析 payload）
 * @module utils/decodeJwt
 * @exports
 *   - decodeJWTPayload: 从 JWT Token 中解析 payload
 * @callers
 *   - stores/auth: userRole 解析
 *   - router/guards: isSuperuser 判断
 *   - composables/usePermission: isSuperuser 判断
 *
 * JWT 的 payload 段使用 base64url 字符集（- 和 _），
 * 标准 atob 仅支持 base64（+ 和 /），需先转换再补位，否则含 -/_ 的 claim 会解析失败。
 */

/**
 * 从 JWT Token 中解析 payload（base64url 安全）
 * @param token JWT Token（null/undefined 或格式非法时返回 null）
 * @returns 解析后的 payload 对象；解析失败返回 null
 */
export function decodeJWTPayload(token: string | null | undefined): Record<string, unknown> | null {
  if (!token) return null
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=')
    const json = atob(padded)
    return JSON.parse(json) as Record<string, unknown>
  } catch {
    return null
  }
}
