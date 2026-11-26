/**
 * @file 实体批量删除守卫单源（批次 5 M-FE-02 收敛）。
 * 修复真实缺陷：原 11 个 Details inline 批删 + 2 个 composable 各自实现，均无 in-flight 守卫，
 * 连点会叠加确认框并对已删编码重复发 batch_delete（产生 fail_items 误报）。
 * 现收敛为唯一实现：预检 → guard 置位（confirm 之前）→ confirm → removeBatch →
 * onSuccess → clearSelection → refresh → finally 复位；双击第二次调用在 guard 处直接返回。
 * 各入口语义差异（取键/文案/取消值/成功失败分支）逐字保留于配置项。
 * @module src/composables/useEntityBatchDelete
 * @callers
 *   - useAssetLifecycleActions（损坏/遗失/找回/维修 4 视图）
 *   - useDepartmentEmployeeActions（部门人员列表）
 *   - componentsdetails 各实体 Details（平铺批删 + 分组批删）
 * @dependsOn
 *   - vue (ref)
 *   - element-plus (ElMessage, ElMessageBox)
 *   - utils/logger (logError)
 *   - utils/errorHandler (notifyCallerError)
 */
import { ref, type Ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { logError } from '@/utils/logger'
import { notifyCallerError } from '@/utils/errorHandler'

/** 批量删除配置（各入口语义差异逐字保留，禁止统一取键与文案） */
export interface EntityBatchDeleteConfig<T = Record<string, unknown>, R = unknown> {
  /**
   * 从选中行提取删除标识（取键按入口保留：recordcode / employee_jobcode /
   * type_code / asset_code / asset_codes，禁止统一）。
   */
  getIds: (rows: T[]) => string[]
  /** 执行批量删除；返回值透传 onSuccess（如部门人员部分失败统计） */
  removeBatch: (ids: string[]) => Promise<R>
  /** 空选择提示；null = 静默返回（AssetTypeDetails 现状） */
  emptySelectionMessage?: string | null
  /** 缺标识提示；null = 不校验（AssetTypeDetails 现状：空标识也放行） */
  missingIdMessage?: string | null
  /** 确认框文案（默认「选中的 N 条数据」形制） */
  confirmMessage?: (rows: T[], ids: string[]) => string
  confirmTitle?: string
  confirmButtonText?: string
  cancelButtonText?: string
  /** ElMessageBox 取消值集合（分组删除含 'close'） */
  cancelValues?: string[]
  /** 删除成功后回调（成功提示等差异语义），在 clearSelection / refresh 之前 */
  onSuccess?: (result: R, ids: string[], rows: T[]) => void | Promise<void>
  /** 成功后清空选择 */
  clearSelection?: () => void
  /** 成功后刷新 */
  refresh?: () => void | Promise<void>
  /** 失败处理；缺省 = logError + notifyCallerError（M-RC-09 单出口） */
  onError?: (error: unknown) => void
  /** 缺省 onError 的 logError 模块标签（保留各入口原日志上下文） */
  logTag?: string
}

/** composable 返回值 */
export interface EntityBatchDeleteReturn {
  handleBatchDelete: (rows: unknown[] | undefined) => Promise<void>
  isBatchDeleting: Ref<boolean>
}

/**
 * 创建带连点守卫的批量删除处理函数（全仓批删唯一实现）
 */
export function useEntityBatchDelete<T, R = unknown>(
  config: EntityBatchDeleteConfig<T, R>,
): EntityBatchDeleteReturn {
  const {
    getIds,
    removeBatch,
    emptySelectionMessage = '请先选择要删除的数据',
    missingIdMessage = '无法删除：选中的数据缺少唯一标识',
    confirmMessage = (_rows, ids) =>
      `确定要删除选中的 ${ids.length} 条数据吗？删除后数据不可恢复！`,
    confirmTitle = '批量删除确认',
    confirmButtonText = '确定删除',
    cancelButtonText = '取消',
    cancelValues = ['cancel'],
    onSuccess,
    clearSelection,
    refresh,
    onError,
    logTag = 'composables/useEntityBatchDelete',
  } = config

  const isBatchDeleting = ref(false)

  const handleError =
    onError ??
    ((err: unknown) => {
      logError(logTag, '批量删除失败:', err)
      notifyCallerError(err, '批量删除失败，请重试')
    })

  const handleBatchDelete = async (rows: unknown[] | undefined): Promise<void> => {
    // 连点守卫：in-flight 期间第二次调用直接返回（confirm 之前置位，防叠加确认框）
    if (isBatchDeleting.value) return
    if (!rows || rows.length === 0) {
      if (emptySelectionMessage) ElMessage.warning(emptySelectionMessage)
      return
    }
    const ids = getIds(rows as T[])
    if (missingIdMessage && ids.length === 0) {
      ElMessage.error(missingIdMessage)
      return
    }
    isBatchDeleting.value = true
    try {
      await ElMessageBox.confirm(confirmMessage(rows as T[], ids), confirmTitle, {
        confirmButtonText,
        cancelButtonText,
        type: 'warning',
      })
      const result = await removeBatch(ids)
      await onSuccess?.(result, ids, rows as T[])
      clearSelection?.()
      await refresh?.()
    } catch (err) {
      if (cancelValues.some((value) => err === value)) return
      handleError(err)
    } finally {
      isBatchDeleting.value = false
    }
  }

  return { handleBatchDelete, isBatchDeleting }
}
