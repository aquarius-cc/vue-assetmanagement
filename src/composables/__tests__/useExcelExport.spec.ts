import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('element-plus', () => {
  const fn = vi.fn().mockResolvedValue('confirm')
  fn.confirm = vi.fn().mockResolvedValue('confirm')
  return {
    ElMessage: {
      info: vi.fn(),
      error: vi.fn(),
    },
    ElMessageBox: fn,
  }
})

vi.mock('@/utils/excelExporter', () => ({
  exportToExcel: vi.fn().mockResolvedValue(undefined),
}))

import { useExcelExport } from '../useExcelExport'
import { ElMessageBox, ElMessage } from 'element-plus'
import { exportToExcel } from '@/utils/excelExporter'

describe('useExcelExport', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('exportList', () => {
    it('should export current page data when user confirms', async () => {
      ;(ElMessageBox as any).mockResolvedValue('confirm')
      const { exportList } = useExcelExport()

      const options = {
        entityName: '资产',
        columns: [{ title: '名称', key: 'name' }],
        currentData: [{ name: 'Test Asset' }],
        totalCount: 100,
        fetchAllData: vi.fn().mockResolvedValue([]),
      }

      await exportList(options)

      expect(exportToExcel).toHaveBeenCalledWith(
        expect.objectContaining({
          data: options.currentData,
          fileName: expect.stringContaining('资产列表_当前页面'),
        }),
      )
    })

    it('should export all data when user selects "export all"', async () => {
      ;(ElMessageBox as any).mockRejectedValue('cancel')

      const allData = [{ name: 'Asset 1' }, { name: 'Asset 2' }]
      const { exportList } = useExcelExport()

      const options = {
        entityName: '资产',
        columns: [{ title: '名称', key: 'name' }],
        currentData: [{ name: 'Current' }],
        totalCount: 2,
        fetchAllData: vi.fn().mockResolvedValue(allData),
      }

      await exportList(options)

      expect(ElMessage.info).toHaveBeenCalledWith(expect.stringContaining('正在准备全部资产数据'))
      expect(options.fetchAllData).toHaveBeenCalled()
      expect(exportToExcel).toHaveBeenCalledWith(
        expect.objectContaining({
          data: allData,
          fileName: expect.stringContaining('资产列表_全部'),
        }),
      )
    })

    it('should show confirmation for large datasets', async () => {
      ;(ElMessageBox as any).mockRejectedValueOnce('cancel')
      ;(ElMessageBox.confirm as any).mockResolvedValueOnce('confirm')

      const allData = Array.from({ length: 1500 }, (_, i) => ({ name: `Asset ${i}` }))
      const { exportList } = useExcelExport()

      const options = {
        entityName: '资产',
        columns: [{ title: '名称', key: 'name' }],
        currentData: [{ name: 'Current' }],
        totalCount: 1500,
        fetchAllData: vi.fn().mockResolvedValue(allData),
      }

      await exportList(options)

      expect(ElMessageBox).toHaveBeenCalled()
      expect(ElMessageBox.confirm).toHaveBeenCalled()
    })

    it('should return when user closes dialog', async () => {
      ;(ElMessageBox as any).mockRejectedValue('close')
      const { exportList } = useExcelExport()

      const options = {
        entityName: '资产',
        columns: [{ title: '名称', key: 'name' }],
        currentData: [{ name: 'Current' }],
        totalCount: 100,
        fetchAllData: vi.fn(),
      }

      await exportList(options)

      expect(exportToExcel).not.toHaveBeenCalled()
    })

    it('should handle fetchAllData failure', async () => {
      ;(ElMessageBox as any).mockRejectedValue('cancel')
      const { exportList } = useExcelExport()

      const options = {
        entityName: '资产',
        columns: [{ title: '名称', key: 'name' }],
        currentData: [{ name: 'Current' }],
        totalCount: 100,
        fetchAllData: vi.fn().mockRejectedValue(new Error('Network error')),
      }

      await exportList(options)

      expect(ElMessage.error).toHaveBeenCalledWith('获取全部数据失败，请重试')
      expect(exportToExcel).not.toHaveBeenCalled()
    })

    it('should cancel large dataset confirmation', async () => {
      ;(ElMessageBox as any).mockRejectedValueOnce('cancel')
      ;(ElMessageBox.confirm as any).mockRejectedValueOnce('cancel')

      const { exportList } = useExcelExport()
      const options = {
        entityName: '资产',
        columns: [{ title: '名称', key: 'name' }],
        currentData: [{ name: 'Current' }],
        totalCount: 1500,
        fetchAllData: vi.fn(),
      }

      await exportList(options)

      expect(options.fetchAllData).not.toHaveBeenCalled()
    })
  })

  describe('exportDetail', () => {
    it('should export detail data', async () => {
      ;(ElMessageBox as any).mockResolvedValue('confirm')
      const { exportDetail } = useExcelExport()

      const entity = { id: 1, name: 'Test Asset' }
      const columns = [{ title: '名称', key: 'name' as keyof typeof entity }]

      await exportDetail(entity, columns, '资产')

      expect(exportToExcel).toHaveBeenCalledWith(
        expect.objectContaining({
          data: [entity],
          fileName: expect.stringContaining('资产_'),
          sheetName: '详情',
        }),
      )
    })

    it('should use custom sheet name', async () => {
      ;(ElMessageBox as any).mockResolvedValue('confirm')
      const { exportDetail } = useExcelExport()

      const entity = { id: 1 }
      const columns = [{ title: 'ID', key: 'id' as keyof typeof entity }]

      await exportDetail(entity, columns, '测试', '自定义Sheet')

      expect(exportToExcel).toHaveBeenCalledWith(
        expect.objectContaining({
          sheetName: '自定义Sheet',
        }),
      )
    })
  })
})