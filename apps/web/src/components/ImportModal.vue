<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  NModal,
  NButton,
  NUpload,
  NUploadDragger,
  NText,
  NP,
  NIcon,
  NDataTable,
  NSpace,
  useMessage,
} from 'naive-ui'
import { ArrowDownTrayIcon, CloudArrowUpIcon, ExclamationCircleIcon } from '@heroicons/vue/24/outline'
import type { UploadFileInfo, DataTableColumns } from 'naive-ui'

interface ImportErrorDetail {
  rowIndex: number
  columnName: string
  errorMessage: string
}

interface ImportResultDto {
  isSuccess: boolean
  errors?: ImportErrorDetail[]
}

const props = defineProps<{
  show: boolean
  title: string
  templateName: string
  downloadTemplateApi: () => Promise<Blob>
  importApi: (file: File) => Promise<ImportResultDto>
}>()

const emit = defineEmits<{
  (e: 'update:show', val: boolean): void
  (e: 'success'): void
}>()

const message = useMessage()
const fileList = ref<UploadFileInfo[]>([])
const uploading = ref(false)
const importResult = ref<ImportResultDto | null>(null)

const isModalShow = computed({
  get() {
    return props.show
  },
  set(val) {
    emit('update:show', val)
  },
})

const selectedFile = computed(() => {
  if (fileList.value.length === 0) return null
  return fileList.value[0]?.file ?? null
})

const errorColumns: DataTableColumns<ImportErrorDetail> = [
  {
    title: '行号',
    key: 'rowIndex',
    width: 80,
    align: 'center',
    render: (row) => `第 ${row.rowIndex} 行`,
  },
  {
    title: '关联列名',
    key: 'columnName',
    width: 140,
    align: 'center',
    render: (row) => row.columnName || '-',
  },
  {
    title: '错误详情',
    key: 'errorMessage',
    align: 'left',
    render: (row) => row.errorMessage,
  },
]

// 下载模板
const downloadingTemplate = ref(false)
async function handleDownloadTemplate() {
  downloadingTemplate.value = true
  try {
    const blob = await props.downloadTemplateApi()
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = props.templateName
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
    message.success('模板下载成功，请按模板格式填写数据后导入')
  } catch (error) {
    message.error('下载模板失败')
  } finally {
    downloadingTemplate.value = false
  }
}

// 移除文件
function handleRemove() {
  fileList.value = []
  importResult.value = null
}

// 文件选择改变
function handleChange(options: { fileList: UploadFileInfo[] }) {
  // 仅保留最新选择的一个文件
  fileList.value = options.fileList.slice(-1)
  importResult.value = null
}

// 开始导入
async function handleImport() {
  const file = selectedFile.value
  if (!file) {
    message.warning('请先选择或拖拽 Excel 文件')
    return
  }

  uploading.value = true
  importResult.value = null

  try {
    const res = await props.importApi(file)
    importResult.value = res

    if (res.isSuccess) {
      message.success('数据导入成功！')
      emit('success')
      handleClose()
    } else {
      message.error(`导入失败：存在 ${res.errors?.length ?? 0} 项数据校验错误`)
    }
  } catch (error) {
    message.error(error instanceof Error ? error.message : '文件上传与导入失败')
  } finally {
    uploading.value = false
  }
}

// 关闭弹窗
function handleClose() {
  isModalShow.value = false
  fileList.value = []
  importResult.value = null
  uploading.value = false
}
</script>

<template>
  <n-modal
    v-model:show="isModalShow"
    preset="card"
    :title="props.title"
    style="width: 700px; max-height: 90vh; display: flex; flex-direction: column;"
    :segmented="{ content: true, footer: true }"
    @close="handleClose"
  >
    <div class="import-modal-content">
      <!-- 步骤一：下载模板 -->
      <div class="import-section">
        <div class="section-title">第一步：下载标准 Excel 导入模板</div>
        <n-button
          type="primary"
          ghost
          :loading="downloadingTemplate"
          @click="handleDownloadTemplate"
        >
          <template #icon>
            <n-icon><ArrowDownTrayIcon /></n-icon>
          </template>
          下载 {{ props.templateName }}
        </n-button>
      </div>

      <!-- 步骤二：上传并导入 -->
      <div class="import-section" style="margin-top: 24px;">
        <div class="section-title">第二步：选择或拖拽已填写的 Excel 文件</div>
        <n-upload
          v-model:file-list="fileList"
          :auto-upload="false"
          :max="1"
          accept=".xlsx"
          @change="handleChange"
          @remove="handleRemove"
        >
          <n-upload-dragger v-if="fileList.length === 0">
            <div style="margin-bottom: 12px">
              <n-icon size="48" :depth="3">
                <CloudArrowUpIcon />
              </n-icon>
            </div>
            <n-text style="font-size: 16px">
              点击或者拖动 Excel 文件到该区域
            </n-text>
            <n-p depth="3" style="margin: 8px 0 0 0; font-size: 12px;">
              仅支持扩展名为 .xlsx 的标准 Excel 工作簿文件
            </n-p>
          </n-upload-dragger>
        </n-upload>
      </div>

      <!-- 异常处理：校验结果 -->
      <div
        v-if="importResult && !importResult.isSuccess && importResult.errors && importResult.errors.length > 0"
        class="import-section error-section"
        style="margin-top: 24px;"
      >
        <div class="section-title error-title">
          <n-icon size="16" color="#d03050" style="margin-right: 6px; vertical-align: middle;">
            <ExclamationCircleIcon />
          </n-icon>
          数据校验未通过，请根据下方明细修改后重新上传：
        </div>
        <n-data-table
          :columns="errorColumns"
          :data="importResult.errors"
          size="small"
          :max-height="240"
          :bordered="true"
        />
      </div>
    </div>

    <template #footer>
      <n-space justify="end">
        <n-button :disabled="uploading" @click="handleClose">取消</n-button>
        <n-button
          type="primary"
          :loading="uploading"
          :disabled="!selectedFile"
          @click="handleImport"
        >
          开始导入
        </n-button>
      </n-space>
    </template>
  </n-modal>
</template>

<style scoped>
.import-modal-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.import-section {
  width: 100%;
}
.section-title {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 12px;
  color: var(--n-text-color);
}
.error-title {
  color: #d03050;
  display: flex;
  align-items: center;
}
.error-section {
  background-color: #fafafc;
  border: 1px solid #efeff5;
  border-radius: 4px;
  padding: 12px;
}
</style>
