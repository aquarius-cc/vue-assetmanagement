/**
 * rememberMe 持久化单点测试（OP-21②: LogIn.vue 字面量抽取回归锚）
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  clearRememberMe,
  isRememberMeEnabled,
  persistRememberMe,
  readSavedUsername,
} from '@/utils/rememberMe'

const store = new Map<string, string>()

beforeEach(() => {
  store.clear()
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => void store.set(key, value),
    removeItem: (key: string) => void store.delete(key),
    clear: () => store.clear(),
  })
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('rememberMe 单点', () => {
  it('persistRememberMe(true) 写双键', () => {
    persistRememberMe(true, 'admin')
    expect(readSavedUsername()).toBe('admin')
    expect(isRememberMeEnabled()).toBe(true)
  })

  it('persistRememberMe(false) 清空双键（原 LogIn.vue :231+:232 收敛为一次调用）', () => {
    persistRememberMe(true, 'admin')
    persistRememberMe(false, 'admin')
    expect(readSavedUsername()).toBeNull()
    expect(isRememberMeEnabled()).toBe(false)
  })

  it('clearRememberMe 清空双键', () => {
    persistRememberMe(true, 'u1')
    clearRememberMe()
    expect(readSavedUsername()).toBeNull()
    expect(isRememberMeEnabled()).toBe(false)
  })

  it('未设置时读面返回 null / false', () => {
    expect(readSavedUsername()).toBeNull()
    expect(isRememberMeEnabled()).toBe(false)
  })
})
