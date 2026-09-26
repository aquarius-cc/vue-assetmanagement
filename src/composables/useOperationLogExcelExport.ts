/**
 * 操作日志 Excel 导出（服务端导出）
 *
 * 【为什么改为服务端导出】原实现在浏览器侧用 ExcelJS 组装全量数据：
 * 需用 `getList({ page_size: total })` 把全部记录拉进内存，受分页上限 100
 * 钳制，导出 1 万条要打 100 个来回；改为后端写盘 + 流式回传后，
 * 浏览器只收到一个 xlsx 文件。
 *
 * 【行级可见性】不在前端二次过滤：前端只拿到了当前页数据，
 * 在前端过滤会漏行。部门隔离由后端 Selector 强制（见
 * apps/assetmanagement/selectors/operation_log_selector.py），
 * 导出集合恒等于该用户可见集合。
 *
 * 操作类型到中文文本的映射由后端 `export_columns` 的 `display_map`
 * 承担（单一事实来源），保证导出列与列表列语义一致。
 */
import { useServerExcelExport } from '@/composables/useServerExcelExport'
import { operationLogAPI } from '@/api/operationLog'
import type { OperationLog } from '@/types/operationlog'

/** 导出依赖的 store 最小接口 */
export interface OperationLogExportStore {
  list: OperationLog[]
  pagination: { total: number }
  /**
   * 取当前生效的筛选条件。
   *
   * 刻意是**函数**而非值：筛选表单是响应式的，调用时才求值才能拿到
   * 用户此刻的选择。且必须与列表 getList 用同一份组装逻辑（DR-1），
   * 否则「列表看不到的行」会被导出，结果不可信。
   */
  getFilters: () => Record<string, unknown>
}

/**
 * 创建操作日志导出函数 handleExportExcel()
 * @param store 操作日志 store 最小接口（提供 getFilters）
 */
export function createOperationLogExcelExport(store: OperationLogExportStore) {
  const { exportFromServer } = useServerExcelExport()

  return async function handleExportExcel() {
    await exportFromServer({
      entityName: '操作日志',
      totalCount: store.pagination.total,
      params: store.getFilters(),
      fetchExport: (params) => operationLogAPI.exportExcel(params),
    })
  }
}
