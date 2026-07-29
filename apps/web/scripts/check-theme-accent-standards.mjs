import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'

const root = process.cwd()
const srcRoot = path.join(root, 'src')
const forbiddenPrimaryLabels = new Set([
  '查询',
  '刷新',
  '重置',
  '查看',
  '编辑',
  '选择',
  '选择库存',
  '选择源库存',
  '确认选择',
  '下载',
  '返回',
  '返回列表',
])

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) files.push(...await walk(fullPath))
    else if (entry.isFile()) files.push(fullPath)
  }
  return files
}

function lineNumberAt(source, index) {
  return source.slice(0, index).split('\n').length
}

function normalizeLabel(value) {
  return value.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
}

function inspectPrimaryButtons(source, file) {
  const violations = []
  for (const match of source.matchAll(/<n-button\b[^>]*\btype=["']primary["'][^>]*>([\s\S]*?)<\/n-button>/gi)) {
    const label = normalizeLabel(match[1])
    const isTranslatedQuery = /\bt\s*\(\s*["']common\.query["']\s*\)/.test(match[1])
    if (forbiddenPrimaryLabels.has(label) || isTranslatedQuery) {
      violations.push({
        file,
        line: lineNumberAt(source, match.index),
        reason: `“${label || '查询'}”属于查询、导航或选择操作，不得使用主题色主按钮。`,
      })
    }
  }
  return violations
}

function inspectActionGroups(source, file) {
  const violations = []
  for (const group of source.matchAll(/<div\s+class=["'][^"']*\bcrud-action-main\b[^"']*["'][^>]*>([\s\S]*?)<\/div>/gi)) {
    const filledPrimaryButtons = [...group[1].matchAll(/<n-button\b([^>]*)>/gi)].filter((match) => {
      const attributes = match[1]
      return /\btype=["']primary["']/.test(attributes)
        && !/\b(?:secondary|tertiary|ghost|text)\b/.test(attributes)
        && !/\bv-if\b/.test(attributes)
    })
    if (filledPrimaryButtons.length > 1) {
      violations.push({
        file,
        line: lineNumberAt(source, group.index),
        reason: '同一个常驻操作组最多只能有一个实心主题色主按钮。',
      })
    }
  }
  return violations
}

function getOverrideBlock(source, componentName) {
  const start = source.indexOf(`    ${componentName}: {`)
  if (start < 0) return ''
  const rest = source.slice(start)
  const end = rest.indexOf('\n    },')
  return end < 0 ? rest : rest.slice(0, end)
}

const vueFiles = (await walk(srcRoot)).filter((file) => file.endsWith('.vue'))
const violations = []

for (const file of vueFiles) {
  const source = await readFile(file, 'utf8')
  const relativeFile = path.relative(root, file)
  violations.push(...inspectPrimaryButtons(source, relativeFile))
  violations.push(...inspectActionGroups(source, relativeFile))
}

const layoutFile = path.join(srcRoot, 'layout', 'LayoutIndex.vue')
const layoutSource = await readFile(layoutFile, 'utf8')
const layoutBrandUses = [...layoutSource.matchAll(/var\(--wms-brand(?:-[a-z]+)?\)/g)]
if (layoutBrandUses.length !== 1 || !/\.user-avatar[\s\S]*?var\(--wms-brand\)/.test(layoutSource)) {
  violations.push({
    file: path.relative(root, layoutFile),
    line: 1,
    reason: '侧栏和顶部栏只能在用户头像渐变中使用一次品牌色。',
  })
}

for (const relativeFile of ['components/BaseCrudPage.vue', 'components/CommandPalette.vue']) {
  const file = path.join(srcRoot, relativeFile)
  const source = await readFile(file, 'utf8')
  const brandUse = source.search(/var\(--wms-brand(?:-[a-z]+)?\)/)
  if (brandUse >= 0) {
    violations.push({
      file: path.relative(root, file),
      line: lineNumberAt(source, brandUse),
      reason: '分页、选择摘要和命令面板必须使用中性色反馈。',
    })
  }
}

const themeFile = path.join(srcRoot, 'theme', 'wmsTheme.ts')
const themeSource = await readFile(themeFile, 'utf8')
for (const componentName of ['Pagination', 'Menu']) {
  const block = getOverrideBlock(themeSource, componentName)
  if (block.includes('token.brand')) {
    violations.push({
      file: path.relative(root, themeFile),
      line: lineNumberAt(themeSource, themeSource.indexOf(`    ${componentName}: {`)),
      reason: `${componentName} 全局主题覆盖不得引用品牌色。`,
    })
  }
}

if (violations.length > 0) {
  console.error('主题色使用规范检查失败：')
  for (const violation of violations) {
    console.error(`- ${violation.file}:${violation.line} ${violation.reason}`)
  }
  process.exit(1)
}

console.log(`主题色使用规范检查通过（已检查 ${vueFiles.length} 个 Vue 文件）。`)
