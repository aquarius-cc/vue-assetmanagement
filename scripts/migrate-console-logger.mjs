/**
 * F-P2-2 后续批 codemod：console.error/warn → logError/logWarn
 * 仅处理未注释的 console.error / console.warn；跳过 logger.ts 与注释行。
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const srcRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'src')
const SKIP = new Set([path.join(srcRoot, 'utils', 'logger.ts')])

function* walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) yield* walk(p)
    else if (/\.(ts|vue)$/.test(e.name)) yield p
  }
}

function splitTopLevel(src) {
  const out = []
  let depth = 0
  let cur = ''
  let quote = null
  for (let i = 0; i < src.length; i++) {
    const c = src[i]
    if (quote) {
      cur += c
      if (c === '\\' && i + 1 < src.length) {
        cur += src[++i]
        continue
      }
      if (c === quote) quote = null
      continue
    }
    if (c === '"' || c === "'" || c === '`') {
      quote = c
      cur += c
      continue
    }
    if (c === '(' || c === '[' || c === '{') depth++
    if (c === ')' || c === ']' || c === '}') depth--
    if (c === ',' && depth === 0) {
      out.push(cur.trim())
      cur = ''
      continue
    }
    cur += c
  }
  if (cur.trim()) out.push(cur.trim())
  return out
}

function extractCallArgs(src, startIdx) {
  // startIdx points at '('
  let depth = 0
  let quote = null
  for (let i = startIdx; i < src.length; i++) {
    const c = src[i]
    if (quote) {
      if (c === '\\' && i + 1 < src.length) {
        i++
        continue
      }
      if (c === quote) quote = null
      continue
    }
    if (c === '"' || c === "'" || c === '`') {
      quote = c
      continue
    }
    if (c === '(') depth++
    else if (c === ')') {
      depth--
      if (depth === 0) return { inner: src.slice(startIdx + 1, i), end: i + 1 }
    }
  }
  return null
}

function moduleOf(file) {
  const rel = path.relative(srcRoot, file).replace(/\\/g, '/')
  return rel.replace(/\.(ts|vue)$/, '')
}

function buildCall(fnName, module, args) {
  const modLit = JSON.stringify(module)
  if (args.length === 1) return `${fnName}(${modLit}, ${args[0]})`
  if (args.length === 2) return `${fnName}(${modLit}, ${args[0]}, ${args[1]})`
  // >2 args: fold extras into context-free message via template is unsafe; pass 3rd as err, ignore rest with comment
  return `${fnName}(${modLit}, ${args[0]}, ${args[1]}) /* TODO trailing args dropped by codemod: ${args.slice(2).join(' , ')} */`
}

function ensureImport(content, fns) {
  const need = [...new Set(fns)].sort()
  const importLine = `import { ${need.join(', ')} } from '@/utils/logger'`
  if (content.includes(`from '@/utils/logger'`)) {
    // merge into existing logger import
    return content.replace(/import \{([^}]+)\} from '@\/utils\/logger'/, (m, inner) => {
      const existing = inner
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
      const merged = [...new Set([...existing, ...need])].sort()
      return `import { ${merged.join(', ')} } from '@/utils/logger'`
    })
  }
  // insert after last import line (within whole file; vue script has imports first)
  const lines = content.split('\n')
  let lastImport = -1
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i]
    if (/^import\b/.test(l)) lastImport = i
  }
  if (lastImport === -1) {
    // no imports: after <script setup ...> or at top
    const scriptIdx = lines.findIndex((l) => l.startsWith('<script'))
    if (scriptIdx !== -1) {
      lines.splice(scriptIdx + 1, 0, importLine, '')
      return lines.join('\n')
    }
    return importLine + '\n\n' + content
  }
  lines.splice(lastImport + 1, 0, importLine)
  return lines.join('\n')
}

let changedFiles = 0
let changedCalls = 0
const failures = []

for (const file of walk(srcRoot)) {
  if (SKIP.has(file)) continue
  let content = fs.readFileSync(file, 'utf8')
  const original = content
  const module = moduleOf(file)
  const usedFns = []

  // Replace console.error / console.warn calls (not in comments)
  const re = /(^|[^/\w'"`])console\.(error|warn)\s*\(/g
  let match
  const edits = [] // {start, end, replacement} absolute indices in content
  while ((match = re.exec(content)) !== null) {
    const callStart = match.index + match[1].length // index of 'c' in console
    // skip if in line comment: scan back to newline
    const lineStart = content.lastIndexOf('\n', callStart) + 1
    const linePrefix = content.slice(lineStart, callStart)
    if (/\/\//.test(linePrefix)) continue
    const parenIdx = content.indexOf('(', callStart)
    const extracted = extractCallArgs(content, parenIdx)
    if (!extracted) {
      failures.push(`${file}: unbalanced at ${callStart}`)
      continue
    }
    const args = splitTopLevel(extracted.inner)
    if (args.length === 0) continue
    const level = match[2] === 'error' ? 'logError' : 'logWarn'
    usedFns.push(level)
    // preserve leading indent by replacing only the call span
    const replacement = buildCall(level, module, args)
    edits.push({ start: callStart, end: extracted.end, replacement })
    changedCalls++
  }

  if (edits.length === 0) continue

  // apply from end to start
  edits.sort((a, b) => b.start - a.start)
  for (const e of edits) {
    content = content.slice(0, e.start) + e.replacement + content.slice(e.end)
  }

  content = ensureImport(content, usedFns)

  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8')
    changedFiles++
    console.log(`OK ${path.relative(process.cwd(), file)} (${edits.length})`)
  }
}

console.log(`\nDone: ${changedFiles} files, ${changedCalls} calls`)
if (failures.length) {
  console.log('FAILURES:')
  for (const f of failures) console.log('  ' + f)
  process.exit(1)
}
