// utils/exportImportTemplate.ts
// 批量导入模板导出工具 — 从 7 个 BatchImport.vue 提取的重复 ExcelJS 逻辑

import ExcelJS from 'exceljs'
import { ElMessage } from 'element-plus'

interface ExportTemplateOptions {
  /** 表头映射的 key 数组（即中文列名） */
  headers: string[]
  /** 示例数据行（key 为中文列名，value 为示例值） */
  exampleRowData: Record<string, string>
  /** Excel 工作表名称 */
  sheetName: string
  /** 下载文件名（不含扩展名） */
  fileName: string
}

/**
 * 导出批量导入 Excel 模板
 * 生成包含表头 + 一行示例数据的 .xlsx 文件并触发下载
 */
export async function exportImportTemplate(options: ExportTemplateOptions): Promise<void> {
  const { headers, exampleRowData, sheetName, fileName } = options

  try {
    const workbook = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet(sheetName)

    worksheet.addRow(headers)
    worksheet.addRow(headers.map((h) => exampleRowData[h] ?? ''))
    worksheet.columns = headers.map(() => ({ width: 20 }))

    const buffer = await workbook.xlsx.writeBuffer()
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${fileName.replace(/\.xlsx?$/i, '')}.xlsx`
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
