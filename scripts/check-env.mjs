/**
 * 生产环境变量校验脚本
 *
 * 在 `npm run build` 前自动执行，阻止使用占位符值构建生产包。
 * 校验范围：.env.production + .env.production.local（如存在）
 *
 * 退出码：0 = 通过，1 = 失败
 */
import { readFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')

// ── 占位符/危险值正则 ──
const PLACEHOLDER_PATTERNS = [
  { re: /example\.com/i, desc: '包含 example.com 占位域名' },
  { re: /__PLACEHOLDER__/i, desc: '包含 __PLACEHOLDER__ 占位符' },
  { re: /\bchangeme\b/i, desc: '包含 changeme 占位值' },
  { re: /\bTODO\b/i, desc: '包含 TODO 未完成标记' },
  { re: /^https?:\/\/localhost/i, desc: '生产环境指向 localhost' },
  { re: /127\.0\.0\.1/, desc: '生产环境指向 127.0.0.1' },
  { re: /:8000\b/, desc: '生产环境包含开发端口 :8000' },
]

// ── 必要变量清单 ──
const REQUIRED_VARS = [
  { name: 'VITE_API_BASE_URL', minLength: 1 },
  { name: 'VITE_TOKEN_CRYPTO_KEY', minLength: 16 },
]

// ── 待检查文件（按优先级） ──
const FILES_TO_CHECK = ['.env.production', '.env.production.local']

// ── 主逻辑 ──
let hasError = false

function checkFile(fileName) {
  const filePath = resolve(ROOT, fileName)
  if (!existsSync(filePath)) return

  const content = readFileSync(filePath, 'utf-8')

  // 1. 占位符检测
  for (const { re, desc } of PLACEHOLDER_PATTERNS) {
    if (re.test(content)) {
      console.error(`[ENV ERROR] ${fileName}: ${desc}`)
      hasError = true
    }
  }

  // 2. 必要变量存在性 + 值校验
  for (const { name, minLength } of REQUIRED_VARS) {
    const regex = new RegExp(`^${name}=(.*)`, 'm')
    const match = content.match(regex)

    if (!match) {
      console.error(`[ENV ERROR] ${fileName}: 缺少必要变量 ${name}`)
      hasError = true
      continue
    }

    const value = match[1].trim()
    if (value.length === 0) {
      console.error(`[ENV ERROR] ${fileName}: ${name} 值为空`)
      hasError = true
    } else if (value.length < minLength) {
      console.error(
        `[ENV ERROR] ${fileName}: ${name} 长度不足 ${minLength} 字符（当前 ${value.length}）`,
      )
      hasError = true
    }
  }
}

for (const file of FILES_TO_CHECK) {
  checkFile(file)
}

if (hasError) {
  console.error('')
  console.error('=== 生产环境校验失败，请修复上述问题后重新构建 ===')
  process.exit(1)
}

console.log('[ENV OK] 生产环境变量校验通过')
