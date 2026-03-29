<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { showFailToast, showSuccessToast } from 'vant'
import { confirmPickTask, getPickTaskDetail, getPickTaskList, type PickTaskDto } from '../../api/pickTask'

const router = useRouter()
const refreshing = ref(false)
const loading = ref(false)
const keyword = ref('')
const rows = ref<PickTaskDto[]>([])
const activeStatus = ref<'all' | '0' | '1' | '2'>('all')
const detailMap = ref<Record<string, PickTaskDto>>({})
const expandedMap = ref<Record<string, boolean>>({})

const statusStats = computed(() => {
  const stats = { all: rows.value.length, pending: 0, running: 0, done: 0 }
  for (const item of rows.value) {
    if (item.status === 0 || item.status === '0') stats.pending += 1
    else if (item.status === 1 || item.status === '1') stats.running += 1
    else if (item.status === 2 || item.status === '2') stats.done += 1
  }
  return stats
})

function statusText(status: number | string) {
  if (status === 0 || status === '0') return '待执行'
  if (status === 1 || status === '1') return '执行中'
  if (status === 2 || status === '2') return '已完成'
  return String(status)
}

function statusClass(status: number | string) {
  if (status === 0 || status === '0') return 'status-pending'
  if (status === 1 || status === '1') return 'status-running'
  if (status === 2 || status === '2') return 'status-done'
  return 'status-default'
}

async function loadTasks() {
  loading.value = true
  try {
    const data = await getPickTaskList({
      reelNo: keyword.value.trim() || undefined,
      status: activeStatus.value === 'all' ? undefined : activeStatus.value,
      skipCount: 0,
      maxResultCount: 30,
    })
    rows.value = data.items ?? []
  } finally {
    loading.value = false
  }
}

async function onRefresh() {
  refreshing.value = true
  try {
    await loadTasks()
  } finally {
    refreshing.value = false
  }
}

function onSearch() {
  loadTasks()
}

function setStatusFilter(status: 'all' | '0' | '1' | '2') {
  activeStatus.value = status
  loadTasks()
}

async function handleConfirm(taskId: string) {
  try {
    await confirmPickTask(taskId)
    showSuccessToast(`任务确认成功：${taskId}`)
    await loadTasks()
  } catch (error) {
    const message = error instanceof Error ? error.message : '任务确认失败'
    showFailToast(message)
  }
}

function toScan(taskId: string) {
  router.push({ path: '/scan', query: { taskId } })
}

async function toggleDetail(taskId: string) {
  const current = expandedMap.value[taskId] ?? false
  if (current) {
    expandedMap.value = {
      ...expandedMap.value,
      [taskId]: false,
    }
    return
  }

  if (!detailMap.value[taskId]) {
    try {
      const detail = await getPickTaskDetail(taskId)
      detailMap.value = {
        ...detailMap.value,
        [taskId]: detail,
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : '加载任务详情失败'
      showFailToast(message)
      return
    }
  }

  expandedMap.value = {
    ...expandedMap.value,
    [taskId]: true,
  }
}

onMounted(() => {
  loadTasks()
})
</script>

<template>
  <div class="pda-page">
    <van-nav-bar title="任务中心" fixed placeholder />

    <div class="task-toolbar pda-card">
      <van-search v-model="keyword" placeholder="按线盘号搜索任务" @search="onSearch" @clear="onSearch" />
      <div class="status-filter">
        <van-button size="small" :type="activeStatus === 'all' ? 'primary' : 'default'" @click="setStatusFilter('all')">全部</van-button>
        <van-button size="small" :type="activeStatus === '0' ? 'primary' : 'default'" @click="setStatusFilter('0')">待执行</van-button>
        <van-button size="small" :type="activeStatus === '1' ? 'primary' : 'default'" @click="setStatusFilter('1')">执行中</van-button>
        <van-button size="small" :type="activeStatus === '2' ? 'primary' : 'default'" @click="setStatusFilter('2')">已完成</van-button>
      </div>
    </div>

    <div class="pda-card task-overview">
      <div class="pda-section-title">
        <span>作业概览</span>
        <span class="pda-subtext">下拉刷新同步状态</span>
      </div>
      <div class="overview-grid">
        <div class="metric-item">
          <div class="metric-value">{{ statusStats.all }}</div>
          <div class="metric-label">总任务</div>
        </div>
        <div class="metric-item pending">
          <div class="metric-value">{{ statusStats.pending }}</div>
          <div class="metric-label">待执行</div>
        </div>
        <div class="metric-item running">
          <div class="metric-value">{{ statusStats.running }}</div>
          <div class="metric-label">执行中</div>
        </div>
        <div class="metric-item done">
          <div class="metric-value">{{ statusStats.done }}</div>
          <div class="metric-label">已完成</div>
        </div>
      </div>
    </div>

    <van-pull-refresh v-model="refreshing" @refresh="onRefresh">
      <div v-if="!rows.length && !loading" class="pda-card">
        <van-empty image="search" description="暂无任务数据" />
      </div>

      <div v-for="item in rows" :key="item.id" class="pda-card task-card" :class="statusClass(item.status)">
        <div class="task-title">
          <strong class="task-main-title">{{ item.reelNo || item.id }}</strong>
          <van-tag round :type="item.status === 2 ? 'success' : item.status === 1 ? 'primary' : 'warning'">{{ statusText(item.status) }}</van-tag>
        </div>
        <div class="task-kv-wrap">
          <div class="pda-kv">
            <span class="pda-subtext">来源库位</span>
            <span>{{ item.fromLocationCode || '-' }}</span>
          </div>
          <div class="pda-kv">
            <span class="pda-subtext">目标库位</span>
            <span>{{ item.toLocationCode || '-' }}</span>
          </div>
        </div>
        <van-divider />
        <div v-if="expandedMap[item.id] && detailMap[item.id]" class="task-detail">
          <div class="pda-kv"><span class="pda-subtext">任务ID</span><span>{{ detailMap[item.id].id }}</span></div>
          <div class="pda-kv"><span class="pda-subtext">出库单ID</span><span>{{ detailMap[item.id].outboundOrderId || '-' }}</span></div>
          <div class="pda-kv"><span class="pda-subtext">物料编码</span><span>{{ detailMap[item.id].productCode || '-' }}</span></div>
          <div class="pda-kv"><span class="pda-subtext">目标长度</span><span>{{ detailMap[item.id].targetLength ?? '-' }}</span></div>
        </div>
        <div class="task-actions">
          <van-button size="small" icon="description" @click="toggleDetail(item.id)">{{ expandedMap[item.id] ? '收起详情' : '查看详情' }}</van-button>
          <van-button size="small" type="primary" icon="scan" @click="toScan(item.id)">扫码确认</van-button>
          <van-button size="small" type="success" icon="success" @click="handleConfirm(item.id)">直接确认</van-button>
        </div>
      </div>
    </van-pull-refresh>
  </div>
</template>

<style scoped>
.task-card {
  border-left: 4px solid #94a3b8;
}

.task-toolbar {
  padding: 10px;
}

.status-filter {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-top: 8px;
}

.task-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.task-main-title {
  font-size: 15px;
}

.task-actions {
  display: flex;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 10px;
}

.task-detail {
  margin-top: 10px;
  padding: 10px;
  border-radius: 10px;
  background: #f8fafc;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.overview-grid {
  margin-top: 10px;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
}

.metric-item {
  border: 1px solid var(--pda-border);
  border-radius: 10px;
  background: #fff;
  text-align: center;
  padding: 8px 4px;
}

.metric-item.pending {
  background: var(--pda-warning-soft);
}

.metric-item.running {
  background: var(--pda-primary-soft);
}

.metric-item.done {
  background: var(--pda-success-soft);
}

.metric-value {
  font-size: 18px;
  font-weight: 700;
  color: var(--pda-text);
}

.metric-label {
  margin-top: 2px;
  font-size: 12px;
  color: var(--pda-subtext);
}

.task-kv-wrap {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.status-pending {
  border-left-color: #f59e0b;
}

.status-running {
  border-left-color: #2563eb;
}

.status-done {
  border-left-color: #16a34a;
}

.status-default {
  border-left-color: #94a3b8;
}
</style>
