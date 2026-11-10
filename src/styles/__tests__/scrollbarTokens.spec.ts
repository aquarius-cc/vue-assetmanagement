/**
 * [M-24/M-43 / S8] 滚动条与设计令牌静态护栏。
 * lint:ci 与 type-check 不覆盖 .scss/.css、仓库无 stylelint——本 spec 是 S8
 * 唯一的自动化护栏。count 用 split 实现，不用正则（AR-2）。
 * 路径定位：import.meta.url 在本 vitest 环境非 file scheme（URL TypeError），
 * 从 cwd 向上找仓根（与运行手册 `cd vue-assetmanagement && npx vitest run` 一致）。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, it, expect } from 'vitest'

function resolveRepoFile(rel: string): string {
  let dir = process.cwd()
  for (let i = 0; i < 4; i++) {
    const candidate = resolve(dir, rel)
    try {
      readFileSync(candidate)
      return candidate
    } catch {
      dir = resolve(dir, '..')
    }
  }
  return resolve(process.cwd(), rel)
}

const read = (rel: string) => readFileSync(resolveRepoFile(rel), 'utf-8')
const count = (text: string, token: string) => text.split(token).length - 1

describe('[M-24/M-43] 滚动条与设计令牌', () => {
  it('灰阶在 variables.css 亮/暗各定义一次且值逐字等值', () => {
    const css = read('src/styles/variables.css')
    expect(css).toContain('--scrollbar-track-bg: #f1f1f1;')
    expect(css).toContain('--scrollbar-thumb-bg: #c1c1c1;')
    expect(css).toContain('--scrollbar-thumb-hover-bg: #a8a8a8;')
    expect(css).toContain('--scrollbar-track-bg: #2a2a2a;')
    expect(css).toContain('--scrollbar-thumb-bg: #555;')
    expect(css).toContain('--scrollbar-thumb-hover-bg: #666;')
    expect(count(css, '--scrollbar-track-bg:')).toBe(2)
    expect(count(css, '--scrollbar-thumb-bg:')).toBe(2)
    expect(count(css, '--scrollbar-thumb-hover-bg:')).toBe(2)
  })

  it('global-scroll.scss 无裸 hex，全部 var() 消费点保持不变', () => {
    const scss = read('src/assets/styles/global-scroll.scss')
    expect(count(scss, '#')).toBe(0)
    expect(count(scss, 'var(--scrollbar-')).toBe(7)
    expect(count(scss, '--scrollbar-width: 15px;')).toBe(1)
  })

  it('[M-43] 变量已定义处不得再写 var() 回退字面量', () => {
    const css = read('src/styles/variables.css')
    // [批次4勘误#1] --table-header-bg 既有定义(:118)即 M-43 前提，此处锚定
    expect(css).toContain('--table-header-bg:')
    expect(css).toContain('--background-color:')
    expect(
      read('src/components/componentsdetails/components/AssetTypeChildList.vue'),
    ).not.toContain('var(--table-header-bg, #f5f7fa)')
  })
})
