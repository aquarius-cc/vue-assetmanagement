/**
 * 资产生命周期页面（损坏/遗失/找回/维修）公共操作逻辑
 * 抽取自 BrokenAssetDetails / LostAssetDetails / FoundAssetDetails / RepairAssetDetails
 *
 * @module composables/useAssetLifecycleActions
 */
import { ElMessage, ElMessageBox } from 'element-plus'
import type { ColumnConfig } from '@/utils/excelExporter'
import { exportToExcel } from '@/utils/excelExporter'
import { formatDate } from '@/utils/Format'

/** 最小 store 接口（适用于损坏/遗失/找回/维修四个 store） */
export interface AssetLifecycleStore<T = Record<string, unknown>> {
  list: T[]
  pagination: { total: number }
  getList: (params: { page: number; page_size: number }) => Promise<T[]>
  remove: (recordcode: string) => Promise<unknown>
  removeBatch: (recordcodes: string[]) => Promise<unknown>
  setRefreshFlag?: (flag: boolean) => void
}

/** composable 参数 */
export interface UseAssetLifecycleActionsParams<T> {
  store: AssetLifecycleStore<T>
  entityName: string
  fileNamePrefix: string
  exportColumns: ColumnConfig<T>[]
  /** 可选：删除后刷新回调（默认调用 smartListRef.refresh） */
  refresh?: () => Promise<void>
  /** 可选：批量删除后清空选择状态 */
  clearSelection?: () => void
}

/** composable 返回值 */
export interface UseAssetLifecycleActionsReturn {
  handleDelete: (row: Record<string, unknown>) => void
  handleBatchDelete: (rows: unknown[] | undefined) => Promise<void>
  handleExportExcel: () => Promise<void>
}

/**
 * 创建资产生命周期操作逻辑
 */
export function useAssetLifecycleActions<T>(
  params: UseAssetLifecycleActionsParams<T>,
): UseAssetLifecycleActionsReturn {
  const { store, entityName, fileNamePrefix, exportColumns, refresh, clearSelection } = params

  const handleDelete = (row: Record<string, unknown>) => {
    const recordcode = row.recordcode as string | undefined
    if (!recordcode) {
      ElMessage.error('记录编码缺失，无法删除')
      return
    }
    ElMessageBox.confirm(`确定要删除该${entityName}记录吗？`, '删除确认', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    })
      .then(() => store.remove(recordcode))
      .then(() => {
        ElMessage.success('删除成功')
        refresh?.()
      })
      .catch((error) => {
        if (error !== 'cancel') {
          console.error('删除失败:', error)
          ElMessage.error('删除失败')
        }
      })
  }

  const handleBatchDelete = async (rows: unknown[] | undefined) => {
    if (!rows || rows.length === 0) {
      ElMessage.warning('请先选择要删除的数据')
      return
    }
    const codes = rows
      .map((r) => (r as Record<string, unknown>).recordcode as string)
      .filter((c) => !!c)
    if (codes.length === 0) {
      ElMessage.error('记录编码缺失，无法删除')
      return
    }
    try {
      await ElMessageBox.confirm(
        `确定要删除选中的 ${codes.length} 条数据吗？删除后数据不可恢复！`,
        '批量删除确认',
        { confirmButtonText: '确定删除', cancelButtonText: '取消', type: 'warning' },
      )
      await store.removeBatch(codes)
      clearSelection?.()
      await refresh?.()
    } catch (err) {
      if (err === 'cancel') return
      console.error('批量删除失败:', err)
      ElMessage.error('批量删除失败，请重试')
    }
  }

  const handleExportExcel = async () => {
    let range: 'current' | 'all' | null = null
    try {
      await ElMessageBox.confirm(
        `当前页：${store.list.length} 条，共 ${store.pagination.total} 条。请选择导出范围：`,
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

    let exportData: T[] = []
    let fileName = ''

    if (range === 'current') {
      exportData = store.list
      fileName = `${fileNamePrefix}_当前页_${store.list.length}.xlsx`
    } else if (range === 'all') {
      ElMessage.info('正在加载全部数据...')
      try {
        const allData = await store.getList({
          page: 1,
          page_size: store.pagination.total,
        })
        exportData = allData
        fileName = `${fileNamePrefix}_全部_${allData.length}.xlsx`
      } catch (error) {
        console.error('加载全部数据失败:', error)
        ElMessage.error('加载数据失败')
        return
      }
    } else {
      return
    }

    await exportToExcel({
      data: exportData,
      columns: exportColumns,
      fileName,
      sheetName: entityName,
      confirmMessage: `确定要导出 ${exportData.length} 条${entityName}数据吗？`,
      emptyMessage: '没有可导出的数据',
      successMessage: '导出成功',
      errorMessage: '导出失败',
    })
  }

  return { handleDelete, handleBatchDelete, handleExportExcel }
}

export { formatDate }
