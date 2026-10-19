import { describe, it, expect } from 'vitest'
import type { OutAssetExcelRow } from '@/types/batch-import'
import { OutAssetType } from '@/types/outasset'
import {
  outAssetImportConfig,
  outAssetHeaderExamples,
  outAssetExampleColumns,
  outAssetExampleRows,
} from '../outAssetBatchImport.config'

function makeOutAssetRow(overrides: Record<string, unknown> = {}): OutAssetExcelRow {
  return {
    outasset_code: 'OUT-001',
    outasset_number: 1,
    outasset_date: '2025-06-01',
    return_date: '2025-12-31',
    outasset_type: 'receive',
    outasset_description: '用于项目测试',
    outasset_name: '服务器',
    outasset_applicant_name: '张三',
    outasset_manager_name: '李四',
    outasset_storage: 'WH-01',
    ...overrides,
  } as unknown as OutAssetExcelRow
}

const validRow = makeOutAssetRow()

describe('outAssetImportConfig 基础配置', () => {
  it('entityName 与 idField 正确', () => {
    expect(outAssetImportConfig.entityName).toBe('出库资产')
    expect(outAssetImportConfig.idField).toBe('outasset_code')
    expect(outAssetImportConfig.requiredFields).toContain('outasset_number')
    expect(outAssetImportConfig.excelHeaderMap.出库类型).toBe('outasset_type')
  })

  describe('validateItem', () => {
    it('完全合法数据通过校验', () => {
      const result = outAssetImportConfig.validateItem(validRow)
      expect(result.valid).toBe(true)
      expect(result.errors).toEqual({})
    })

    it('出库资产编码为空时失败', () => {
      const result = outAssetImportConfig.validateItem(makeOutAssetRow({ outasset_code: '  ' }))
      expect(result.valid).toBe(false)
      expect(result.errors.outasset_code).toBe('出库资产编码不能为空')
    })

    it('出库数量非数字时失败', () => {
      const result = outAssetImportConfig.validateItem(makeOutAssetRow({ outasset_number: 'abc' }))
      expect(result.valid).toBe(false)
      expect(result.errors.outasset_number).toBe('出库数量必须是正整数')
    })

    it('出库数量为 0 时失败', () => {
      const result = outAssetImportConfig.validateItem(makeOutAssetRow({ outasset_number: 0 }))
      expect(result.valid).toBe(false)
      expect(result.errors.outasset_number).toBe('出库数量必须是正整数')
    })

    it('出库数量非整数时失败', () => {
      const result = outAssetImportConfig.validateItem(makeOutAssetRow({ outasset_number: 1.5 }))
      expect(result.valid).toBe(false)
      expect(result.errors.outasset_number).toBe('出库数量必须是正整数')
    })

    it('出库日期为空时失败', () => {
      const result = outAssetImportConfig.validateItem(makeOutAssetRow({ outasset_date: '  ' }))
      expect(result.valid).toBe(false)
      expect(result.errors.outasset_date).toBe('出库日期不能为空')
    })

    it('出库日期格式错误时失败', () => {
      const result = outAssetImportConfig.validateItem(
        makeOutAssetRow({ outasset_date: '2025/06/01' }),
      )
      expect(result.valid).toBe(false)
      expect(result.errors.outasset_date).toBe('出库日期格式应为 YYYY-MM-DD')
    })

    it('【BF-110】状态列已移除：status 不参与校验（死列负锚，CT-4；原 P3-03 八态锚随死列消亡）', () => {
      const bogus = outAssetImportConfig.validateItem(
        makeOutAssetRow({ outasset_current_status: 'bogus' }),
      )
      expect(bogus.errors.outasset_current_status).toBeUndefined()
      expect(bogus.valid).toBe(true)
      for (const status of ['in_store', 'broken', 'repairing', 'lost']) {
        const result = outAssetImportConfig.validateItem(
          makeOutAssetRow({ outasset_current_status: status }),
        )
        expect(result.errors.outasset_current_status).toBeUndefined()
      }
    })

    it('出库类型非法时失败', () => {
      const result = outAssetImportConfig.validateItem(makeOutAssetRow({ outasset_type: 'bogus' }))
      expect(result.valid).toBe(false)
      expect(result.errors.outasset_type).toContain('出库类型非法')
    })

    it('出库类型合法时通过', () => {
      const result = outAssetImportConfig.validateItem(makeOutAssetRow({ outasset_type: 'borrow' }))
      expect(result.valid).toBe(true)
    })

    it('出库类型为空时不校验', () => {
      const result = outAssetImportConfig.validateItem(makeOutAssetRow({ outasset_type: '' }))
      expect(result.errors.outasset_type).toBeUndefined()
    })

    it('预计返回日期格式错误时失败', () => {
      const result = outAssetImportConfig.validateItem(
        makeOutAssetRow({ return_date: '2025/12/31' }),
      )
      expect(result.valid).toBe(false)
      expect(result.errors.return_date).toBe('预计返回日期格式应为 YYYY-MM-DD')
    })

    it('预计返回日期为空时不校验', () => {
      const result = outAssetImportConfig.validateItem(makeOutAssetRow({ return_date: '' }))
      expect(result.errors.return_date).toBeUndefined()
    })
  })

  describe('transformToApiData', () => {
    it('完整行转换且字符串被 trim', () => {
      const data = outAssetImportConfig.transformToApiData(
        makeOutAssetRow({
          outasset_code: ' OUT-001 ',
          outasset_number: 2,
          outasset_date: ' 2025-06-01 ',
          return_date: ' 2025-12-31 ',
          outasset_type: ' borrow ',
          outasset_description: ' 临时调拨 ',
        }),
      )
      expect(data.outasset_code).toBe('OUT-001')
      expect(data.outasset_number).toBe(2)
      expect(data.outasset_date).toBe('2025-06-01')
      expect(data.return_date).toBe('2025-12-31')
      expect(data.outasset_type).toBe('borrow')
      expect(data.outasset_description).toBe('临时调拨')
    })

    it('预计返回日期为空时回退为空字符串', () => {
      const data = outAssetImportConfig.transformToApiData(
        makeOutAssetRow({ return_date: undefined }),
      )
      expect(data.return_date).toBe('')
    })

    it('出库类型为空时回退为领用', () => {
      const data = outAssetImportConfig.transformToApiData(makeOutAssetRow({ outasset_type: '' }))
      expect(data.outasset_type).toBe(OutAssetType.RECEIVE)
    })

    it('出库描述为空时回退为空字符串', () => {
      const data = outAssetImportConfig.transformToApiData(
        makeOutAssetRow({ outasset_description: '   ' }),
      )
      expect(data.outasset_description).toBe('')
    })

    it('numeric 出库数量被转换', () => {
      const data = outAssetImportConfig.transformToApiData(
        makeOutAssetRow({ outasset_number: '3' }),
      )
      expect(data.outasset_number).toBe(3)
    })

    it('createFn 返回空对象', async () => {
      await expect(outAssetImportConfig.createFn(validRow)).resolves.toEqual({})
    })
  })
})

describe('outAssetImportConfig 静态导出', () => {
  it('【BF-110】状态列已移除：表头映射不含状态（死列负锚）', () => {
    expect(outAssetImportConfig.excelHeaderMap.资产状态).toBeUndefined()
  })

  it('outAssetHeaderExamples 定义完整', () => {
    expect(outAssetHeaderExamples).toHaveLength(6)
    expect(outAssetHeaderExamples[0]).toMatchObject({
      headerName: '出库资产编码',
      field: 'outasset_code',
      required: true,
    })
  })

  it('outAssetExampleColumns 定义完整', () => {
    expect(outAssetExampleColumns).toHaveLength(5)
    expect(outAssetExampleColumns[3]).toEqual({ prop: 'outasset_type', label: '出库类型' })
  })

  it('outAssetExampleRows 包含两条示例', () => {
    expect(outAssetExampleRows).toHaveLength(2)
    expect(outAssetExampleRows[0].outasset_code).toBe('OUT-001')
    expect(outAssetExampleRows[1].outasset_type).toBe('borrow')
  })
})
