<script setup lang="ts">
import { computed, h, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  NButton,
  NDataTable,
  NDatePicker,
  NDescriptions,
  NDescriptionsItem,
  NEmpty,
  NInput,
  NInputNumber,
  NSelect,
  useMessage,
} from 'naive-ui'
import type { DataTableColumns, SelectOption } from 'naive-ui'

import * as customerApi from '../../../../api/masterData/customer'
import * as productApi from '../../../../api/masterData/product'
import * as salesOrderApi from '../../../../api/outbound/salesOrder'
import BaseCrudPage from '../../../../components/BaseCrudPage.vue'
import DetailWorkbench from '../../../../components/DetailWorkbench.vue'
import { withResizable } from '../../../../utils/table'

interface DetailRow {
  id: string
  productId: string
  productCode: string
  productName: string
  unit: string
  qty: number
  remark: string
}

const router = useRouter()
const message = useMessage()
const saving = ref(false)
const productLoading = ref(false)
const customerLoading = ref(false)
const checkedRowKeys = ref<string[]>([])
const rowSeed = ref(1)
const productOptions = ref<SelectOption[]>([])
const customerOptions = ref<SelectOption[]>([])
const productLookup = ref<Record<string, productApi.ProductDto>>({})

const formModel = reactive({
  orderNo: '',
  customerId: '',
  orderDate: Date.now(),
  expectedDeliveryTime: Date.now() + 24 * 60 * 60 * 1000,
  remark: '',
})

const detailRows = ref<DetailRow[]>([])

function createOrderNo() {
  const now = new Date()
  const pad = (value: number) => String(value).padStart(2, '0')
  return `SO${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}`
}

function createDetailRow(): DetailRow {
  return {
    id: `row-${rowSeed.value++}`,
    productId: '',
    productCode: '',
    productName: '',
    unit: '',
    qty: 1,
    remark: '',
  }
}

function addDetail() {
  detailRows.value = [...detailRows.value, createDetailRow()]
}

function removeSelectedDetails() {
  if (checkedRowKeys.value.length === 0) {
    message.warning('请至少选择一条明细')
    return
  }
  const selected = new Set(checkedRowKeys.value)
  detailRows.value = detailRows.value.filter((row) => !selected.has(row.id))
  checkedRowKeys.value = []
}

async function loadProductOptions(keyword?: string) {
  productLoading.value = true
  try {
    const result = await productApi.getProductList({
      filter: keyword?.trim() || undefined,
      maxResultCount: 50,
      skipCount: 0,
    })
    productOptions.value = (result.items ?? []).flatMap((item) => {
      if (!item.id) return []
      productLookup.value[item.id] = item
      return [{ label: `${item.code} - ${item.name}`, value: item.id }]
    })
  } catch (error) {
    message.error(error instanceof Error ? error.message : '加载物料数据失败')
  } finally {
    productLoading.value = false
  }
}

function handleProductSearch(keyword: string) {
  loadProductOptions(keyword)
}

async function loadCustomers() {
  customerLoading.value = true
  try {
    const result = await customerApi.getList({ maxResultCount: 1000 })
    customerOptions.value = (result.items ?? []).map((item) => ({
      label: `${item.name} (${item.code})`,
      value: item.id,
    }))
  } catch (error) {
    message.error(error instanceof Error ? error.message : '加载客户数据失败')
  } finally {
    customerLoading.value = false
  }
}

function updateProduct(row: DetailRow, value: string | null) {
  const product = value ? productLookup.value[value] : undefined
  row.productId = product?.id ?? ''
  row.productCode = product?.code ?? ''
  row.productName = product?.name ?? ''
  row.unit = product?.unit ?? ''
}

const detailColumns = computed<DataTableColumns<DetailRow>>(() => withResizable([
  { type: 'selection', fixed: 'left', width: 44 },
  {
    title: '* 物料',
    key: 'productId',
    minWidth: 260,
    render: (row) => h(NSelect, {
      value: row.productId || null,
      options: productOptions.value,
      filterable: true,
      remote: true,
      clearable: true,
      loading: productLoading.value,
      placeholder: '请选择物料',
      onFocus: () => loadProductOptions(),
      onSearch: handleProductSearch,
      onUpdateValue: (value: string | null) => updateProduct(row, value),
    }),
  },
  { title: '物料名称', key: 'productName', minWidth: 180, render: (row) => row.productName || '-' },
  { title: '单位', key: 'unit', width: 100, render: (row) => row.unit || '-' },
  {
    title: '* 数量',
    key: 'qty',
    width: 160,
    render: (row) => h(NInputNumber, {
      value: row.qty,
      min: 0.000001,
      precision: 6,
      style: 'width: 100%',
      onUpdateValue: (value: number | null) => { row.qty = value ?? 0 },
    }),
  },
  {
    title: '备注',
    key: 'remark',
    minWidth: 180,
    render: (row) => h(NInput, {
      value: row.remark,
      placeholder: '请输入备注',
      onUpdateValue: (value: string) => { row.remark = value },
    }),
  },
]))

function validate() {
  formModel.orderNo = formModel.orderNo.trim()
  if (!formModel.orderNo) {
    message.warning('订单号不能为空')
    return false
  }
  if (!formModel.customerId) {
    message.warning('请选择客户')
    return false
  }
  if (!formModel.orderDate) {
    message.warning('请选择订单日期')
    return false
  }
  if (detailRows.value.length === 0) {
    message.warning('请添加至少一条明细')
    return false
  }
  const invalidIndex = detailRows.value.findIndex((row) => !row.productId || row.qty <= 0)
  if (invalidIndex >= 0) {
    message.warning(`第 ${invalidIndex + 1} 行明细请选择物料并填写大于 0 的数量`)
    return false
  }
  return true
}

async function save() {
  if (saving.value || !validate()) return
  saving.value = true
  try {
    await salesOrderApi.create({
      orderNo: formModel.orderNo,
      customerId: formModel.customerId,
      orderDate: new Date(formModel.orderDate).toISOString(),
      expectedDeliveryTime: formModel.expectedDeliveryTime ? new Date(formModel.expectedDeliveryTime).toISOString() : undefined,
      remark: formModel.remark.trim() || undefined,
      details: detailRows.value.map((row, index) => ({
        lineNo: index + 1,
        productId: row.productId,
        productCode: row.productCode,
        productName: row.productName,
        unit: row.unit,
        qty: row.qty,
        remark: row.remark.trim() || undefined,
      })),
    })
    message.success('新增销售订单成功')
    router.push({ name: 'SalesOrderList' })
  } catch (error) {
    message.error(error instanceof Error ? error.message : '新增销售订单失败')
  } finally {
    saving.value = false
  }
}

function backToList() {
  router.push({ name: 'SalesOrderList' })
}

onMounted(() => {
  formModel.orderNo = createOrderNo()
  addDetail()
  loadProductOptions()
  loadCustomers()
})
</script>

<template>
  <BaseCrudPage :search-collapsible="false">
    <template #search>
      <DetailWorkbench title="新增销售订单" subtitle="填写订单信息并维护物料明细" :show-header="false">
        <template #summary>
          <div class="detail-action-bar">
            <n-button @click="backToList">返回列表</n-button>
            <n-button type="primary" :loading="saving" @click="save">保存</n-button>
          </div>

          <n-descriptions class="sales-order-header-table" bordered label-placement="left" :column="3">
            <n-descriptions-item>
              <template #label><span class="required-mark">*</span>订单号</template>
              <n-input v-model:value="formModel.orderNo" placeholder="请输入销售订单号" maxlength="64" />
            </n-descriptions-item>
            <n-descriptions-item>
              <template #label><span class="required-mark">*</span>客户</template>
              <n-select v-model:value="formModel.customerId" :options="customerOptions" :loading="customerLoading" filterable placeholder="请选择客户" />
            </n-descriptions-item>
            <n-descriptions-item>
              <template #label><span class="required-mark">*</span>订单日期</template>
              <n-date-picker v-model:value="formModel.orderDate" type="datetime" style="width: 100%" />
            </n-descriptions-item>
            <n-descriptions-item label="计划发货时间">
              <n-date-picker v-model:value="formModel.expectedDeliveryTime" type="datetime" clearable style="width: 100%" />
            </n-descriptions-item>
            <n-descriptions-item label="备注" :span="2">
              <n-input v-model:value="formModel.remark" placeholder="请输入备注" maxlength="500" />
            </n-descriptions-item>
          </n-descriptions>
        </template>
      </DetailWorkbench>
    </template>

    <template #actions-left>
      <div class="crud-action-main">
        <n-button type="primary" secondary @click="addDetail">新增明细</n-button>
        <n-button type="error" secondary :disabled="checkedRowKeys.length === 0" @click="removeSelectedDetails">删除选中</n-button>
      </div>
    </template>

    <template #data>
      <n-data-table
        class="crud-table-flat"
        :columns="detailColumns"
        :data="detailRows"
        :bordered="false"
        :row-key="(row: DetailRow) => row.id"
        :checked-row-keys="checkedRowKeys"
        :scroll-x="1000"
        @update:checked-row-keys="(keys) => { checkedRowKeys = keys as string[] }"
      >
        <template #empty><n-empty description="暂无订单明细" /></template>
      </n-data-table>
    </template>
  </BaseCrudPage>
</template>

<style scoped>
.detail-action-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 8px;
}

.required-mark {
  color: var(--n-color-target, #d03050);
  margin-right: 4px;
}

:deep(.sales-order-header-table .n-descriptions-table-header) {
  width: 136px;
}
</style>
