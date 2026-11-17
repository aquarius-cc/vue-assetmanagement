import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

async function main() {
  const files = await readdirRecursive('./dist/assets/js')
  if (files.length === 0) {
    throw new Error('no built JS chunks found in dist/assets/js')
  }
  let content = ''
  for (const file of files) {
    content += await readFile(file, 'utf8')
  }
  const missing = []
  if (!content.includes('sendBeacon')) missing.push('sendBeacon')
  if (!content.includes('frontend-logs')) missing.push('frontend-logs')
  if (missing.length > 0) {
    throw new Error(`frontend log sink is not bundled: missing ${missing.join(', ')}`)
  }
}

async function readdirRecursive(root) {
  const { readdir } = await import('node:fs/promises')
  const entries = await readdir(root, { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    const fullPath = join(root, entry.name)
    if (entry.isDirectory()) files.push(...(await readdirRecursive(fullPath)))
    else files.push(fullPath)
  }
  return files
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
