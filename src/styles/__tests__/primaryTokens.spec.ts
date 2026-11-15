/**
 * [M-06 / F-01 + M-07] Element Plus 主色令牌静态护栏。
 *
 * M-06（原有 2 例保持不变）：variables.css :root 将 --el-color-primary 映射到
 *   品牌色，新用户/清缓存首屏 EP 组件不回落默认蓝。
 * M-07（本批：2 例修改 + 6 例扩展 E-1~E-6 + 3 例护栏自检）：
 *   - 亮/暗主色同色相（D1=B 提亮档单独登记），rgb 单一真源收进 variables.css
 *   - 14 个主色族 token 亮/暗成对各 2 次，EP 交互态 6 档全部由 B0 色阶驱动
 *   - 生产样式全量无 EP 默认蓝族 / 旧暗色主色残留（E-4，stripComments 剥离配对注释）
 *   - setPrimaryColor 单源并清理旧内联样式与旧键（D4=B 取消任意换肤）
 *   - 图表面积渐变 RGB 与亮/暗主色同源（§3.1 防扩散）
 *
 * 为什么只能静态断言：--el-color-primary 是 CSS 变量，happy-dom 不加载
 * main.ts 的样式导入链，组件测试读不到真实值。
 * 路径定位沿用 scrollbarTokens.spec.ts：从 cwd 向上找仓根。
 * AR-2：新增 helper 全部为纯字符串操作（split/indexOf），不写正则；
 * 唯一正则是 M-06 既有的 primaryHexes（事实源提取器，非本批引入）。
 */
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { resolve, join, extname } from 'node:path'
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

/** #2b5fd7 → "43, 95, 215"（与 EP --el-color-primary-rgb 消费格式一致） */
const hexToRgb = (hex: string): string =>
  [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(', ')

/** 从 CSS 中按出现顺序取 --color-primary 的亮/暗 hex（不含 -light/-dark 衍生） */
const primaryHexes = (css: string): string[] =>
  [...css.matchAll(/--color-primary:\s*(#[0-9a-fA-F]{6});/g)].map((m) => m[1])

/** RGB→HSL 取色相，纯算术，不用正则（AR-2） */
const hueFromHex = (hex: string): number => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  if (max === min) return 0
  const d = max - min
  const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4
  return h * 60
}

/**
 * 剥离整行注释与配对块注释（CSS 星号块注释、HTML 注释，起止符见函数内 endToken）。
 * 纯字符串定位，不用正则（AR-2）。
 * 刻意不把行内 `//` 当注释起点：避免 `https://` 等字符串被误判而吞掉后续代码，
 * 宁可保留（误红）也不漏检（fail-closed，对齐 G-0）；整行 `//` 注释仍剥离。
 */
const stripComments = (text: string): string => {
  const out: string[] = []
  let kind: 'css' | 'html' | null = null
  for (const line of text.split('\n')) {
    if (kind === null && line.trim().startsWith('//')) continue
    let rest = line
    let kept = ''
    for (;;) {
      if (kind === null) {
        const cssAt = rest.indexOf('/*')
        const htmlAt = rest.indexOf('<!--')
        const starts = [cssAt, htmlAt].filter((i) => i >= 0)
        if (starts.length === 0) {
          kept += rest
          break
        }
        const at = Math.min(...starts)
        kept += rest.slice(0, at)
        kind = at === cssAt ? 'css' : 'html'
        rest = rest.slice(at + (kind === 'css' ? 2 : 4))
        continue
      }
      const endToken = kind === 'css' ? '*/' : '-->'
      const end = rest.indexOf(endToken)
      if (end === -1) {
        // 未闭合：本行余下丢弃，kind 延续下一行
        rest = ''
        break
      }
      rest = rest.slice(end + endToken.length)
      kind = null // 配对复位
    }
    out.push(kept)
  }
  return out.join('\n')
}

const SKIP_DIRS = ['__tests__', '.stryker-tmp', 'node_modules']
const SCAN_EXT = ['.css', '.scss', '.vue', '.ts']

/**
 * E-4 实现前置（不可选）：
 * ① 必须跳过 `__tests__` 目录与 `*.spec.*` / `*.test.*` 文件。
 *    本文件的 BANNED_HEX 数组自身含全部禁用色字面量，一旦被扫描器读到必然自红
 *    （比 primaryTokens.spec.ts 旧断言的 #4a90e2 更直接的自红源）。
 * ② SKIP_DIRS 已含 '.stryker-tmp'；仓内 vue-assetmanagement/.stryker-tmp/
 *    虽不在 src 下，仍保留该条作保险，防日后扫描根上移。
 */
const collectFiles = (dir: string): string[] => {
  const out: string[] = []
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) {
      if (!SKIP_DIRS.includes(name)) out.push(...collectFiles(full))
      continue
    }
    if (!SCAN_EXT.includes(extname(name))) continue
    if (name.includes('.spec.') || name.includes('.test.')) continue
    out.push(full)
  }
  return out
}

// 前置拦截，防回流：`#3399ff`、`#c6e2ff` 本仓当前零命中，`#3b82f6` 唯一命中
// 位于本批将被改写的面积渐变；保留它们是防 EP 默认蓝族回流时立即判红，不是死配置。
const BANNED_HEX = [
  '#409eff',
  '#79bbff',
  '#a0cfff',
  '#c6e2ff',
  '#d9ecff',
  '#ecf5ff',
  '#337ecc',
  '#66b1ff',
  '#4a90e2',
  '#69b1ff',
  '#85c1ff',
  '#3399ff',
  '#3b82f6',
]
const BANNED_RGB = [
  '74, 144, 226',
  '74,144,226',
  '51, 153, 255',
  '51,153,255',
  '59, 130, 246',
  '59,130,246',
]

describe('[M-06/F-01 + M-07] Element Plus 主色令牌', () => {
  it('亮/暗品牌色各定义一次，亮色为 F1 主色且两者同色相', () => {
    // 自身即事实源：后续 rgb 断言由这里的 hex 现算，不照抄字面量
    const hexes = primaryHexes(read('src/styles/variables.css'))
    expect(hexes).toHaveLength(2)
    expect(hexes[0]).toBe('#2b5fd7')
    // M-07/D1=B：暗色为同色相提亮，不再允许独立色相（旧 #4a90e2 色相差 ~9° 判红）
    expect(Math.abs(hueFromHex(hexes[0]) - hueFromHex(hexes[1]))).toBeLessThanOrEqual(2)
  })

  it('亮色 :root 将 EP 主色映射到品牌色，rgb 与 hex 逐位等值', () => {
    const css = read('src/styles/variables.css')
    const [lightHex] = primaryHexes(css)
    expect(count(css, '--el-color-primary: var(--color-primary);')).toBe(1)
    expect(css).toContain(`--el-color-primary-rgb: ${hexToRgb(lightHex)};`)
    // 单一来源：variables.css 内 EP 主色只允许这一处定义（暗色经 dark.css 映射）
    expect(count(css, '--el-color-primary:')).toBe(1)
  })

  it('暗色 rgb 收敛于 variables.css；dark.css 不再写 rgb 字面量（M-07/A）', () => {
    const css = read('src/styles/variables.css')
    const dark = read('src/styles/dark.css')
    const [, darkHex] = primaryHexes(css)
    // rgb 单一真源：variables.css 亮/暗两处，dark.css 零字面量
    expect(count(css, '--el-color-primary-rgb:')).toBe(2)
    expect(css).toContain(`--el-color-primary-rgb: ${hexToRgb(darkHex)};`)
    expect(dark).not.toContain('--el-color-primary-rgb:')
    // 暗色映射行保持 M-06 形态
    const primaryLine = dark.split('\n').find((line) => line.includes('--el-color-primary:'))
    expect(primaryLine).toContain('var(--color-primary)')
    expect(primaryLine).not.toContain('#')
    expect(count(dark, '--el-color-primary: var(--color-primary);')).toBe(1)
  })

  it('global-reset 不再写回退字面量（M-43：变量已定义不得写回退）', () => {
    const reset = read('src/assets/styles/global-reset.scss')
    expect(reset).toContain('var(--el-color-primary)')
    expect(reset).not.toContain('#409eff')
  })
})

describe('[M-07] 品牌主色色阶', () => {
  // E-1：14 个主色族 token 亮/暗成对各 2 次
  it('亮/暗各档成对，每个主色族 token 只定义一次', () => {
    const css = read('src/styles/variables.css')
    const tokens = [
      // A 组
      '--color-primary:',
      '--color-primary-light:',
      '--color-primary-lighter:',
      '--color-primary-dark:',
      '--color-primary-light-mid:',
      '--color-primary-light-lighter:',
      '--color-primary-light-border:',
      '--color-primary-interactive:',
      // B0 组
      '--color-primary-light-3:',
      '--color-primary-light-5:',
      '--color-primary-light-7:',
      '--color-primary-light-8:',
      '--color-primary-light-9:',
      '--color-primary-dark-2:',
    ]
    for (const token of tokens) expect(count(css, token), token).toBe(2)

    // ⑤ 唯一来源：亮/暗 --color-primary-light 都必须走 var(--color-primary-interactive)，
    // 任一作用域写硬值即红。按「行首 token + 含 var」计数，不数整串声明：变量旁注记
    // 即使重复完整声明形态（M-06/M-07 注记风格）也不会把计数抬到 3 造成假红。
    // 约定：variables.css 内注记只写 token 名，不写「token: value;」完整声明形态
    // —— 该约定同时保护上面 14 项精确 count。
    const interactiveLines = css
      .split('\n')
      .filter(
        (l) =>
          l.trim().startsWith('--color-primary-light:') &&
          l.includes('var(--color-primary-interactive)'),
      )
    expect(interactiveLines).toHaveLength(2)
  })

  // E-2：EP 交互态 6 档由 B0 色阶驱动（禁止回落 EP 默认蓝族）
  it('EP 交互态 6 档在亮/暗两个作用域均由品牌色阶驱动', () => {
    const css = read('src/styles/variables.css')
    for (const suffix of ['light-3', 'light-5', 'light-7', 'light-8', 'light-9', 'dark-2']) {
      expect(count(css, `--el-color-primary-${suffix}: var(--color-primary-${suffix});`)).toBe(2)
    }
  })

  // E-3：形态守恒 + 交互档单一来源（findIndex 带 { 锚，注释误切防护）
  it('形态守恒：暗色 rgba 槽位不填 hex；交互档走 var() 引用', () => {
    const lines = read('src/styles/variables.css').split('\n')
    const darkStart = lines.findIndex((l) => l.trim().startsWith('html.dark') && l.includes('{'))
    expect(darkStart).toBeGreaterThan(0)
    const darkLines = lines.slice(darkStart)
    const lineOf = (token: string) => darkLines.find((l) => l.includes(token))
    // 暗色 lighter/border 槽位保持 rgba 形态（alpha 语义），mid/light-lighter 保持 hex
    for (const token of ['--color-primary-lighter:', '--color-primary-light-border:']) {
      expect(lineOf(token), token).toContain('rgba(')
    }
    for (const token of ['--color-primary-light-mid:', '--color-primary-light-lighter:']) {
      expect(lineOf(token), token).toContain('#')
    }
    expect(lineOf('--color-primary-light:')).toContain('var(--color-primary-interactive)')
    expect(lineOf('--color-primary-interactive:')).toContain('#')
  })

  // E-4：扫描面 = src 全量 .css/.scss/.vue/.ts，排除 __tests__ 与配对注释
  it('生产样式全量无 EP 默认蓝族 / 旧暗色主色残留', () => {
    const srcRoot = resolve(resolveRepoFile('src/styles/variables.css'), '..', '..')
    const files = collectFiles(srcRoot)
    expect(files.length).toBeGreaterThan(20)
    for (const file of files) {
      const body = stripComments(readFileSync(file, 'utf-8')).toLowerCase()
      for (const banned of [...BANNED_HEX, ...BANNED_RGB]) {
        expect(body.includes(banned.toLowerCase()), `${file} 残留 ${banned}`).toBe(false)
      }
    }
  })

  // E-5：函数体切片（batch4 resetBody 范式），证明清理发生在 setter 内部
  it('setPrimaryColor 内部清理旧内联样式与旧键（D4=B）', () => {
    const app = read('src/stores/app.ts')
    const start = app.indexOf('const setPrimaryColor')
    expect(start).toBeGreaterThan(0)
    const body = app.slice(start, app.indexOf('const updateSettings', start))
    expect(body).toContain("style.removeProperty('--el-color-primary')")
    expect(body).toContain("localStorage.removeItem('primaryColor')")
    expect(body).not.toContain("style.setProperty('--el-color-primary'")
    expect(body).not.toContain("localStorage.setItem('primaryColor'")
  })

  // E-6：图表面积渐变与亮/暗主色同源（§3.1 防扩散）
  it('图表面积渐变 RGB 与暗/亮主色同源（§3.1 防扩散）', () => {
    const chart = read('src/composables/useChartTheme.ts')
    const darkRgb = hexToRgb(primaryHexes(read('src/styles/variables.css'))[1])
      .split(', ')
      .join(',')
    const lightRgb = '43,95,215'
    expect(chart).toContain(`rgba(${darkRgb},0.25)`)
    expect(chart).toContain(`rgba(${darkRgb},0.02)`)
    expect(chart).toContain(`rgba(${lightRgb},0.25)`)
    expect(chart).toContain(`rgba(${lightRgb},0.02)`)
  })
})

describe('[M-07] E-4 护栏自检（先证红后证绿）', () => {
  it('多行 HTML 注释闭合后，文件尾部的禁用色仍被扫描', () => {
    const fixture = [
      '<!--',
      '@file 仪表盘统计卡片',
      '-->',
      '<template><div class="x" /></template>',
      '<style>.x { color: #409eff; }</style>',
    ].join('\n')
    expect(stripComments(fixture).toLowerCase()).toContain('#409eff')
  })

  it('多行 CSS 注释闭合后，文件尾部的禁用色仍被扫描', () => {
    const fixture = ['/*', ' * 说明', ' */', '.x { color: #4a90e2; }'].join('\n')
    expect(stripComments(fixture).toLowerCase()).toContain('#4a90e2')
  })

  it('真注释中的禁用色不误报', () => {
    const fixture = '<!-- 历史说明：旧值 #409eff -->\n.x { color: #2b5fd7; }'
    expect(stripComments(fixture).toLowerCase()).not.toContain('#409eff')
  })
})
