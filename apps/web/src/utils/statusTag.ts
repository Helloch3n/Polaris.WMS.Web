/**
 * 通用状态标签解析器
 * 将枚举值（数字/字符串）映射为中文标签 + NTag type
 */

export type TagType = 'default' | 'info' | 'success' | 'warning' | 'error' | 'primary'

export interface StatusMeta {
  label: string
  tagType: TagType
}

interface StatusEntry {
  /** 枚举值（数字或字符串） */
  value: number | string
  /** 可能的别名（API 可能返回字符串枚举名） */
  aliases?: string[]
  label: string
  tagType: TagType
}

const FALLBACK: StatusMeta = { label: '-', tagType: 'default' }

/**
 * 创建状态解析器，自动处理 string / number 双向匹配
 */
export function createStatusResolver(entries: StatusEntry[]) {
  const map = new Map<string, StatusMeta>()
  for (const e of entries) {
    const meta: StatusMeta = { label: e.label, tagType: e.tagType }
    map.set(String(e.value), meta)
    for (const alias of e.aliases ?? []) {
      map.set(alias, meta)
    }
  }
  return function resolve(raw: unknown): StatusMeta {
    if (raw == null) return FALLBACK
    return map.get(String(raw)) ?? { label: String(raw) || '-', tagType: 'default' }
  }
}

/* ──────────────────── 采购订单 ──────────────────── */

export const resolvePurchaseOrderStatus = createStatusResolver([
  { value: 10, aliases: ['Open'], label: '未收货', tagType: 'warning' },
  { value: 20, aliases: ['PartialReceived'], label: '部分收货', tagType: 'info' },
  { value: 30, aliases: ['Completed'], label: '已完成', tagType: 'success' },
  { value: 40, aliases: ['Closed'], label: '已关闭', tagType: 'default' },
])

/* ──────────────────── ASN ──────────────────── */

export const resolveAsnStatus = createStatusResolver([
  { value: 10, aliases: ['Pending'], label: '待收货', tagType: 'warning' },
  { value: 20, aliases: ['Receiving'], label: '收货中', tagType: 'info' },
  { value: 30, aliases: ['Completed'], label: '已完成', tagType: 'success' },
])

/* ──────────────────── 调拨单 ──────────────────── */

export const resolveTransferOrderStatus = createStatusResolver([
  { value: 0, aliases: ['Draft'], label: '草稿', tagType: 'default' },
  { value: 1, aliases: ['Approved'], label: '已审核', tagType: 'info' },
  { value: 2, aliases: ['InProgress'], label: '作业中', tagType: 'warning' },
  { value: 3, aliases: ['Completed'], label: '已完成', tagType: 'success' },
  { value: 4, aliases: ['Cancelled'], label: '已取消', tagType: 'error' },
])

/* ──────────────────── 出库单 ──────────────────── */

export const resolveOutboundOrderStatus = createStatusResolver([
  { value: 0, label: '待分配', tagType: 'info' },
  { value: 1, label: '部分分配', tagType: 'warning' },
  { value: 2, label: '已分配', tagType: 'success' },
  { value: 3, label: '拣货中', tagType: 'primary' },
  { value: 4, label: '已发货/部分发货', tagType: 'success' },
  { value: 5, label: '已完成', tagType: 'default' },
])

/* ──────────────────── 拣货任务 ──────────────────── */

export const resolvePickTaskStatus = createStatusResolver([
  { value: 'Pending', label: '待执行', tagType: 'warning' },
  { value: 'InProgress', label: '执行中', tagType: 'info' },
  { value: 'Completed', label: '已完成', tagType: 'success' },
  { value: 'Cancelled', label: '已取消', tagType: 'default' },
])

/* ──────────────────── 生产入库 ──────────────────── */

export const resolveProductionInboundStatus = createStatusResolver([
  { value: 0, aliases: ['Draft'], label: '草稿', tagType: 'default' },
  { value: 1, aliases: ['InProgress'], label: '作业中', tagType: 'warning' },
  { value: 2, aliases: ['Completed'], label: '已完成', tagType: 'success' },
])

export const resolveProductionInboundType = createStatusResolver([
  { value: 10, aliases: ['FinishedProduct'], label: '成品入库', tagType: 'success' },
  { value: 20, aliases: ['SemiFinishedProduct'], label: '半成品入库', tagType: 'info' },
  { value: 30, aliases: ['WorkInProgress'], label: '在制品入库', tagType: 'warning' },
])

export const resolveProductionInboundDetailStatus = createStatusResolver([
  { value: 0, aliases: ['Pending'], label: '待入库', tagType: 'warning' },
  { value: 1, aliases: ['InProgress'], label: '入库中', tagType: 'info' },
  { value: 2, aliases: ['Completed'], label: '已完成', tagType: 'success' },
])

/* ──────────────────── 其他出入库 ──────────────────── */

export const resolveMiscOrderStatus = createStatusResolver([
  { value: 0, aliases: ['Draft'], label: '草稿', tagType: 'warning' },
  { value: 1, aliases: ['Executed'], label: '已执行', tagType: 'success' },
])

export const resolveMiscOperationType = createStatusResolver([
  { value: 1, aliases: ['Inbound'], label: '入库', tagType: 'info' },
  { value: 2, aliases: ['Outbound'], label: '出库', tagType: 'warning' },
])

/* ──────────────────── 库存 ──────────────────── */

export const resolveInventoryStatus = createStatusResolver([
  { value: 0, aliases: ['Good'], label: '良品', tagType: 'success' },
  { value: 1, aliases: ['Frozen'], label: '冻结', tagType: 'warning' },
  { value: 2, aliases: ['Quarantine'], label: '待检', tagType: 'info' },
  { value: 3, aliases: ['Scrap'], label: '报废', tagType: 'error' },
])

export const resolveInventoryType = createStatusResolver([
  { value: 0, aliases: ['SemiFinished'], label: '半成品', tagType: 'warning' },
  { value: 1, aliases: ['Finished'], label: '成品', tagType: 'success' },
  { value: 2, aliases: ['ProcessContainer'], label: '工序盘', tagType: 'info' },
])

/* ──────────────────── 容器 ──────────────────── */

export const resolveContainerStatus = createStatusResolver([
  { value: 0, aliases: ['Empty'], label: '空闲', tagType: 'success' },
  { value: 1, aliases: ['Occupied'], label: '占用', tagType: 'warning' },
  { value: 2, aliases: ['Damaged'], label: '损坏', tagType: 'error' },
  { value: 3, aliases: ['Maintenance'], label: '维护', tagType: 'default' },
])

export const resolveContainerType = createStatusResolver([
  { value: 0, aliases: ['Turnover'], label: '周转盘', tagType: 'info' },
  { value: 1, aliases: ['FinishedGoods'], label: '成品盘', tagType: 'success' },
  { value: 2, aliases: ['Virtual'], label: '虚拟盘', tagType: 'warning' },
])

/* ──────────────────── 库位 ──────────────────── */

export const resolveLocationStatus = createStatusResolver([
  { value: 0, aliases: ['Idle'], label: '空闲', tagType: 'success' },
  { value: 10, aliases: ['Partial'], label: '部分占用', tagType: 'info' },
  { value: 20, aliases: ['Full'], label: '已满', tagType: 'warning' },
  { value: 30, aliases: ['Locked'], label: '锁定', tagType: 'error' },
])

export const resolveLocationType = createStatusResolver([
  { value: 10, aliases: ['Equipment'], label: '设备', tagType: 'info' },
  { value: 20, aliases: ['Rack'], label: '货架', tagType: 'success' },
  { value: 30, aliases: ['Floor'], label: '地面', tagType: 'warning' },
])

/* ──────────────────── 上架任务 ──────────────────── */

export const resolvePutawayTaskStatus = createStatusResolver([
  { value: 'Pending', label: '待上架', tagType: 'warning' },
  { value: 'InProgress', label: '上架中', tagType: 'info' },
  { value: 'Completed', label: '已完成', tagType: 'success' },
  { value: 'Cancelled', label: '已取消', tagType: 'default' },
])

/* ──────────────────── 收货单 ERP 同步 ──────────────────── */

export const resolveErpSyncStatus = createStatusResolver([
  { value: 0, aliases: ['Pending', 'PENDING', 'Unsynced', 'UNSYNCED', 'NotSynced', 'NOTSYNCED'], label: '未同步', tagType: 'warning' },
  { value: 1, aliases: ['Success', 'SUCCESS', 'Succeeded', 'SUCCEEDED', 'Synced', 'SYNCED'], label: '同步成功', tagType: 'success' },
  { value: 2, aliases: ['Failed', 'FAILED', 'Fail', 'FAIL'], label: '同步失败', tagType: 'error' },
])
