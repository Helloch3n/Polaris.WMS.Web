import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'

const root = process.cwd()
const viewsRoot = path.join(root, 'src', 'views')
const semanticLabel = '(?:状态|类型|类别|结果|同步|是否|启用|停用|完成|异常|方法|方式|方向|属性)'

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) files.push(...await walk(fullPath))
    else if (entry.isFile() && entry.name.endsWith('.vue')) files.push(fullPath)
  }
  return files
}

function lineAt(source, index) {
  return source.slice(0, index).split('\n').length
}

export function inspectSemanticTags(source, file = '<memory>') {
  const violations = []
  const patterns = [
    {
      reason: '业务语义表格列不得直接渲染 NTag，请改用 WmsStatusTag。',
      regex: new RegExp(`(?:title\\s*:\\s*['"\`]([^'"\`]*${semanticLabel}[^'"\`]*)['"\`]|key\\s*:\\s*['"\`](?:status|type|.*Status|.*Type|is[A-Z][A-Za-z]*)['"\`])[\\s\\S]{0,700}?h\\s*\\(\\s*NTag\\b`, 'g'),
    },
    {
      reason: '业务语义详情字段不得直接使用 n-tag，请改用 WmsStatusTag。',
      regex: new RegExp(`<n-(?:descriptions-item|form-item)\\b[^>]*label\\s*=\\s*['"][^'"]*${semanticLabel}[^'"]*['"][^>]*>[\\s\\S]{0,400}?<n-tag\\b`, 'gi'),
    },
  ]

  for (const { regex, reason } of patterns) {
    for (const match of source.matchAll(regex)) {
      violations.push({ file, line: lineAt(source, match.index ?? 0), reason })
    }
  }
  return violations
}

async function runSelfTest() {
  const invalidList = `const columns = [{ title: '状态', key: 'status', render: row => h(NTag, { type: statusType(row.status) }) }]`
  const invalidDetail = `<n-descriptions-item label="业务类型"><n-tag type="info">入库</n-tag></n-descriptions-item>`
  const validList = `const columns = [{ title: '状态', key: 'status', render: row => h(WmsStatusTag, { label: statusLabel(row.status), type: statusType(row.status) }) }]`
  const validFunctional = `<div class="crud-selection-summary"><n-tag type="info">已选 3 条</n-tag></div>`

  if (
    inspectSemanticTags(invalidList).length !== 1
    || inspectSemanticTags(invalidDetail).length !== 1
    || inspectSemanticTags(validList).length !== 0
    || inspectSemanticTags(validFunctional).length !== 0
  ) {
    console.error('业务语义标签规范检查器自测失败。')
    process.exit(1)
  }
  console.log('业务语义标签规范检查器自测通过。')
}

if (process.argv.includes('--self-test')) {
  await runSelfTest()
  process.exit(0)
}

const violations = []
for (const file of await walk(viewsRoot)) {
  const source = await readFile(file, 'utf8')
  violations.push(...inspectSemanticTags(source, path.relative(root, file)))
}

if (violations.length > 0) {
  console.error('业务语义标签规范检查失败：')
  for (const violation of violations) {
    console.error(`- ${violation.file}:${violation.line} ${violation.reason}`)
  }
  process.exit(1)
}

console.log('业务语义标签规范检查通过。')
