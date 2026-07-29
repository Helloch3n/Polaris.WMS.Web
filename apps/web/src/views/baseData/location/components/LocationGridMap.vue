<script setup lang="ts">
import WmsStatusTag from '../../../../components/WmsStatusTag.vue'
import { computed } from 'vue'
import { NSpace, NTooltip, NEmpty, NSpin, NBadge } from 'naive-ui'
import { LocationStatus, type LocationDto } from '../../../../api/masterData/location'

const props = defineProps<{
  locations: LocationDto[]
  loading: boolean
}>()

const emit = defineEmits<{
  (e: 'edit-location', location: LocationDto): void
}>()

function getRackGrid(locations: LocationDto[]) {
  // Extract unique level names/numbers (descending, highest level at top)
  const levels = Array.from(new Set(locations.map(l => l.level).filter(Boolean)))
    .sort((a, b) => {
      const numA = parseInt(a || '', 10)
      const numB = parseInt(b || '', 10)
      if (!isNaN(numA) && !isNaN(numB)) {
        return numB - numA
      }
      return String(b).localeCompare(String(a))
    })

  // Extract unique bin names/numbers (ascending, left to right)
  const bins = Array.from(new Set(locations.map(l => l.bin).filter(Boolean)))
    .sort((a, b) => {
      const numA = parseInt(a || '', 10)
      const numB = parseInt(b || '', 10)
      if (!isNaN(numA) && !isNaN(numB)) {
        return numA - numB
      }
      return String(a).localeCompare(String(b))
    })

  const gridMap: Record<string, LocationDto> = {}
  locations.forEach(loc => {
    gridMap[`${loc.level}-${loc.bin}`] = loc
  })

  return { levels, bins, gridMap }
}

// Group locations by Aisle, then by Rack, precomputing grids for each
const aislesData = computed(() => {
  const aisles: Record<string, Record<string, LocationDto[]>> = {}
  
  props.locations.forEach(loc => {
    const aisle = loc.aisle || '未定义巷道'
    const rack = loc.rack || '未定义货架'
    
    if (!aisles[aisle]) {
      aisles[aisle] = {}
    }
    if (!aisles[aisle][rack]) {
      aisles[aisle][rack] = []
    }
    aisles[aisle][rack].push(loc)
  })
  
  return Object.entries(aisles).map(([aisleName, racks]) => {
    const racksData = Object.entries(racks).map(([rackName, locs]) => {
      const grid = getRackGrid(locs)
      return {
        name: rackName,
        locations: locs,
        grid
      }
    })
    return {
      name: aisleName,
      racks: racksData,
      totalCount: racksData.reduce((sum, r) => sum + r.locations.length, 0)
    }
  })
})

function getLoc(gridMap: Record<string, LocationDto>, level: string, bin: string): LocationDto {
  return gridMap[`${level}-${bin}`] as LocationDto
}

function getStatusColor(status: number | undefined) {
  if (status === LocationStatus.Idle) return 'status-idle'
  if (status === LocationStatus.Partial) return 'status-partial'
  if (status === LocationStatus.Full) return 'status-full'
  if (status === LocationStatus.Locked) return 'status-locked'
  return 'status-unknown'
}

function getStatusText(status: number | undefined) {
  if (status === LocationStatus.Idle) return '空闲'
  if (status === LocationStatus.Partial) return '部分占用'
  if (status === LocationStatus.Full) return '已满'
  if (status === LocationStatus.Locked) return '锁定'
  return '未知'
}

function getTypeName(type: number | undefined) {
  if (type === 1) return '存储库位'
  if (type === 2) return '拣货库位'
  if (type === 3) return '收货库位'
  if (type === 4) return '出货库位'
  return '其他'
}

function handleCellClick(loc: LocationDto) {
  emit('edit-location', loc)
}
</script>

<template>
  <div class="location-grid-map-container">
    <n-spin :show="loading">
      <!-- Status Legend -->
      <div class="legend-bar">
        <n-space size="large" align="center">
          <span class="legend-title">图例说明：</span>
          <div class="legend-item"><span class="legend-color idle"></span><span>空闲 (Idle)</span></div>
          <div class="legend-item"><span class="legend-color partial"></span><span>部分占用 (Partial)</span></div>
          <div class="legend-item"><span class="legend-color full"></span><span>已满 (Full)</span></div>
          <div class="legend-item"><span class="legend-color locked"></span><span>锁定/冻结 (Locked)</span></div>
        </n-space>
      </div>

      <div v-if="locations.length === 0" class="empty-wrap">
        <n-empty description="当前筛选条件下没有库位数据" />
      </div>

      <div v-else class="aisles-wrapper">
        <div 
          v-for="aisle in aislesData" 
          :key="aisle.name"
          class="aisle-card"
        >
          <div class="aisle-header">
            <span class="aisle-title">巷道: {{ aisle.name }}</span>
            <n-badge :value="aisle.totalCount" type="info" />
          </div>

          <div class="racks-container">
            <div 
              v-for="rack in aisle.racks" 
              :key="rack.name"
              class="rack-card"
            >
              <div class="rack-header">货架/排: {{ rack.name }}</div>
              
              <!-- shelf rendering -->
              <div class="shelf-grid-wrapper">
                <div class="shelf-grid">
                  <!-- Top header row for columns/bins -->
                  <div class="grid-row header-row">
                    <div class="level-label-placeholder"></div>
                    <div 
                      v-for="bin in rack.grid.bins" 
                      :key="bin" 
                      class="bin-label"
                    >
                      {{ bin }}位
                    </div>
                  </div>

                  <!-- Shelf layers from top to bottom -->
                  <div 
                    v-for="level in rack.grid.levels" 
                    :key="level" 
                    class="grid-row"
                  >
                    <!-- Y-axis Label -->
                    <div class="level-label">{{ level }}层</div>

                    <!-- Bins in this level -->
                    <div 
                      v-for="bin in rack.grid.bins" 
                      :key="bin"
                      class="grid-cell-container"
                    >
                      <template v-if="rack.grid.gridMap[`${level}-${bin}`]">
                        <n-tooltip trigger="hover" placement="top">
                          <template #trigger>
                            <div 
                              class="grid-cell"
                              :class="getStatusColor(getLoc(rack.grid.gridMap, level, bin).status)"
                              @click="handleCellClick(getLoc(rack.grid.gridMap, level, bin))"
                            >
                              <span class="cell-code">{{ getLoc(rack.grid.gridMap, level, bin).code?.split('-').pop() }}</span>
                            </div>
                          </template>
                          
                          <!-- Tooltip details -->
                          <div class="location-tooltip-content">
                            <div class="tooltip-title">{{ getLoc(rack.grid.gridMap, level, bin).code }}</div>
                            <div class="tooltip-divider"></div>
                            <div class="tooltip-row">
                              <span class="lbl">类型:</span>
                              <span class="val">{{ getTypeName(getLoc(rack.grid.gridMap, level, bin).type) }}</span>
                            </div>
                            <div class="tooltip-row">
                              <span class="lbl">状态:</span>
                              <span class="val" :class="getStatusColor(getLoc(rack.grid.gridMap, level, bin).status) + '-text'">
                                {{ getStatusText(getLoc(rack.grid.gridMap, level, bin).status) }}
                              </span>
                            </div>
                            <div class="tooltip-row">
                              <span class="lbl">最大承重:</span>
                              <span class="val">{{ getLoc(rack.grid.gridMap, level, bin).maxWeight || 0 }} kg</span>
                            </div>
                            <div class="tooltip-row">
                              <span class="lbl">最大体积:</span>
                              <span class="val">{{ getLoc(rack.grid.gridMap, level, bin).maxVolume || 0 }} m³</span>
                            </div>
                            <div class="tooltip-row">
                              <span class="lbl">混放属性:</span>
                              <span class="val">
                                <WmsStatusTag
                                  :type="getLoc(rack.grid.gridMap, level, bin).allowMixedProducts ? 'success' : 'warning'"
                                  :label="getLoc(rack.grid.gridMap, level, bin).allowMixedProducts ? '允混品' : '单品'"
                                />
                                <WmsStatusTag
                                  :type="getLoc(rack.grid.gridMap, level, bin).allowMixedBatches ? 'success' : 'warning'"
                                  :label="getLoc(rack.grid.gridMap, level, bin).allowMixedBatches ? '允混批' : '单批'"
                                  style="margin-left: 4px"
                                />
                              </span>
                            </div>
                          </div>
                        </n-tooltip>
                      </template>
                      <div v-else class="grid-cell empty-placeholder"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </n-spin>
  </div>
</template>

<style scoped>
.location-grid-map-container {
  padding: 10px;
  background: var(--wms-surface-panel);
  border-radius: 8px;
  min-height: 400px;
  height: 100%;
  overflow-y: auto;
}

.legend-bar {
  padding: 10px 14px;
  border-bottom: 1px solid var(--wms-border-subtle);
  margin-bottom: 16px;
  font-size: 13px;
}

.legend-title {
  font-weight: 600;
  color: var(--wms-text-secondary);
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.legend-color {
  display: inline-block;
  width: 14px;
  height: 14px;
  border-radius: 4px;
  border: 1px solid rgba(0, 0, 0, 0.08);
}

.legend-color.idle { background-color: var(--wms-location-idle); }
.legend-color.partial { background-color: var(--wms-location-partial); }
.legend-color.full { background-color: var(--wms-location-full); }
.legend-color.locked { background-color: var(--wms-location-locked); }

.empty-wrap {
  padding: 60px;
  display: flex;
  justify-content: center;
  align-items: center;
}

.aisles-wrapper {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.aisle-card {
  border: 1px solid var(--wms-border-subtle);
  border-radius: 10px;
  padding: 16px;
  background-color: var(--wms-surface-muted);
  box-shadow: 0 1px 3px rgba(0,0,0,0.02);
}

.aisle-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
}

.aisle-title {
  font-size: 16px;
  font-weight: 700;
  color: var(--wms-text-primary);
}

.racks-container {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
}

.rack-card {
  border: 1px solid var(--wms-border-subtle);
  border-radius: 8px;
  padding: 12px;
  background-color: var(--wms-surface-panel);
  flex: 1 1 300px;
  min-width: 280px;
  box-shadow: 0 1px 2px rgba(0,0,0,0.01);
}

.rack-header {
  font-size: 13px;
  font-weight: 600;
  color: var(--wms-text-secondary);
  margin-bottom: 12px;
  border-bottom: 1px dashed var(--wms-border);
  padding-bottom: 6px;
}

.shelf-grid-wrapper {
  overflow-x: auto;
}

.shelf-grid {
  display: inline-flex;
  flex-direction: column;
  gap: 6px;
  min-width: 100%;
}

.grid-row {
  display: flex;
  align-items: center;
  gap: 6px;
  height: 32px;
}

.header-row {
  height: 20px;
}

.level-label-placeholder {
  width: 44px;
  flex-shrink: 0;
}

.bin-label {
  width: 32px;
  text-align: center;
  font-size: 10px;
  color: #94a3b8;
  flex-shrink: 0;
}

.level-label {
  width: 44px;
  font-size: 11px;
  color: #94a3b8;
  font-weight: 500;
  text-align: right;
  padding-right: 6px;
  flex-shrink: 0;
}

.grid-cell-container {
  width: 32px;
  height: 32px;
  flex-shrink: 0;
}

.grid-cell {
  width: 100%;
  height: 100%;
  border-radius: 6px;
  border: 1px solid rgba(0, 0, 0, 0.06);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  user-select: none;
}

.grid-cell:hover {
  transform: scale(1.1);
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  z-index: 10;
}

.empty-placeholder {
  background-color: transparent;
  border: 1px dashed var(--wms-border);
  cursor: default;
}

.cell-code {
  font-size: 9px;
  font-weight: 500;
  color: var(--wms-text-secondary);
}

/* Cell Status Colors */
.status-idle {
  background-color: var(--wms-location-idle);
}
.status-partial {
  background-color: var(--wms-location-partial);
}
.status-full {
  background-color: var(--wms-location-full);
}
.status-locked {
  background-color: var(--wms-location-locked);
  border-color: var(--wms-location-locked-border);
}

.status-full .cell-code {
  color: #ffffff;
}

/* Tooltip style overrides */
.location-tooltip-content {
  padding: 6px;
  min-width: 180px;
}

.tooltip-title {
  font-size: 13px;
  font-weight: 700;
  color: #ffffff;
  margin-bottom: 6px;
}

.tooltip-divider {
  height: 1px;
  background-color: rgba(255, 255, 255, 0.15);
  margin-bottom: 8px;
}

.tooltip-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 11px;
  margin-bottom: 4px;
  color: rgba(255, 255, 255, 0.85);
}

.tooltip-row .lbl {
  color: rgba(255, 255, 255, 0.6);
}

.status-idle-text { color: #f1f5f9; }
.status-partial-text { color: #93c5fd; }
.status-full-text { color: #60a5fa; font-weight: bold; }
.status-locked-text { color: #fca5a5; font-weight: bold; }
</style>
