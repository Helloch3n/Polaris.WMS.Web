export function compareSortValue(left: unknown, right: unknown) {
  if (left === null || left === undefined || left === '') {
    return right === null || right === undefined || right === '' ? 0 : -1
  }
  if (right === null || right === undefined || right === '') {
    return 1
  }

  if (typeof left === 'number' || typeof right === 'number') {
    const leftNumber = Number(left)
    const rightNumber = Number(right)
    if (Number.isFinite(leftNumber) && Number.isFinite(rightNumber)) {
      return leftNumber - rightNumber
    }
  }

  if (typeof left === 'boolean' || typeof right === 'boolean') {
    return Number(Boolean(left)) - Number(Boolean(right))
  }

  return String(left).localeCompare(String(right), 'zh-Hans-CN')
}
