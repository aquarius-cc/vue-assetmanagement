/**
 * 资产生命周期页面（损坏/遗失/找回/维修）公共操作逻辑
 * 抽取自 BrokenAssetDetails / LostAssetDetails / FoundAssetDetails / RepairAssetDetails
 *
 * @module composables/useAssetLifecycleActions
 */
import { ElMessage, ElMessageBox } from 'element-plus'
import { formatDate } from '@/utils/Format'
import { logError } from '@/utils/logger'
import { useServerExcelExport } from '@/composables/useServerExcelExport'
import type { BlobDownload } from '@/api/request'

/** 最小 store 接口（适用于损坏/遗失/找回/维修四个 store） */
export interface AssetLifecycleStore<T = Record<string, unknown>> {
  list: T[]
  pagination: { total: number }
  // M-16：seq 过期时 getList 返回 undefined，视图判空
  getList: (params: { page: number; page_size: number }) => Promise<T[] | undefined>
  remove: (recordcode: string) => Promise<unknown>
  removeBatch: (recordcodes: string[]) => Promise<unknown>
  setRefreshFlag?: (flag: boolean) => void
}

/** composable 参数 */
export interface UseAssetLifecycleActionsParams<T> {
  store: AssetLifecycleStore<T>
  entityName: string
  /**
   * 服务端导出请求函数（BF-092/I-1）
   * 由调用方传入对应实体的 API.exportExcel，composable 内部走 useServerExcelExport。
   */
  fetchExport: (params: Record<string, unknown>) => Promise<BlobDownload>
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
  const { store, entityName, fetchExport, refresh, clearSelection } = params
  const { exportFromServer } = useServerExcelExport()

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
          logError('composables/useAssetLifecycleActions', '删除失败:', error)
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
      logError('composables/useAssetLifecycleActions', '批量删除失败:', err)
      ElMessage.error('批量删除失败，请重试')
    }
  }

  /**
   * 服务端导出（BF-092/I-1）
   * 由 useServerExcelExport 统一处理：空数据拦截 → 大数据确认 → 上限预判 → 下载。
   */
  const handleExportExcel = async () => {
    await exportFromServer({
      entityName,
      totalCount: store.pagination.total,
      fetchExport,
    })
  }

  return { handleDelete, handleBatchDelete, handleExportExcel }
}

export { formatDate }
