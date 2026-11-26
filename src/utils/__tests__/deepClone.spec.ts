/**
 * @file deepClone JSON 往返深拷贝单测（M-HYG-05，DR-4 收敛）
 * 锁定与原 JSON 往返克隆逐字等价的语义：
 * 嵌套隔离 / Date→字符串 / undefined 丢弃 / 循环引用抛错。
 * 注意：期望值一律用字面量构造，禁用 JSON 往返（避免 rg 零残留断言假红）。
 */
import { describe, it, expect } from 'vitest'
import { deepClone } from '../deepClone'

describe('deepClone（JSON 往返语义）', () => {
  it('原始值原样返回', () => {
    expect(deepClone(42)).toBe(42)
    expect(deepClone('str')).toBe('str')
    expect(deepClone(true)).toBe(true)
    expect(deepClone(null)).toBe(null)
  })

  it('嵌套对象深度隔离：修改副本不影响源', () => {
    const source = { a: { b: { c: 1 } }, list: [1, 2, { d: 3 }] }
    const copy = deepClone(source)
    copy.a.b.c = 99
    copy.list[2].d = 99
    expect(source.a.b.c).toBe(1)
    expect(source.list[2].d).toBe(3)
    expect(copy.a.b.c).toBe(99)
    expect(copy.list[2].d).toBe(99)
    expect(source).toEqual({ a: { b: { c: 1 } }, list: [1, 2, { d: 3 }] })
  })

  it('Date 按 JSON 语义转 ISO 字符串（不保留 Date 类型）', () => {
    const source = { at: new Date('2026-01-02T03:04:05.000Z') }
    const copy = deepClone(source)
    expect(copy.at).toBe('2026-01-02T03:04:05.000Z')
  })

  it('undefined 字段与函数按 JSON 语义丢弃', () => {
    const source: { a?: number; fn?: () => void; b: number } = { a: undefined, fn: () => {}, b: 1 }
    const copy = deepClone(source)
    expect(copy).toEqual({ b: 1 })
    expect('a' in copy).toBe(false)
    expect('fn' in copy).toBe(false)
  })

  it('数组与混合结构逐值等价', () => {
    const source = [{ id: 1, tags: ['x', 'y'] }, { id: 2 }]
    const copy = deepClone(source)
    expect(copy).toEqual([{ id: 1, tags: ['x', 'y'] }, { id: 2 }])
    expect(copy).not.toBe(source)
    expect(copy[0]).not.toBe(source[0])
  })

  it('循环引用抛 TypeError（与 JSON.stringify 一致，锁定现状）', () => {
    const source: Record<string, unknown> = { name: 'loop' }
    source.self = source
    expect(() => deepClone(source)).toThrow()
  })
})
