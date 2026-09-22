/**
 * 操作日志 Excel 导出（DR-1：列配置 + 通用导出组装，流程收敛至 useExcelExport）
 *
 * store 与操作类型文本函数以参数注入；范围选择/大数据确认/全量拉取等
 * 流程全部委托通用 exportList，本模块仅保留实体差异：列配置 + 组装参数。
 */
import { useExcelExport } from '@/composables/useExcelExport'
import { formatDateTimeFull } from '@/utils/Format'
import type { ColumnConfig } from '@/utils/excelExporter'
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
  const { exportList } = useExcelExport()

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
        // 【A-3】审计场景统一秒级精度
        formatter: (val) => formatDateTimeFull((val as string | null) ?? null) || '',
      },
      { title: '描述', key: 'description', default: '' },
      { title: 'IP地址', key: 'ip_address', default: '' },
    ]

    await exportList<OperationLog>({
      entityName: '操作日志',
      columns: exportColumns,
      currentData: store.list,
      totalCount: store.pagination.total,
      fetchAllData: () => store.getList({ page: 1, page_size: store.pagination.total }),
      sheetName: '操作日志列表',
    })
  }
}
