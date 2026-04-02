const locale = 'zh-CN'

const messages: Record<string, any> = {
  'zh-CN': {
    productionInbound: {
      search: {
        orderNo: '请输入生产入库单号',
        sourceOrderNo: '请输入来源单号',
        status: '请选择状态',
      },
      status: {
        draft: '草稿',
        inProgress: '作业中',
        completed: '已完成',
      },
      inboundType: {
        finished: '成品入库',
        semiFinished: '半成品入库',
        workInProgress: '工序品/在制品入库',
      },
      columns: {
        orderNo: '生产入库单号',
        sourceOrderNo: '来源单号',
        inboundType: '入库类型',
        sourceDepartmentCode: '来源部门编码',
        sourceDepartmentName: '来源部门名称',
        targetWarehouseCode: '目标仓库编码',
        targetWarehouseName: '目标仓库名称',
        status: '状态',
        creationTime: '创建时间',
      },
    },
    asn: {
      search: {
        asnNo: '请输入 ASN 单号',
        supplierName: '请输入供应商',
        status: '请选择状态',
        licensePlate: '请输入车牌号',
      },
      columns: {
        asnNo: 'ASN 单号',
        supplierCode: '供应商编码',
        supplierName: '供应商',
        status: '状态',
        creationTime: '创建时间',
      }
    },
    purchaseOrder: {
      search: {
        poNo: '请输入 PO 单号',
        supplierName: '请输入供应商',
        status: '请选择状态',
      },
      columns: {
        poNo: 'PO 单号',
        supplierCode: '供应商编码',
        supplierName: '供应商',
        orderDate: '下单日期',
        status: '状态',
        creationTime: '创建时间',
      }
    },
    common: {
      query: '查询',
      reset: '重置',
      view: '查看',
      loadFailed: '加载失败',
      selectOneToView: '请选择一条数据进行查看',
      missingRecordId: '当前数据缺少单据ID，无法查看',
      selected: '已选',
      items: '条',
      clearSelection: '清空选择'
    }
  }
}

function getByPath(obj: any, path: string) {
  if (!obj || !path) return undefined
  const parts = path.split('.')
  let cur: any = obj
  for (const p of parts) {
    if (cur == null) return undefined
    cur = cur[p]
  }
  return cur
}

export const t = (key: string): string => {
  const v = getByPath(messages[locale], key)
  return typeof v === 'string' ? v : key
}

export default { t }
