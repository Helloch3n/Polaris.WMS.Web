<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  NButton,
  NCard,
  NDataTable,
  NForm,
  NFormItem,
  NGrid,
  NGridItem,
  NInput,
  NSelect,
  NSpace,
  useMessage,
} from 'naive-ui'
import type { DataTableColumns } from 'naive-ui'

import * as stocktakeApi from '../../../api/inventory/stocktake'
import * as warehouseApi from '../../../api/masterData/warehouse'
import * as locationApi from '../../../api/masterData/location'

const router = useRouter()
const message = useMessage()
const saving = ref(false)
const loadingLocations = ref(false)

const formModel = reactive({
  warehouseId: null as string | null,
  mode: stocktakeApi.StocktakeMode.AreaStatic,
  description: '',
  locationIds: [] as string[],
})

const formRules = {
  warehouseId: { required: true, message: '请选择仓库', trigger: 'change' },
  mode: { required: true, message: '请选择盘点模式', type: 'number', trigger: 'change' },
}

// 仓库下拉列表
const warehouseOptions = ref<{ label: string; value: string }[]>([])
// 所有库位列表（当前仓库下）
const allLocations = ref<locationApi.LocationDto[]>([])
// 库位过滤关键字
const locationFilter = ref('')

const modeOptions = [
  { label: '库位静态盘点', value: stocktakeApi.StocktakeMode.AreaStatic },
  { label: '动碰盘点', value: stocktakeApi.StocktakeMode.Dynamic },
  { label: '循环盘点', value: stocktakeApi.StocktakeMode.Cycle },
  { label: '明细抽盘', value: stocktakeApi.StocktakeMode.DetailSelection },
]

// 过滤后的库位列表
const filteredLocations = computed(() => {
  const kw = locationFilter.value.trim().toLowerCase()
  if (!kw) return allLocations.value
  return allLocations.value.filter(
    (loc) =>
      (loc.code ?? '').toLowerCase().includes(kw) ||
      (loc.zoneId ?? '').toLowerCase().includes(kw),
  )
})

// 库位表格列
const locationColumns: DataTableColumns<locationApi.LocationDto> = [
  {
    type: 'selection',
  },
  {
    title: '库位编码',
    key: 'code',
    sorter: 'default',
  },
  {
    title: '类型',
    key: 'type',
    render: (row) => {
      if (row.type === locationApi.LocationType.Rack) return '货架'
      if (row.type === locationApi.LocationType.Floor) return '平库'
      if (row.type === locationApi.LocationType.Equipment) return '设备'
      return '未知'
    },
  },
]

async function loadWarehouses() {
  try {
    const data = await warehouseApi.getList({ maxResultCount: 1000 })
    warehouseOptions.value = (data.items ?? []).map((item) => ({
      label: `${item.name} (${item.code})`,
      value: item.id,
    }))
  } catch (e) {
    message.error('加载仓库数据失败')
  }
}

async function loadLocations(warehouseId: string) {
  loadingLocations.value = true
  allLocations.value = []
  formModel.locationIds = []
  try {
    const res = await locationApi.getLocationByWarehouseId(warehouseId)
    allLocations.value = res.items ?? []
  } catch (e) {
    message.error('加载库位数据失败')
  } finally {
    loadingLocations.value = false
  }
}

watch(
  () => formModel.warehouseId,
  (newVal) => {
    if (newVal) {
      loadLocations(newVal)
    } else {
      allLocations.value = []
      formModel.locationIds = []
    }
  },
)

function handleCheckLocations(keys: Array<string | number>) {
  formModel.locationIds = keys as string[]
}

async function handleSave() {
  if (!formModel.warehouseId) {
    message.warning('请选择仓库')
    return
  }
  if (formModel.mode === stocktakeApi.StocktakeMode.AreaStatic && formModel.locationIds.length === 0) {
    message.warning('静态盘点模式下，请至少选择一个库位进行盘点')
    return
  }

  saving.value = true
  try {
    const data = await stocktakeApi.create({
      warehouseId: formModel.warehouseId,
      mode: formModel.mode,
      description: formModel.description || undefined,
      locationIds: formModel.mode === stocktakeApi.StocktakeMode.AreaStatic ? formModel.locationIds : undefined,
    })
    message.success('创建盘点单成功')
    router.push({ name: 'StocktakeDetail', params: { id: data.id } })
  } catch (e) {
    message.error(e instanceof Error ? e.message : '保存失败')
  } finally {
    saving.value = false
  }
}

function handleCancel() {
  router.push({ name: 'StocktakeManagement' })
}

onMounted(() => {
  loadWarehouses()
})
</script>

<template>
  <div class="page-container">
    <n-card title="创建盘点计划" class="form-card" :bordered="false">
      <n-form :model="formModel" :rules="formRules" label-placement="left" label-width="100">
        <n-grid :cols="24" :x-gap="24">
          <n-grid-item :span="12">
            <n-form-item label="盘点仓库" path="warehouseId">
              <n-select
                v-model:value="formModel.warehouseId"
                placeholder="请选择仓库"
                :options="warehouseOptions"
                filterable
                clearable
              />
            </n-form-item>
          </n-grid-item>

          <n-grid-item :span="12">
            <n-form-item label="盘点模式" path="mode">
              <n-select
                v-model:value="formModel.mode"
                placeholder="请选择盘点模式"
                :options="modeOptions"
              />
            </n-form-item>
          </n-grid-item>

          <n-grid-item :span="24">
            <n-form-item label="备注说明" path="description">
              <n-input
                v-model:value="formModel.description"
                type="textarea"
                placeholder="请输入盘点说明或备注"
                :rows="2"
              />
            </n-form-item>
          </n-grid-item>
        </n-grid>

        <!-- 库位选择区：静态盘点模式下显示 -->
        <div v-if="formModel.mode === stocktakeApi.StocktakeMode.AreaStatic" class="location-selection-section">
          <div class="section-title">
            <span>库位选择 (已选择 {{ formModel.locationIds.length }} 个)</span>
            <n-input
              v-model:value="locationFilter"
              placeholder="搜索库位编码"
              style="width: 240px"
              clearable
            />
          </div>
          
          <n-data-table
            :loading="loadingLocations"
            :columns="locationColumns"
            :data="filteredLocations"
            :row-key="(row) => row.id"
            :checked-row-keys="formModel.locationIds"
            max-height="400"
            @update:checked-row-keys="handleCheckLocations"
          />
        </div>

        <div class="form-actions">
          <n-space justify="end">
            <n-button @click="handleCancel">取消</n-button>
            <n-button type="primary" :loading="saving" @click="handleSave">创建并保存</n-button>
          </n-space>
        </div>
      </n-form>
    </n-card>
  </div>
</template>

<style scoped>
.page-container {
  padding: 16px;
}
.form-card {
  max-width: 1000px;
  margin: 0 auto;
}
.location-selection-section {
  margin-top: 24px;
  border-top: 1px solid var(--n-border-color);
  padding-top: 20px;
}
.section-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 600;
  font-size: 16px;
  margin-bottom: 12px;
  color: var(--n-text-color);
}
.form-actions {
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid var(--n-border-color);
}
</style>
