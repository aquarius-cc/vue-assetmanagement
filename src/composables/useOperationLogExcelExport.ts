/**
 * 操作日志 Excel 导出逻辑（自 OperationLogDetails.vue 的 handleExportExcel 物理提取，零逻辑变更）
 *
 * store 与操作类型文本函数以参数注入；导出范围选择交互与
 * 当前页/全量数据的分支处理均保持原实现。
 */
import { ElMessage, ElMessageBox } from 'element-plus'
import { formatDate } from '@/utils/Format'
import { exportToExcel, type ColumnConfig } from '@/utils/excelExporter'
import type { OperationLog } from '@/types/operationlog'

/** 导出依赖的 store 最小接口 */
export interface OperationLogExportStore {
  list: OperationLog[]
  pagination: { total: number }
  getList(params?: Record<string, unknown>): Promise<OperationLog[]>
}

/**
 * 创建操作日志导出函数 handleExportExcel()
 * @param store - 操作日志 store 实例
 * @param getTypeText - 操作类型值 → 中文文本 的转换函数（与列表展示一致）
 */
export function createOperationLogExcelExport(
  store: OperationLogExportStore,
  getTypeText: (type: string | null | undefined) => string,
) {
  return async function handleExportExcel() {
    const exportColumns: ColumnConfig<OperationLog>[] = [
      {
        title: '操作类型',
        key: 'operation_type',
        default: '',
        formatter: (val) => getTypeText(val as string),
      },
      { title: '资产编码', key: 'asset_code', default: '' },
      { title: '资产名称', key: 'asset_name', default: '' },
      { title: '资产规格', key: 'asset_specification', default: '' },
      { title: '操作人', key: 'operator_name', default: '' },
      { title: '操作人工号', key: 'operator_jobcode', default: '' },
      {
        title: '操作时间',
        key: 'operation_time',
        default: '',
        formatter: (val) => formatDate(val as string | Date | null) || '',
      },
      { title: '描述', key: 'description', default: '' },
      { title: 'IP地址', key: 'ip_address', default: '' },
    ]

    let range: 'current' | 'all' | null = null
    try {
      await ElMessageBox.confirm(
        `当前页面 ${store.list.length} 条，总共 ${store.pagination.total} 条。请选择：`,
        '导出范围',
        {
          confirmButtonText: '导出当前页',
          cancelButtonText: '导出全部',
          distinguishCancelAndClose: true,
        },
      )
      range = 'current'
    } catch (err) {
      if (err === 'cancel') range = 'all'
      else return
    }

    let exportData: OperationLog[] = []
    let fileName = ''

    if (range === 'current') {
      exportData = store.list
      fileName = `操作日志列表_当前页面_${store.list.length}条.xlsx`
    } else if (range === 'all') {
      ElMessage.info('正在准备全部数据，请稍候...')
      if (store.pagination.total > 1000) {
        const confirm = await ElMessageBox.confirm(
          '数据量较大，导出可能需要一些时间，是否继续？',
          '导出确认',
          { confirmButtonText: '继续', cancelButtonText: '取消', type: 'warning' },
        ).catch(() => false)
        if (!confirm) return
      }
      try {
        const allData = await store.getList({
          page: 1,
          page_size: store.pagination.total,
        })
        exportData = allData
        fileName = `操作日志列表_全部_${allData.length}条.xlsx`
      } catch (error) {
        console.error('导出全部数据失败:', error)
        ElMessage.error('获取全部数据失败，请重试')
        return
      }
    } else {
      return
    }

    await exportToExcel({
      data: exportData,
      columns: exportColumns,
      fileName,
      sheetName: '操作日志列表',
      confirmMessage: `确定要导出 ${exportData.length} 条操作日志数据吗？`,
      emptyMessage: '暂无操作日志数据可导出',
      successMessage: '操作日志数据导出成功',
      errorMessage: '操作日志数据导出失败，请重试',
    })
  }
}
