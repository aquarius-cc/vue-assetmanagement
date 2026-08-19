/**
 * @file Token 混淆存储工具（非加密）
 * @module src/utils/tokenCrypto
 * @description
 *   对 localStorage 中的 Token 进行 XOR + Base64 混淆。
 *
 *   ⚠️ 安全声明（H-2）：
 *   - XOR 是可逆的，这不是加密，是混淆（obfuscation）。
 *   - 密钥通过 import.meta.env 在构建时内联，可从 JS 包中提取。
 *   - 真正的安全依赖：httpOnly cookie（PC 通道已实现）+ CSP 头 + 短生命周期 JWT。
 *   - 移动端 bearer 通道的 token 暴露是 SPA 的固有限制。
 *   - 本模块的作用：防止 casual inspection（如共用设备时的简单 localStorage 查看）。
 *
 * @callers
 *   - stores/auth
 *   - composables/useNotification
 *   - router/guards
 * @dependsOn
 *   - 环境变量 VITE_TOKEN_CRYPTO_KEY（构建时必须配置）
 */

// 构建时验证：必须配置加密密钥，否则构建失败
// 这样可以防止使用默认密钥导致的零安全问题
const CRYPTO_KEY = import.meta.env.VITE_TOKEN_CRYPTO_KEY
if (!CRYPTO_KEY) {
  throw new Error(
    '[tokenCrypto] 缺少必要环境变量 VITE_TOKEN_CRYPTO_KEY。\n' +
      '请在 .env.development 或 .env.production 中配置此变量。\n' +
      '示例：VITE_TOKEN_CRYPTO_KEY=your-unique-secret-key-here',
  )
}

// 密钥质量验证：至少16个字符，防止弱密钥
if (CRYPTO_KEY.length < 16) {
  console.warn('[tokenCrypto] 加密密钥长度不足16字符，建议使用更长的密钥以提高安全性')
}

/**
 * XOR + Base64 混淆（非加密，见模块文档安全声明）
 * @param text - 要加密的文本
 * @param key - 加密密钥
 * @returns 加密后的文本（Base64 编码）
 */
function xorEncrypt(text: string, key: string): string {
  let result = ''
  for (let i = 0; i < text.length; i++) {
    result += String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i % key.length))
  }
  return btoa(encodeURIComponent(result))
}

/**
 * 简单的 XOR 解密
 * @param encoded - 加密后的文本（Base64 编码）
 * @param key - 解密密钥
 * @returns 解密后的文本
 */
function xorDecrypt(encoded: string, key: string): string {
  try {
    const text = decodeURIComponent(atob(encoded))
    let result = ''
    for (let i = 0; i < text.length; i++) {
      result += String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i % key.length))
    }
    return result
  } catch {
    return ''
  }
}

/**
 * 存储加密后的 Token
 * @param key - localStorage 键名
 * @param value - Token 值
 */
export function setEncryptedToken(key: string, value: string): void {
  try {
    const encrypted = xorEncrypt(value, CRYPTO_KEY)
    localStorage.setItem(key, encrypted)
  } catch (error) {
    console.error('Token 加密存储失败:', error)
    throw new Error(`[tokenCrypto] 加密失败，拒绝明文存储 Token: ${error}`)
  }
}

/**
 * 获取混淆后的 Token
 * @param key - localStorage 键名
 * @returns Token 值，如果解密失败返回 null（触发重新登录）
 */
export function getDecryptedToken(key: string): string | null {
  const encrypted = localStorage.getItem(key)
  if (!encrypted) return null

  try {
    const decrypted = xorDecrypt(encrypted, CRYPTO_KEY)

    // 验证解密结果是否有效（JWT Token 应包含 . 分隔符，或长度足够）
    if (decrypted.includes('.') || decrypted.length > 20) {
      return decrypted
    }

    // 解密结果无效，返回null触发重新登录
    return null
  } catch {
    // 解密过程出错，返回null触发重新登录
    return null
  }
}

/**
 * 清除 Token（同时处理加密和明文两种情况）
 * @param key - localStorage 键名
 */
export function removeToken(key: string): void {
  localStorage.removeItem(key)
}

/**
 * 清除所有认证相关的 Token
 */
export function clearAllAuthTokens(): void {
  removeToken('access_token')
  removeToken('refresh_token')
  removeToken('authInfo')
}
