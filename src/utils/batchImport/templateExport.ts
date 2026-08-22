/**
 * 批量导入模板导出工具（DR-1 收敛：原先在多个 BatchImport 组件中重复实现）
 *
 * 使用 ExcelJS 生成 .xlsx 模板并触发浏览器下载。
 * 实现逻辑与原各组件内 handleExportTemplate 保持一致，仅做物理提取，零行为变更。
 */
import ExcelJS from 'exceljs'
import { ElMessage } from 'element-plus'

/**
 * 生成并下载 Excel 导入模板
 * @param worksheetName - 工作表名称（如「资产导入模板」）
 * @param headers - 表头中文名数组（顺序即列顺序）
 * @param exampleRows - 示例数据行（每行与 headers 对齐；缺失的表头填空字符串）
 * @param fileName - 下载文件名（如「资产批量导入模板.xlsx」）
 */
export async function downloadExcelTemplate(
  worksheetName: string,
  headers: string[],
  exampleRows: Record<string, string>[],
  fileName: string,
): Promise<void> {
  try {
    // 使用 ExcelJS 创建模板工作簿
    const workbook = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet(worksheetName)

    // 添加表头行和示例数据（与原实现一致：按 headers 顺序取值，缺失补空）
    worksheet.addRow(headers)
    for (const rowData of exampleRows) {
      worksheet.addRow(headers.map((h) => rowData[h] ?? ''))
    }

    // 设置列宽
    worksheet.columns = headers.map(() => ({ width: 20 }))

    // 生成并下载文件
    const buffer = await workbook.xlsx.writeBuffer()
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

    ElMessage.success('模板下载成功')
  } catch (error) {
    console.error('导出模板失败:', error)
    ElMessage.error('导出模板失败，请稍后重试')
  }
}
