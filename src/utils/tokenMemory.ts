/**
 * @file 内存态 Access Token（cookie 通道专用）
 * @module utils/tokenMemory
 * @exports
 *   - setInMemoryAccessToken: 写入内存 Token
 *   - getInMemoryAccessToken: 读取内存 Token
 *   - clearInMemoryAccessToken: 清除内存 Token
 * @description
 *   cookie 通道的 access_token 为 HttpOnly，JS 无法直接读取，
 *   登录/刷新成功后从响应体提取并保存在内存，供 WS(?token=) 等场景使用。
 *   页面刷新后内存清空，由 initAuthState 通过 refresh 端点重新获取。
 */

let inMemoryAccessToken: string | null = null

export function setInMemoryAccessToken(token: string | null): void {
  inMemoryAccessToken = token
}

export function getInMemoryAccessToken(): string | null {
  return inMemoryAccessToken
}

export function clearInMemoryAccessToken(): void {
  inMemoryAccessToken = null
}
