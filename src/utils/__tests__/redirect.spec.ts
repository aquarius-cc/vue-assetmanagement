import { describe, it, expect } from 'vitest'

import { sanitizeRedirect } from '../redirect'

describe('sanitizeRedirect (AUD-54/BF-151 开放重定向边角)', () => {
  it('拒绝协议相对 //evil.com', () => {
    expect(sanitizeRedirect('//evil.com', '/main')).toBe('/main')
  })

  it('拒绝反斜杠起始 /\\evil.com（部分浏览器归一化为协议相对跳转）', () => {
    expect(sanitizeRedirect('/\\evil.com', '/main')).toBe('/main')
  })

  it('保留站内绝对路径', () => {
    expect(sanitizeRedirect('/main/detail/AST001', '/main')).toBe('/main/detail/AST001')
    expect(sanitizeRedirect('/login', '/main')).toBe('/login')
  })

  it('非字符串与空串回退 fallback', () => {
    expect(sanitizeRedirect(undefined, '/main')).toBe('/main')
    expect(sanitizeRedirect(123, '/main')).toBe('/main')
    expect(sanitizeRedirect('', '/main')).toBe('/main')
  })
})
