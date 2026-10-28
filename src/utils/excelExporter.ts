/**
 * @file 通用 Excel 导出工具函数，基于 ExcelJS 创建工作簿并触发浏览器下载
 * @module src/utils/excelExporter
 * @exports
 *   - ColumnConfig: 通用列配置接口
 *   - ExcelExportConfig: 导出配置接口
 *   - exportToExcel: 通用 Excel 导出函数（含确认弹窗与错误处理）
 * @callers
 *   - composables/useExcelExport
 *   - composables/useAssetListConfig
 * @dependsOn
 *   - element-plus (ElMessage, ElMessageBox)
 *   - @/utils/Format (formatDate)
 *   - @/utils/fileDownload (downloadBlob / XLSX_MIME)
 *   - exceljs
 */

import { ElMessage, ElMessageBox } from 'element-plus'
import { formatDate } from '@/utils/Format'
import ExcelJS from 'exceljs'
import { logError } from '@/utils/logger'
import { notifyCallerError } from '@/utils/errorHandler'
import { XLSX_MIME, downloadBlob } from '@/utils/fileDownload'

// 定义通用的列配置接口
export interface ColumnConfig<T = unknown> {
  title: string
  key: keyof T
  default?: string
  formatter?: (value: unknown, row: T, allData?: T[]) => string
}

// 导出配置接口
export interface ExcelExportConfig<T> {
  data: T[]
  columns: ColumnConfig<T>[]
  fileName: string
  sheetName?: string
  confirmMessage?: string
  emptyMessage?: string
  successMessage?: string
  errorMessage?: string
  additionalData?: unknown // 额外的数据，例如部门映射等
}

/** 用户取消判别（吸收 error === 'cancel'/'close'/message 含 cancel 的 `||`+`&&` 分支税） */
const isCancelError = (error: unknown): boolean => {
  if (error === 'cancel' || error === 'close') return true
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    (error as Error).message?.includes('cancel') === true
  )
}

/** 单元格取值：优先 formatter，否则默认转换（吸收 `??` 分支税） */
const resolveCellValue = <T>(item: T, data: T[], col: ColumnConfig<T>): string => {
  let value: unknown = (item as Record<string, unknown>)[col.key as string]
  if (col.formatter) {
    value = col.formatter(value, item, data)
  } else {
    value = String(value ?? col.default ?? '')
  }
  return value as string
}

/** 文件名后缀：已有 .xlsx 原样返回，否则拼时间戳（吸收 `||`/三元分支税） */
const resolveExportFileName = (baseName: string): string =>
  baseName.endsWith('.xlsx') ? baseName : `${baseName}_${formatDate(new Date())}.xlsx`

/**
 * 通用 Excel 导出工具函数
 * 使用 ExcelJS 创建工作簿并触发浏览器下载
 * @param config 导出配置
 */
export const exportToExcel = async <T>(config: ExcelExportConfig<T>): Promise<void> => {
  try {
    // 1. 数据校验
    if (!Array.isArray(config.data) || config.data.length === 0) {
      ElMessage.warning(config.emptyMessage || '暂无数据可导出')
      return
    }

    // 2. 确认导出对话框
    const confirmMsg = config.confirmMessage || `确定要导出 ${config.data.length} 条数据吗？`
    await ElMessageBox.confirm(confirmMsg, '确认导出', {
      confirmButtonText: '确定导出',
      cancelButtonText: '取消',
      type: 'warning',
    })

    // 3. 创建 ExcelJS 工作簿
    const workbook = new ExcelJS.Workbook()
    const sheetName = config.sheetName || 'Sheet1'
    const worksheet = workbook.addWorksheet(sheetName)

    // 4. 设置表头
    const headers = config.columns.map((col) => col.title)
    worksheet.addRow(headers)

    // 5. 填充数据行
    config.data.forEach((item: T) => {
      const rowData = config.columns.map((col: ColumnConfig<T>) =>
        resolveCellValue(item, config.data, col),
      )
      worksheet.addRow(rowData)
    })

    // 6. 生成文件并触发下载（下载样板收敛至 utils/fileDownload，DR-4）
    const fileName = resolveExportFileName(config.fileName)

    const buffer = await workbook.xlsx.writeBuffer()
    downloadBlob(new Blob([buffer], { type: XLSX_MIME }), fileName)

    ElMessage.success(config.successMessage || '导出成功')
  } catch (error: unknown) {
    // 如果用户点击取消，不显示错误信息
    if (isCancelError(error)) {
      ElMessage.info('已取消导出')
      return
    }
    logError('utils/excelExporter', '导出失败:', error)
    // [M-RC-09] 单出口：AxiosError 由拦截器已提示，仅非 AxiosError 弹一次
    notifyCallerError(error, config.errorMessage || '导出失败，请重试')
  }
}
