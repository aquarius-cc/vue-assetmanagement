// composables/useBatchImport.ts
// 批量导入功能提取的公共函数，可供其他组件调用
// 批量导入功能提取的公共函数，适配 @/utils/batchImport/types 和 @/utils/SubmitBatch
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import ExcelJS from 'exceljs'
import type { BatchImportConfig } from '@/utils/batchImport/types'
import { submitBatch } from '@/utils/SubmitBatch'
import type { SubmitBatchResult } from '@/utils/SubmitBatch'

export interface ValidatedRow<T> {
  data: T
  validationStatus: 'success' | 'error'
  validationErrors: Record<string, string>
  validationErrorSummary: string
  submitStatus?: 'pending' | 'success' | 'error' // 提交状态，便于表格展示
  submitError?: string // 提交错误详情，便于表格展示
}

/**
 * 通用批量导入 Hook
 * @param config 批量导入配置，类型定义见 @/utils/batchImport/types
 */
export function useBatchImport<TExcel extends object, TApi extends object>(
  config: BatchImportConfig<TExcel, TApi>,
) {
  const previewData = ref<ValidatedRow<TExcel>[]>([])
  const isSubmitting = ref(false)
  const fileRef = ref<File | null>(null)
  const submitResult = ref<SubmitBatchResult<TApi> | null>(null)

  // 新增：解析错误信息
  const parseError = ref<string>('')

  const validDataCount = computed(
    () => previewData.value.filter((row) => row.validationStatus === 'success').length,
  )

  /**
   * 读取 Excel 文件并解析为 TExcel[] 数组
   * 使用 ExcelJS 替代 xlsx 库，支持 .xlsx 格式
   */
  const readExcelFile = async (file: File): Promise<TExcel[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = async (e) => {
        try {
          const data = e.target?.result as ArrayBuffer
          const workbook = new ExcelJS.Workbook()
          // ExcelJS 支持 ArrayBuffer 直接加载
          await workbook.xlsx.load(data)

          const worksheet = workbook.worksheets[0]
          if (!worksheet) {
            reject(new Error('文件为空或缺少工作表'))
            return
          }

          // 提取表头（第一行）
          const headerRow = worksheet.getRow(1)
          const headers: string[] = []
          headerRow.eachCell((cell) => {
            headers.push(String(cell.value ?? '').trim())
          })

          if (headers.length === 0) {
            reject(new Error('文件为空或缺少数据'))
            return
          }

          // 检查必需列是否存在
          const expectedHeaders = Object.keys(config.excelHeaderMap)
          const missingHeaders = expectedHeaders.filter((h) => !headers.includes(h))
          if (missingHeaders.length > 0) {
            reject(new Error(`缺少必需列: ${missingHeaders.join(', ')}`))
            return
          }

          // 映射数据：从第二行开始遍历
          const mappedData: TExcel[] = []
          worksheet.eachRow((row, rowNumber) => {
            // 跳过表头行
            if (rowNumber === 1) return

            // 跳过全空行
            // row.values 是稀疏数组，第一个元素通常是 undefined，从第二个开始检查
            const rowValues = row.values
            const hasValue = Array.isArray(rowValues) &&
              rowValues.slice(1).some((cell) => cell !== '' && cell != null)
            if (!hasValue) return

            const obj = {} as Record<string, unknown>
            row.eachCell((cell, colNumber) => {
              const header = headers[colNumber - 1]
              if (!header) return

              const key = config.excelHeaderMap[header]
              if (key !== undefined) {
                let value: unknown = cell.value

                // ExcelJS 日期类型处理：cell.value 已经是 Date 对象
                if (value instanceof Date) {
                  value = value.toISOString().split('T')[0]
                } else if (typeof value === 'number') {
                  // 判断是否为日期列，如果是则转换
                  const isDateColumn = /日期|时间|date|time/i.test(header)
                  if (isDateColumn && value > 1 && value < 2958466) {
                    // Excel 日期序列号转 Date（Excel 1900 日期系统）
                    // Excel 的日期序列号 1 = 1900-01-01
                    const excelEpoch = new Date(Date.UTC(1899, 11, 30))
                    const dateValue = new Date(excelEpoch.getTime() + value * 24 * 60 * 60 * 1000)
                    if (!isNaN(dateValue.getTime())) {
                      const y = dateValue.getUTCFullYear()
                      const m = String(dateValue.getUTCMonth() + 1).padStart(2, '0')
                      const d = String(dateValue.getUTCDate()).padStart(2, '0')
                      value = `${y}-${m}-${d}`
                    }
                  }
                  // 非日期数字保持原样
                } else if (value !== null && value !== undefined) {
                  value = String(value).trim()
                }

                obj[key as string] = value
              }
            })

            mappedData.push(obj as unknown as TExcel)
          })
          console.log("映射后的数据:", mappedData)
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

  /**
   * 处理文件选择：解析 Excel 并验证数据格式
   */
  const handleFileChange = async (file: File) => {
    // 重置错误信息
    parseError.value = ''
    fileRef.value = file
    try {
      const data = await readExcelFile(file)
      // console.log("原始数据:", data)
      previewData.value = data.map((item) => {
        const { valid, errors } = config.validateItem(item)
        return {
          data: item,
          validationStatus: valid ? 'success' : 'error',
          validationErrors: errors,
          validationErrorSummary: Object.values(errors).join('；'),
          submitStatus: undefined,
          submitError: undefined,
        }
      })
      // console.log("验证后的数据:", previewData.value)
      ElMessage.success(`成功读取 ${data.length} 条记录`)
    } catch (error) {
      console.error('Excel 解析失败:', error)
      const msg = error instanceof Error ? error.message : '未知错误'
      parseError.value = msg  // 存储具体错误信息
      ElMessage.error(`文件解析失败: ${msg}`)
      previewData.value = []
    }
  }

  /**
   * 提交所有验证通过的数据
   * 使用 SubmitBatch 控制并发与错误收集
   */
  const submitBatchData = async () => {
    if (validDataCount.value === 0) {
      ElMessage.warning('没有有效数据可提交')
      return false
    }

    // ⚠️ 强制要求提供 idField，用于错误日志追踪
    if (!config.idField) {
      ElMessage.error(`${config.entityName} 批量导入配置缺少 idField 字段`)
      return false
    }

    // 获取有效数据并转换为 API 格式
    const validRows = previewData.value.filter((r) => r.validationStatus === 'success')
    // console.log("有效数据:", validRows)
    // 注意：由于 Vue ref 的自动解包，validRows 中 row.data 的实际类型为 UnwrapRef<TExcel>
    // 这里使用类型断言，因为运行时确实是原始 TExcel 对象
    const apiDataList: TApi[] = validRows.map((r) => config.transformToApiData(r.data as TExcel))
    // console.log("转换后的 API 数据:", apiDataList)

    // 重置提交状态
    previewData.value.forEach((row) => {
      row.submitStatus = undefined
      row.submitError = undefined
    })

    isSubmitting.value = true
    try {
      const idField = config.idField as keyof TApi
      // console.log("idField:", idField)
      const result = await submitBatch(apiDataList, config.createFn, {
        entityName: config.entityName,
        idField,
        concurrency: config.concurrency ?? 5,
      })
      // console.log("提交结果:", result)
      submitResult.value = result

      // 根据失败项标记预览数据，使用后端返回的具体错误信息
      if (result.failedItems.length > 0) {
        // 构建 id -> 具体错误信息 的映射
        const failedMap = new Map<string, string>()
        result.failedItems.forEach((failed) => {
          const idValue = failed.item[idField]
          if (idValue !== undefined && idValue !== null) {
            failedMap.set(String(idValue), failed.error)
          }
        })

        previewData.value.forEach((row) => {
          if (row.validationStatus === 'success') {
            const apiData = config.transformToApiData(row.data as TExcel)
            const rowId = String(apiData[idField] ?? '')
            if (failedMap.has(rowId)) {
              row.submitStatus = 'error'
              // ✅ 使用后端返回的具体错误信息，而非固定文本
              row.submitError = failedMap.get(rowId) || '提交失败'
            } else {
              row.submitStatus = 'success'
            }
          }
        })
      } else {
        // 全部成功
        validRows.forEach((row) => {
          row.submitStatus = 'success'
        })
      }

      if (result.failedItems.length === 0) {
        ElMessage.success(`全部导入成功！共 ${result.successCount} 条`)
      } else {
        ElMessage.warning(
          `导入完成：成功 ${result.successCount} 条，失败 ${result.failedItems.length} 条`,
        )
      }
      return true
    } catch (error) {
      const msg = error instanceof Error ? error.message : '导入过程发生未知错误'
      ElMessage.error(`导入失败：${msg}`)
      return false
    } finally {
      isSubmitting.value = false
    }
  }

  /**
   * 清空预览数据和文件引用
   */
  const clearData = () => {
    previewData.value = []
    fileRef.value = null
    submitResult.value = null
  }

  return {
    previewData,
    validDataCount,
    isSubmitting,
    submitResult,
    parseError,          // 暴露错误信息
    handleFileChange,
    submitBatchData,
    clearData,
  }
}
