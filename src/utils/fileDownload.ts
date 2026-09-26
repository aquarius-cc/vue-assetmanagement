/**
 * @file 浏览器文件下载工具（DR-4：Blob 触发下载的唯一实现）
 * @module utils/fileDownload
 * @exports
 *   - XLSX_MIME: xlsx 的 MIME 常量
 *   - downloadBlob: 触发浏览器下载
 *   - resolveDownloadFilename: 从 Content-Disposition 解析服务端文件名
 * @callers
 *   - utils/excelExporter: 客户端 Excel 导出
 *   - utils/batchImport/templateExport: 导入模板下载
 *   - composables/useExcelExport: 服务端导出下载
 * @description
 *   收敛「createObjectURL + 临时 a 标签 click + revokeObjectURL」这段样板。
 *   此前 excelExporter 与 templateExport 各自持有一份逐字相同的实现（DR-1 违反），
 *   服务端导出接入后会变成三份，故在此抽公共实现。
 */

/** xlsx MIME（ExcelJS 产物与后端 StreamingExcelResponse 一致） */
export const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

/**
 * 触发浏览器下载。
 *
 * revokeObjectURL 不能与 click() 同步执行：部分浏览器（尤其 Safari）
 * 在点击事件返回前仍在读取 blob，同步释放会导致下载被取消。
 * 故用 setTimeout 推迟到下一轮任务释放。
 */
export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  // append -> click -> remove 在同一任务内完成，浏览器不会绘制该节点，
  // 故无需 hidden/display 样式（加了只会在测试桩上引入无谓耦合）。
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  setTimeout(() => URL.revokeObjectURL(url), 0)
}

/**
 * 解析 RFC 6266 的 `filename*=UTF-8''<percent-encoded>` 形式（非 ASCII 优先）。
 * @returns 文件名；不存在或无法解码时返回 null
 */
function parseExtendedFilename(contentDisposition: string): string | null {
  const matched = /filename\*\s*=\s*([^']*)'([^']*)'([^;]+)/i.exec(contentDisposition)
  if (!matched) return null
  const value = (matched[3] || '').trim()
  if (!value) return null
  try {
    return decodeURIComponent(value)
  } catch {
    // 非法百分号编码：回落到普通 filename
    return null
  }
}

/**
 * 解析 `filename="..."` / `filename=...` 形式。
 * @returns 文件名；不存在时返回 null
 */
function parsePlainFilename(contentDisposition: string): string | null {
  const matched = /filename\s*=\s*"?([^";]+)"?/i.exec(contentDisposition)
  const value = matched?.[1]?.trim()
  return value ? value : null
}

/**
 * 从 Content-Disposition 解析文件名。
 *
 * 兼容两种形式（RFC 6266）：
 * - `filename*=UTF-8''%E8%B4%A6.xlsx`（非 ASCII，优先）
 * - `filename="assets.xlsx"`（ASCII 兜底）
 *
 * 跨域部署时若后端未在 CORS_EXPOSE_HEADERS 暴露该头，则返回 fallback
 * —— 前端必须自行提供兜底文件名，不能假定该头可见。
 *
 * @param contentDisposition 响应头原始值
 * @param fallback 头不可见/无法解析时的兜底文件名
 */
export function resolveDownloadFilename(
  contentDisposition: string | null | undefined,
  fallback: string,
): string {
  if (!contentDisposition) return fallback
  return (
    parseExtendedFilename(contentDisposition) ?? parsePlainFilename(contentDisposition) ?? fallback
  )
}
