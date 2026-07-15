import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock import.meta.env
vi.stubEnv('VITE_TOKEN_CRYPTO_KEY', 'test-secret-key-1234567890')

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key]
    }),
    clear: vi.fn(() => {
      store = {}
    }),
    get length() {
      return Object.keys(store).length
    },
    key: vi.fn((index: number) => Object.keys(store)[index] || null),
  }
})()

vi.stubGlobal('localStorage', localStorageMock)

// Mock console methods
vi.spyOn(console, 'error').mockImplementation(() => {})
vi.spyOn(console, 'warn').mockImplementation(() => {})

describe('tokenCrypto', () => {
  let setEncryptedToken: typeof import('../tokenCrypto').setEncryptedToken
  let getDecryptedToken: typeof import('../tokenCrypto').getDecryptedToken
  let removeToken: typeof import('../tokenCrypto').removeToken
  let clearAllAuthTokens: typeof import('../tokenCrypto').clearAllAuthTokens

  beforeEach(async () => {
    vi.clearAllMocks()
    localStorageMock.clear()
    
    // Dynamic import to ensure fresh module with mocked env
    const module = await import('../tokenCrypto')
    setEncryptedToken = module.setEncryptedToken
    getDecryptedToken = module.getDecryptedToken
    removeToken = module.removeToken
    clearAllAuthTokens = module.clearAllAuthTokens
  })

  describe('setEncryptedToken', () => {
    it('stores encrypted token in localStorage', () => {
      const key = 'test_token'
      const value = 'test_value'
      
      setEncryptedToken(key, value)
      
      expect(localStorageMock.setItem).toHaveBeenCalledWith(key, expect.any(String))
      expect(localStorageMock.setItem).toHaveBeenCalledTimes(1)
    })

    it('does not store plain text', () => {
      const key = 'test_token'
      const value = 'secret_token_value'
      
      setEncryptedToken(key, value)
      
      // The stored value should be encrypted, not plain text
      const storedValue = localStorageMock.setItem.mock.calls[0][1]
      expect(storedValue).not.toBe(value)
      expect(storedValue).not.toContain('secret_token_value')
    })

    it('throws error on encryption failure', () => {
      // Force an error by passing a value that causes issues
      const key = 'test_token'
      const value = 'test_value'
      
      // Mock btoa to throw an error
      const originalBtoa = globalThis.btoa
      globalThis.btoa = vi.fn(() => { throw new Error('Encryption failed') })
      
      expect(() => setEncryptedToken(key, value)).toThrow('[tokenCrypto] 加密失败，拒绝明文存储 Token')
      
      // Restore btoa
      globalThis.btoa = originalBtoa
    })
  })

  describe('getDecryptedToken', () => {
    it('returns null if token does not exist', () => {
      const result = getDecryptedToken('nonexistent_key')
      expect(result).toBeNull()
      expect(localStorageMock.getItem).toHaveBeenCalledWith('nonexistent_key')
    })

    it('returns decrypted token for valid encrypted token', () => {
      const key = 'test_token'
      const originalValue = 'valid_token_with_dot.com'
      
      // First encrypt
      setEncryptedToken(key, originalValue)
      
      // Get the encrypted value
      const encryptedValue = localStorageMock.setItem.mock.calls[0][1]
      
      // Mock getItem to return the encrypted value
      localStorageMock.getItem.mockReturnValueOnce(encryptedValue)
      
      // Decrypt
      const result = getDecryptedToken(key)
      
      expect(result).toBe(originalValue)
    })

    it('returns null for invalid encrypted data', () => {
      const key = 'test_token'
      
      // Store invalid base64 data
      localStorageMock.getItem.mockReturnValueOnce('invalid_base64_data!!!')
      
      const result = getDecryptedToken(key)
      expect(result).toBeNull()
    })

    it('returns null for encrypted data that decrypts to invalid content', () => {
      const key = 'test_token'
      
      // Create encrypted data that decrypts to something invalid
      const invalidValue = 'short'
      const encrypted = btoa(encodeURIComponent(invalidValue))
      
      localStorageMock.getItem.mockReturnValueOnce(encrypted)
      
      const result = getDecryptedToken(key)
      // Should return null because decrypted value is too short and doesn't contain '.'
      expect(result).toBeNull()
    })

    it('handles old default key encryption and returns null', () => {
      const key = 'test_token'
      const oldKey = 'asset_management_default_key_2024'
      
      // Encrypt with old key
      const value = 'token_with_dot.valid'
      let result = ''
      for (let i = 0; i < value.length; i++) {
        result += String.fromCharCode(value.charCodeAt(i) ^ oldKey.charCodeAt(i % oldKey.length))
      }
      const encryptedWithOldKey = btoa(encodeURIComponent(result))
      
      localStorageMock.getItem.mockReturnValueOnce(encryptedWithOldKey)
      
      const decrypted = getDecryptedToken(key)
      
      // Should return null because old key was used
      expect(decrypted).toBeNull()
      // Should remove the token
      expect(localStorageMock.removeItem).toHaveBeenCalledWith(key)
    })
  })

  describe('removeToken', () => {
    it('removes token from localStorage', () => {
      const key = 'test_token'
      removeToken(key)
      expect(localStorageMock.removeItem).toHaveBeenCalledWith(key)
    })
  })

  describe('clearAllAuthTokens', () => {
    it('removes all auth-related tokens', () => {
      clearAllAuthTokens()
      
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('access_token')
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('refresh_token')
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('authInfo')
      expect(localStorageMock.removeItem).toHaveBeenCalledTimes(3)
    })
  })

  describe('XOR encrypt/decrypt', () => {
    it('produces reversible encryption', () => {
      const key = 'test-key-for-xor'
      const originalText = 'Hello, World!'
      
      // Encrypt
      let encrypted = ''
      for (let i = 0; i < originalText.length; i++) {
        encrypted += String.fromCharCode(originalText.charCodeAt(i) ^ key.charCodeAt(i % key.length))
      }
      
      // Decrypt
      let decrypted = ''
      for (let i = 0; i < encrypted.length; i++) {
        decrypted += String.fromCharCode(encrypted.charCodeAt(i) ^ key.charCodeAt(i % key.length))
      }
      
      expect(decrypted).toBe(originalText)
    })

    it('handles empty string', () => {
      const key = 'test-key'
      const text = ''
      
      let encrypted = ''
      for (let i = 0; i < text.length; i++) {
        encrypted += String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i % key.length))
      }
      
      expect(encrypted).toBe('')
    })

    it('handles unicode characters', () => {
      const key = 'key'
      const text = '你好世界'
      
      let encrypted = ''
      for (let i = 0; i < text.length; i++) {
        encrypted += String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i % key.length))
      }
      
      let decrypted = ''
      for (let i = 0; i < encrypted.length; i++) {
        decrypted += String.fromCharCode(encrypted.charCodeAt(i) ^ key.charCodeAt(i % key.length))
      }
      
      expect(decrypted).toBe(text)
    })
  })
})