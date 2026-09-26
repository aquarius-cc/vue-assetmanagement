/**
 * 批量导入模板导出工具（DR-1 收敛：原先在多个 BatchImport 组件中重复实现）
 *
 * 使用 ExcelJS 生成 .xlsx 模板并触发浏览器下载。
 * 实现逻辑与原各组件内 handleExportTemplate 保持一致，仅做物理提取，零行为变更。
 */
import ExcelJS from 'exceljs'
import { ElMessage } from 'element-plus'
import { logError } from '@/utils/logger'
import { XLSX_MIME, downloadBlob } from '@/utils/fileDownload'

/**
 * 模板单元格值：字符串与数值原样保留，缺失/空值统一补空字符串
 */
export type TemplateCellValue = string | number

/**
 * 生成并下载 Excel 导入模板
 * @param worksheetName - 工作表名称（如「资产导入模板」）
 * @param headers - 表头中文名数组（顺序即列顺序）
 * @param exampleRows - 示例数据行（每行与 headers 对齐；缺失的表头填空字符串，数值单元格保留原值）
 * @param fileName - 下载文件名（如「资产批量导入模板.xlsx」）
 */
export async function downloadExcelTemplate(
  worksheetName: string,
  headers: string[],
  exampleRows: Record<string, TemplateCellValue>[],
  fileName: string,
): Promise<void> {
  try {
    // 使用 ExcelJS 创建模板工作簿
    const workbook = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet(worksheetName)

    // 添加表头行和示例数据（与原实现一致：按 headers 顺序取值，缺失/空值补空）
    worksheet.addRow(headers)
    for (const rowData of exampleRows) {
      worksheet.addRow(headers.map((h) => rowData[h] ?? ''))
    }

    // 设置列宽
    worksheet.columns = headers.map(() => ({ width: 20 }))

    // 生成并下载文件（下载样板收敛至 utils/fileDownload，DR-4）
    const buffer = await workbook.xlsx.writeBuffer()
    downloadBlob(new Blob([buffer], { type: XLSX_MIME }), fileName)

    ElMessage.success('模板下载成功')
  } catch (error) {
    logError('utils/batchImport/templateExport', '导出模板失败:', error)
    ElMessage.error('导出模板失败，请稍后重试')
  }
}
