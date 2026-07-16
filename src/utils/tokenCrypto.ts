/**
 * Token 加密/解密工具
 * 用于对 localStorage 中的 Token 进行简单加密
 * 目的是防止明文存储，提高安全性
 *
 * 安全说明：
 * - 加密密钥必须通过环境变量 VITE_TOKEN_CRYPTO_KEY 配置
 * - 开发环境和生产环境应使用不同的密钥
 * - 此加密仅增加窃取成本，不影响后端验证（后端使用JWT签名验证）
 *
 * 迁移说明：
 * - 旧版本使用默认密钥 'asset_management_default_key_2024' 加密
 * - 更换密钥后，旧token无法解密，用户会被强制登出重新登录
 * - 这是预期行为，确保密钥变更后不会使用不安全的旧数据
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

// 旧版本默认密钥（仅用于兼容性检测，不用于加密）
const OLD_DEFAULT_KEY = 'asset_management_default_key_2024'

/**
 * 简单的 XOR 加密
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
 * 获取解密后的 Token
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

    // 尝试使用旧默认密钥解密（兼容旧数据）
    // 如果旧密钥能解密出有效token，说明是密钥变更前的数据
    // 此时返回null，触发用户重新登录（更安全）
    try {
      const oldDecrypted = xorDecrypt(encrypted, OLD_DEFAULT_KEY)
      if (oldDecrypted.includes('.') || oldDecrypted.length > 20) {
        // 旧密钥解密成功，说明数据使用了不安全的旧密钥
        // 返回null触发重新登录，确保使用新密钥加密
        console.warn(`[tokenCrypto] 检测到使用旧密钥加密的 ${key}，将清除并要求重新登录`)
        localStorage.removeItem(key)
        return null
      }
    } catch {
      // 旧密钥解密失败，忽略
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
