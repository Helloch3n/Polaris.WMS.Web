<script setup lang="ts">
import { computed } from 'vue'
import { NTag, NButton, NIcon, NEmpty, NSpin } from 'naive-ui'
import {
  ArrowRightIcon,
  CalendarIcon,
  ChatBubbleLeftEllipsisIcon,
  Square3Stack3DIcon,
} from '@heroicons/vue/24/outline'
import * as waveApi from '../../../../api/outbound/wave'

const props = defineProps<{
  waves: waveApi.WaveOrderDto[]
  loading: boolean
}>()

const emit = defineEmits<{
  (e: 'view-detail', wave: waveApi.WaveOrderDto): void
  (e: 'create-picklist', wave: waveApi.WaveOrderDto): void
}>()

// Group waves by status
const kanbanColumns = computed(() => {
  const cols = {
    created: {
      title: '新创建',
      status: waveApi.WaveOrderStatus.Created,
      color: 'border-t-sky-500',
      tagType: 'info' as const,
      items: [] as waveApi.WaveOrderDto[],
    },
    released: {
      title: '已释放',
      status: waveApi.WaveOrderStatus.Released,
      color: 'border-t-amber-500',
      tagType: 'warning' as const,
      items: [] as waveApi.WaveOrderDto[],
    },
    completed: {
      title: '已完成',
      status: waveApi.WaveOrderStatus.Completed,
      color: 'border-t-emerald-500',
      tagType: 'success' as const,
      items: [] as waveApi.WaveOrderDto[],
    },
    cancelled: {
      title: '已取消',
      status: waveApi.WaveOrderStatus.Cancelled,
      color: 'border-t-slate-400',
      tagType: 'default' as const,
      items: [] as waveApi.WaveOrderDto[],
    },
  }

  props.waves.forEach(wave => {
    if (wave.status === waveApi.WaveOrderStatus.Created) {
      cols.created.items.push(wave)
    } else if (wave.status === waveApi.WaveOrderStatus.Released) {
      cols.released.items.push(wave)
    } else if (wave.status === waveApi.WaveOrderStatus.Completed) {
      cols.completed.items.push(wave)
    } else if (wave.status === waveApi.WaveOrderStatus.Cancelled) {
      cols.cancelled.items.push(wave)
    }
  })

  return Object.values(cols)
})

function formatDateTime(v?: string | number | null) {
  if (!v) return '-'
  const dateValue = new Date(v)
  if (Number.isNaN(dateValue.getTime())) return String(v)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${dateValue.getFullYear()}-${pad(dateValue.getMonth() + 1)}-${pad(dateValue.getDate())} ${pad(dateValue.getHours())}:${pad(dateValue.getMinutes())}`
}

function getProgressPercent(status: number) {
  switch (status) {
    case waveApi.WaveOrderStatus.Created:
      return 25
    case waveApi.WaveOrderStatus.Released:
      return 65
    case waveApi.WaveOrderStatus.Completed:
      return 100
    default:
      return 0
  }
}

function getProgressColorClass(status: number) {
  switch (status) {
    case waveApi.WaveOrderStatus.Created:
      return 'bg-sky-500'
    case waveApi.WaveOrderStatus.Released:
      return 'bg-amber-500'
    case waveApi.WaveOrderStatus.Completed:
      return 'bg-emerald-500'
    default:
      return 'bg-slate-400'
  }
}

function getWaveQtySum(wave: waveApi.WaveOrderDto) {
  if (!wave.lines) return 0
  return wave.lines.reduce((sum: number, line: waveApi.WaveOrderLineDto) => sum + (line.qty || 0), 0)
}

function handleCardClick(wave: waveApi.WaveOrderDto) {
  emit('view-detail', wave)
}

function handleCreatePickList(wave: waveApi.WaveOrderDto) {
  emit('create-picklist', wave)
}
</script>

<template>
  <div class="wave-kanban-container">
    <n-spin :show="loading">
      <div v-if="waves.length === 0" class="empty-wrap">
        <n-empty description="当前暂无波次订单数据" />
      </div>

      <div v-else class="kanban-board">
        <div 
          v-for="col in kanbanColumns" 
          :key="col.title" 
          class="kanban-column"
        >
          <div class="column-header">
            <span class="column-title">{{ col.title }}</span>
            <n-tag size="small" :type="col.tagType" round class="column-count">
              {{ col.items.length }}
            </n-tag>
          </div>

          <div class="column-cards-list">
            <div 
              v-for="wave in col.items" 
              :key="wave.id" 
              class="kanban-card"
              :class="col.color"
            >
              <div class="card-body" @click="handleCardClick(wave)">
                <div class="card-wave-no">{{ wave.waveNo }}</div>
                
                <div class="card-meta">
                  <div class="meta-item">
                    <n-icon size="14"><CalendarIcon /></n-icon>
                    <span>{{ formatDateTime(wave.creationTime) }}</span>
                  </div>
                  <div v-if="wave.lines && wave.lines.length > 0" class="meta-item">
                    <n-icon size="14"><Square3Stack3DIcon /></n-icon>
                    <span>{{ wave.lines.length }}品 / 共 {{ getWaveQtySum(wave) }} 件</span>
                  </div>
                  <div v-if="wave.remark" class="meta-item remark">
                    <n-icon size="14"><ChatBubbleLeftEllipsisIcon /></n-icon>
                    <span class="remark-text">{{ wave.remark }}</span>
                  </div>
                </div>

                <!-- Mini Progress Bar -->
                <div class="card-progress-section">
                  <div class="progress-info">
                    <span>处理进度</span>
                    <span>{{ getProgressPercent(wave.status) }}%</span>
                  </div>
                  <div class="mini-progress-bar">
                    <div 
                      class="mini-progress-fill" 
                      :class="getProgressColorClass(wave.status)" 
                      :style="{ width: getProgressPercent(wave.status) + '%' }"
                    ></div>
                  </div>
                </div>
              </div>

              <!-- Card Actions -->
              <div v-if="wave.status === waveApi.WaveOrderStatus.Created" class="card-actions">
                <n-button 
                  type="primary" 
                  size="tiny" 
                  secondary 
                  block 
                  @click="handleCreatePickList(wave)"
                >
                  <template #icon>
                    <n-icon><ArrowRightIcon /></n-icon>
                  </template>
                  释放波次单 (生成拣货单)
                </n-button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </n-spin>
  </div>
</template>

<style scoped>
.wave-kanban-container {
  height: 100%;
  overflow: hidden;
  padding: 4px;
}

.empty-wrap {
  padding: 60px;
  display: flex;
  justify-content: center;
  align-items: center;
}

.kanban-board {
  display: flex;
  gap: 16px;
  height: 100%;
  min-height: 500px;
  overflow-x: auto;
  align-items: flex-start;
}

.kanban-column {
  flex: 1;
  min-width: 250px;
  max-width: 320px;
  background-color: var(--wms-surface-muted);
  border-radius: 10px;
  display: flex;
  flex-direction: column;
  max-height: calc(100vh - 180px);
  box-shadow: 0 1px 3px rgba(0,0,0,0.02);
}

.column-header {
  padding: 12px 14px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 2px solid var(--wms-border-subtle);
}

.column-title {
  font-weight: 700;
  font-size: 14px;
  color: var(--wms-text-secondary);
}

.column-count {
  font-size: 11px;
}

.column-cards-list {
  padding: 10px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 10px;
  flex: 1;
}

.kanban-card {
  background-color: var(--wms-surface-panel);
  border-radius: 8px;
  border: 1px solid var(--wms-border-subtle);
  border-top-width: 4px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  overflow: hidden;
}

.kanban-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.08), 0 2px 4px -1px rgba(0, 0, 0, 0.04);
}

.card-body {
  padding: 12px;
  cursor: pointer;
}

.card-wave-no {
  font-weight: 700;
  font-size: 14px;
  color: var(--wms-text-primary);
  margin-bottom: 8px;
}

.card-meta {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 12px;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--wms-text-muted);
}

.meta-item.remark {
  background-color: var(--wms-surface-muted);
  padding: 4px 8px;
  border-radius: 4px;
  border-left: 2px solid var(--wms-border-strong);
}

.remark-text {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 220px;
}

.card-progress-section {
  font-size: 11px;
  color: var(--wms-text-muted);
}

.progress-info {
  display: flex;
  justify-content: space-between;
  margin-bottom: 4px;
}

.card-actions {
  padding: 8px 12px;
  background-color: var(--wms-surface-muted);
  border-top: 1px solid var(--wms-border-subtle);
}
</style>
