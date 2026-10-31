/**
 * @file Excel 文件解析工具，读取 .xlsx 文件并按表头映射转为对象数组
 * @module src/utils/readExcelFile
 * @exports
 *   - readExcelFile: 读取 Excel 文件并解析为泛型对象数组
 * @callers
 *   - composables/useBatchImport
 * @dependsOn
 *   - exceljs
 */

/** [M-33] 本地时区日期拼接收敛至 Format.ts 单一事实源（原 toLocalISODate 已删除） */
import { toLocalDateString } from '@/utils/Format'

/**
 * 读取 Excel 文件并解析为对象数组
 * @param file Excel 文件
 * @param excelHeaderMap 表头到字段名的映射
 * @returns 解析后的对象数组
 */
export async function readExcelFile<T extends object>(
  file: File,
  excelHeaderMap: Record<string, string>,
): Promise<T[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = async (e) => {
      try {
        const data = e.target?.result as ArrayBuffer
        // [M-24] 按需加载：exceljs 约 1MB，仅解析导入文件时动态拉取，不进首屏 chunk
        const ExcelJS = (await import('exceljs')).default
        const workbook = new ExcelJS.Workbook()
        await workbook.xlsx.load(data)

        const worksheet = workbook.worksheets[0]
        if (!worksheet) {
          reject(new Error('文件为空或缺少工作表'))
          return
        }

        const headerRow = worksheet.getRow(1)
        const headers: string[] = []
        headerRow.eachCell((cell) => {
          headers.push(String(cell.value ?? '').trim())
        })

        if (headers.length === 0) {
          reject(new Error('文件为空或缺少数据'))
          return
        }

        const expectedHeaders = Object.keys(excelHeaderMap)
        const missingHeaders = expectedHeaders.filter((h) => !headers.includes(h))
        if (missingHeaders.length > 0) {
          reject(new Error(`缺少必需列: ${missingHeaders.join(', ')}`))
          return
        }

        /** 判断是否为日期/时间列头 */
        const isDateColumnHeader = (header: string): boolean => /日期|时间|date|time/i.test(header)

        /** 将 Excel 日期序列号转换为 YYYY-MM-DD（超出合理范围或非法则原样返回） */
        const excelSerialToDate = (value: number): string => {
          if (!(value > 1 && value < 2958466)) return String(value)
          const excelEpoch = new Date(Date.UTC(1899, 11, 30))
          const dateValue = new Date(excelEpoch.getTime() + value * 24 * 60 * 60 * 1000)
          if (isNaN(dateValue.getTime())) return String(value)
          const y = dateValue.getUTCFullYear()
          const m = String(dateValue.getUTCMonth() + 1).padStart(2, '0')
          const d = String(dateValue.getUTCDate()).padStart(2, '0')
          return `${y}-${m}-${d}`
        }

        /** 归一单元格值：Date → ISO；日期列数字 → YYYY-MM-DD；其余非空 → String().trim() */
        const normalizeCellValue = (rawValue: unknown, header: string): unknown => {
          if (rawValue instanceof Date) return toLocalDateString(rawValue)
          if (typeof rawValue === 'number') {
            return isDateColumnHeader(header) ? excelSerialToDate(rawValue) : rawValue
          }
          if (rawValue !== null && rawValue !== undefined) return String(rawValue).trim()
          return rawValue
        }

        const mappedData: T[] = []
        worksheet.eachRow((row, rowNumber) => {
          if (rowNumber === 1) return

          const rowValues = row.values
          const hasValue =
            Array.isArray(rowValues) &&
            rowValues.slice(1).some((cell) => cell !== '' && cell != null)
          if (!hasValue) return

          const obj = {} as Record<string, unknown>
          row.eachCell((cell, colNumber) => {
            const header = headers[colNumber - 1]
            if (!header) return

            const key = excelHeaderMap[header]
            if (key !== undefined) {
              obj[key as string] = normalizeCellValue(cell.value, header)
            }
          })

          mappedData.push(obj as unknown as T)
        })
        resolve(mappedData)
      } catch (err) {
        const msg = err instanceof Error ? err.message : '解析 Excel 时发生未知错误'
        reject(new Error(msg))
      }
    }
    reader.onerror = () => reject(new Error('文件读取失败'))
    reader.readAsArrayBuffer(file)
  })
}
