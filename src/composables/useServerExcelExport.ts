/**
 * @file 服务端 Excel 导出流程（下载 + 上限提示 + 大数据确认）
 * @module composables/useServerExcelExport
 * @exports
 *   - useServerExcelExport: 服务端导出 composable
 *   - ServerExportRequest: 服务端导出请求类型
 * @callers
 *   - composables/useOperationLogExcelExport
 *   - composables/useUserExcelExport
 * @dependsOn
 *   - api/config: EXPORT_MAX_ROWS（与后端 settings 镜像，仅用于提示）
 *   - utils/fileDownload: downloadBlob
 *   - element-plus: ElMessage / ElMessageBox
 * @description
 *   与客户端导出（composables/useExcelExport + utils/excelExporter）**并存但互不复用**：
 *   客户端路径要把全量数据拉到浏览器内存，服务端路径由后端写盘后流式回传。
 *   二者数据通路完全不同，硬合会让客户端路径被迫背服务端语义，故只共享
 *   最后一环「触发浏览器下载」（utils/fileDownload，DR-4）。
 *
 *   上限语义（与后端 core/excel_export 一致）：
 *   - 省略 limit/offset 且总行数 > EXPORT_MAX_ROWS -> 后端返回 400；
 *     故本模块在发起请求**之前**就拦截并给出「导出前 N 条」的替代方案，
 *     避免用户点完按钮才吃一个后端 400。
 *   - 传 limit/offset -> 分批导出，limit 被后端钳制到 EXPORT_MAX_ROWS。
 */
import { ElMessage, ElMessageBox } from 'element-plus'
import { EXPORT_MAX_ROWS } from '@/api/config'
import type { BlobDownload } from '@/api/request'
import { downloadBlob } from '@/utils/fileDownload'
import { logError } from '@/utils/logger'

/** 大于该行数时二次确认（与客户端导出的既有阈值一致） */
const LARGE_EXPORT_THRESHOLD = 1000

export interface ServerExportRequest {
  /** 实体名称（用于提示文案） */
  entityName: string
  /** 当前筛选条件下的总行数（前端已知，用于上限预判与文案） */
  totalCount: number
  /** 调用服务端导出接口（文件名兜底由该实现自行传给 getBlob，故此处不再重复指定） */
  fetchExport: (params: Record<string, unknown>) => Promise<BlobDownload>
  /** 附加筛选参数，原样透传给服务端 */
  params?: Record<string, unknown>
}

/** 读取导出响应头中的实际导出行数（缺失时回落 totalCount） */
function readExportedCount(headers: Record<string, string>, fallback: number): number {
  const raw = headers['x-export-total-count']
  const parsed = Number(raw)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback
}

/** 数据量为空时提示并终止 */
function rejectWhenEmpty(entityName: string, totalCount: number): boolean {
  if (totalCount > 0) return false
  ElMessage.warning(`暂无${entityName}数据可导出`)
  return true
}

/** 大数据量二次确认；用户取消返回 false */
async function confirmLargeExport(entityName: string, totalCount: number): Promise<boolean> {
  if (totalCount <= LARGE_EXPORT_THRESHOLD) return true
  return ElMessageBox.confirm(
    `数据量较大（共 ${totalCount} 条${entityName}），导出可能需要一些时间，是否继续？`,
    '导出确认',
    { confirmButtonText: '继续', cancelButtonText: '取消', type: 'warning' },
  )
    .then(() => true)
    .catch(() => false)
}

/**
 * 超过服务端上限时的替代方案：让用户在「只导前 N 条」与「取消」之间选择。
 *
 * 刻意不静默改成 limit=EXPORT_MAX_ROWS：那会让用户以为拿到了全量数据，
 * 实则被截断。必须显式告知并由用户决定。
 *
 * @returns 传给服务端的分批参数；用户取消返回 null
 */
async function resolveOverCapParams(
  entityName: string,
  totalCount: number,
): Promise<{ limit: number } | null> {
  try {
    await ElMessageBox.confirm(
      `当前筛选下共 ${totalCount} 条${entityName}，超过单次导出上限 ${EXPORT_MAX_ROWS} 条。` +
        `可选择仅导出前 ${EXPORT_MAX_ROWS} 条，或收窄筛选条件后重试。`,
      '超出导出上限',
      {
        confirmButtonText: `仅导出前 ${EXPORT_MAX_ROWS} 条`,
        cancelButtonText: '取消',
        type: 'warning',
      },
    )
    return { limit: EXPORT_MAX_ROWS }
  } catch (error: unknown) {
    if (error === 'cancel' || error === 'close') return null
    throw error
  }
}

/** 执行下载并提示成功（行数取服务端回填的实际导出量） */
function saveAndNotify(download: BlobDownload, entityName: string, fallback: number): void {
  downloadBlob(download.blob, download.filename)
  const exported = readExportedCount(download.headers, fallback)
  ElMessage.success(`${entityName}导出成功，共 ${exported} 条`)
}

/**
 * 服务端 Excel 导出 composable
 */
export function useServerExcelExport() {
  /**
   * 走服务端导出：确认 -> 请求 -> 下载
   *
   * 错误提示由 api/request 的拦截器统一发出（导出错误体也是 Blob，
   * 已在那里解析回 JSON message），此处只兜住非 HTTP 异常。
   */
  const exportFromServer = async (request: ServerExportRequest): Promise<void> => {
    const { entityName, totalCount, fetchExport } = request
    if (rejectWhenEmpty(entityName, totalCount)) return

    let params: Record<string, unknown> = { ...request.params }
    if (totalCount > EXPORT_MAX_ROWS) {
      const capped = await resolveOverCapParams(entityName, totalCount)
      if (!capped) return
      params = { ...params, ...capped }
    } else if (!(await confirmLargeExport(entityName, totalCount))) {
      return
    }

    try {
      const download = await fetchExport(params)
      saveAndNotify(download, entityName, totalCount)
    } catch (error: unknown) {
      logError('composables/useServerExcelExport', `${entityName}导出失败:`, error)
    }
  }

  return { exportFromServer }
}
