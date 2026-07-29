import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'

const root = process.cwd()
const viewsRoot = path.join(root, 'src', 'views')
const templateFile = path.join(viewsRoot, '_templates', 'BaseCrudListTemplate.vue')

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...await walk(fullPath))
    } else if (entry.isFile()) {
      files.push(fullPath)
    }
  }
  return files
}

function isListCandidate(file) {
  const name = path.basename(file)
  return name === 'index.vue' || name.endsWith('Index.vue') || file === templateFile
}

function getMainColumnNames(source) {
  const names = new Set()
  const dataSlots = source.matchAll(/<template\s+#data\b[^>]*>([\s\S]*?)<\/template>/g)
  for (const slot of dataSlots) {
    for (const match of slot[1].matchAll(/:columns\s*=\s*["']([A-Za-z_$][\w$]*(?:\.value)?)["']/g)) {
      names.add(match[1].replace(/\.value$/, ''))
    }
  }
  return [...names]
}

function getTopLevelDeclaration(source, name) {
  const startPattern = new RegExp(`^const\\s+${name}\\b`, 'm')
  const startMatch = startPattern.exec(source)
  if (!startMatch) return null
  const rest = source.slice(startMatch.index + startMatch[0].length)
  const endMatch = /\n(?:const|let|function|async function|onMounted)\s/.exec(rest)
  return {
    index: startMatch.index,
    text: source.slice(startMatch.index, endMatch ? startMatch.index + startMatch[0].length + endMatch.index : source.length),
  }
}

function lineNumberAt(source, index) {
  return source.slice(0, index).split('\n').length
}

function inspectSource(source, file = '<memory>') {
  if (!source.includes('<BaseCrudPage')) return []

  const violations = []
  for (const name of getMainColumnNames(source)) {
    const declaration = getTopLevelDeclaration(source, name)
    if (!declaration) continue

    const relatedDeclarations = [declaration]
    for (const match of declaration.text.matchAll(/\b([A-Za-z_$][\w$]*ColumnMap)\b/g)) {
      const related = getTopLevelDeclaration(source, match[1])
      if (related && !relatedDeclarations.some((item) => item.index === related.index)) {
        relatedDeclarations.push(related)
      }
    }

    const inspectedText = relatedDeclarations.map((item) => item.text).join('\n')
    const hasOperationTitle = /title\s*:\s*['"`]操作['"`]/.test(inspectedText)
    const hasActionKey = /key\s*:\s*['"`]actions?['"`]/.test(inspectedText)
    const hasInlineButton = /\bh\s*\(\s*NButton\b/.test(inspectedText)
    if (hasOperationTitle || hasActionKey || hasInlineButton) {
      violations.push({
        file,
        line: lineNumberAt(source, declaration.index),
        columnName: name,
        reason: '页面主列表不得包含“操作”列、action/actions 列或行内业务按钮。',
      })
    }
  }
  return violations
}

async function runSelfTest() {
  const invalid = `
<script setup>
const columns = computed(() => [
  { title: '名称', key: 'name' },
  { title: '操作', key: 'actions', render: () => h(NButton) },
])
</script>
<template>
  <BaseCrudPage>
    <template #data>
      <n-data-table :columns="columns" />
    </template>
  </BaseCrudPage>
</template>`
  const validChildTable = `
<script setup>
const columns = [{ title: '名称', key: 'name' }]
const detailColumns = [{ title: '操作', key: 'actions', render: () => h(NButton) }]
</script>
<template>
  <BaseCrudPage>
    <template #data>
      <n-data-table :columns="columns" />
    </template>
  </BaseCrudPage>
  <n-data-table :columns="detailColumns" />
</template>`
  const invalidInlineButton = `
<script setup>
const columns = [{ title: '名称', key: 'name', render: () => h(NButton) }]
</script>
<template>
  <BaseCrudPage>
    <template #data>
      <n-data-table :columns="columns" />
    </template>
  </BaseCrudPage>
</template>`

  if (
    inspectSource(invalid).length !== 1
    || inspectSource(invalidInlineButton).length !== 1
    || inspectSource(validChildTable).length !== 0
  ) {
    console.error('CRUD 规范检查器自测失败。')
    process.exit(1)
  }
  console.log('CRUD 规范检查器自测通过。')
}

if (process.argv.includes('--self-test')) {
  await runSelfTest()
  process.exit(0)
}

const files = (await walk(viewsRoot)).filter(isListCandidate)
const violations = []
for (const file of files) {
  const source = await readFile(file, 'utf8')
  violations.push(...inspectSource(source, path.relative(root, file)))
}

if (violations.length > 0) {
  console.error('CRUD 页面规范检查失败：')
  for (const violation of violations) {
    console.error(`- ${violation.file}:${violation.line} [${violation.columnName}] ${violation.reason}`)
  }
  console.error('请将主列表业务按钮移动到 BaseCrudPage 的 #actions-left；明细子表不受此限制。')
  process.exit(1)
}

console.log(`CRUD 页面规范检查通过（已检查 ${files.length} 个候选列表页面）。`)
