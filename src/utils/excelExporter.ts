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
 *   - exceljs
 */

import { ElMessage, ElMessageBox } from 'element-plus'
import { formatDate } from '@/utils/Format'
import ExcelJS from 'exceljs'

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
      const rowData = config.columns.map((col: ColumnConfig<T>) => {
        // 安全获取属性值
        let value: unknown = (item as Record<string, unknown>)[col.key as string]

        // 如果有自定义格式化函数，则使用它
        if (col.formatter) {
          value = col.formatter(value, item, config.data)
        } else {
          // 默认处理：直接转换为字符串
          value = String(value ?? col.default ?? '')
        }

        return value as string
      })
      worksheet.addRow(rowData)
    })

    // 6. 生成文件并触发下载
    const fileName = config.fileName.endsWith('.xlsx')
      ? config.fileName
      : `${config.fileName}_${formatDate(new Date())}.xlsx`

    // 生成 buffer
    const buffer = await workbook.xlsx.writeBuffer()

    // 创建 Blob 并触发下载
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = fileName
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    ElMessage.success(config.successMessage || '导出成功')
  } catch (error: unknown) {
    // 如果用户点击取消，不显示错误信息
    if (
      error === 'cancel' ||
      error === 'close' ||
      (typeof error === 'object' &&
        error !== null &&
        'message' in error &&
        (error as Error).message?.includes('cancel'))
    ) {
      ElMessage.info('已取消导出')
      return
    }
    console.error('导出失败:', error)
    ElMessage.error(config.errorMessage || '导出失败，请重试')
  }
}
