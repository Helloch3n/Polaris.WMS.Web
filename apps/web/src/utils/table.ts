import type { DataTableColumn } from 'naive-ui'

/**
 * 递归为所有叶子列（非分组、非操作列）注入 resizable: true，
 * 使表格列支持像 Excel 一样拖拽调宽。
 */
export function withResizable<T = any>(
  columns: DataTableColumn<T>[],
): DataTableColumn<T>[] {
  return columns.map((col) => {
    // 分组列：递归处理 children
    if ('children' in col && Array.isArray((col as any).children)) {
      return {
        ...col,
        children: withResizable((col as any).children),
      } as DataTableColumn<T>
    }
    // 操作列不设置 resizable
    if ((col as any).key === 'actions' || (col as any).key === 'action') {
      return col
    }
    return { resizable: true, ...col } as DataTableColumn<T>
  })
}
