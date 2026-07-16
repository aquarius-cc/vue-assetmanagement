// composables/useExcelExport.ts
import { h } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { exportToExcel } from '@/utils/excelExporter'
import type { ColumnConfig } from '@/utils/excelExporter'

export interface ExportOptions<T> {
  /** 实体名称（用于文件名和提示） */
  entityName: string
  /** 列配置 */
  columns: ColumnConfig<T>[]
  /** 当前页数据（列表页当前展示的数据） */
  currentData: T[]
  /** 总记录数（用于提示） */
  totalCount: number
  /** 获取全部数据的异步函数 */
  fetchAllData: () => Promise<T[]>
  /** 工作表名称，默认 '数据' */
  sheetName?: string
}

/**
 * 通用 Excel 导出 Composable
 * 提供列表导出（当前页/全部）和详情导出功能
 */
export function useExcelExport() {
  /**
   * 列表导出：弹出选择范围（当前页/全部），确认后导出
   */
  const exportList = async <T>(options: ExportOptions<T>): Promise<void> => {
    const {
      entityName,
      columns,
      currentData,
      totalCount,
      fetchAllData,
      sheetName = '数据',
    } = options

    let exportCurrent = false
    let exportAll = false

    try {
      const result = await ElMessageBox({
        title: '选择导出范围',
        message: h('div', null, [
          h('p', null, `当前页面显示 ${currentData.length} 条${entityName}数据`),
          h('p', null, `总共有 ${totalCount} 条${entityName}数据`),
          h('br'),
          h('p', null, '请选择导出范围：'),
        ]),
        showCancelButton: true,
        confirmButtonText: '导出当前页面',
        cancelButtonText: '导出全部数据',
        distinguishCancelAndClose: true,
        closeOnClickModal: false,
      })
      if (result === 'confirm') exportCurrent = true
      else if (result === 'cancel') exportAll = true
      else return
    } catch (err) {
      if (err === 'cancel') exportAll = true
      else if (err === 'close') return
      else throw err
    }

    let exportData: T[] = []
    let fileName: string

    if (exportCurrent) {
      exportData = currentData
      fileName = `${entityName}列表_当前页面_${currentData.length}条.xlsx`
    } else if (exportAll) {
      ElMessage.info(`正在准备全部${entityName}数据，请稍候...`)
      if (totalCount > 1000) {
        const confirm = await ElMessageBox.confirm(
          `数据量较大（共 ${totalCount} 条），导出可能需要一些时间，是否继续？`,
          '导出确认',
          {
            confirmButtonText: '继续',
            cancelButtonText: '取消',
            type: 'warning',
          },
        ).catch(() => false)
        if (!confirm) return
      }
      try {
        exportData = await fetchAllData()
        fileName = `${entityName}列表_全部_${exportData.length}条.xlsx`
      } catch (error) {
        console.error('获取全部数据失败:', error)
        ElMessage.error('获取全部数据失败，请重试')
        return
      }
    } else {
      return
    }

    await exportToExcel({
      data: exportData,
      columns,
      fileName,
      sheetName,
      confirmMessage: `确定要导出 ${exportData.length} 条${entityName}数据吗？`,
      emptyMessage: `暂无${entityName}数据可导出`,
      successMessage: `${entityName}数据导出成功`,
      errorMessage: `${entityName}数据导出失败，请重试`,
    })
  }

  /**
   * 详情导出：直接导出单个对象为 Excel
   * @param entity 详情对象
   * @param columns 列配置
   * @param entityName 实体名称（用于文件名）
   * @param sheetName 工作表名称
   */
  const exportDetail = async <T>(
    entity: T,
    columns: ColumnConfig<T>[],
    entityName: string,
    sheetName = '详情',
  ): Promise<void> => {
    await exportToExcel({
      data: [entity],
      columns,
      fileName: `${entityName}_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.xlsx`,
      sheetName,
      confirmMessage: `确定要导出该${entityName}详情吗？`,
      emptyMessage: `无${entityName}数据`,
      successMessage: `${entityName}详情导出成功`,
      errorMessage: `${entityName}详情导出失败，请重试`,
    })
  }

  return {
    exportList,
    exportDetail,
  }
}
