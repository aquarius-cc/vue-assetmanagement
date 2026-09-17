import { describe, it, expect } from 'vitest'
import type { AssetExcelRow } from '@/types/batch-import'
import {
  assetImportConfig,
  assetHeaderExamples,
  assetExampleColumns,
  assetExampleRows,
} from '../assetBatchImport.config'

function makeAssetRow(overrides: Record<string, unknown> = {}): AssetExcelRow {
  return {
    asset_code: 'A-001',
    asset_name: '服务器主机',
    asset_specification: 'Dell R750',
    asset_brand: '戴尔',
    asset_unit: '台',
    asset_purchase_price: 35000,
    asset_purchase_number: 2,
    asset_purchase_date: '2025-01-10',
    asset_warranty_period: 3,
    asset_entry_date: '2025-01-15',
    asset_current_status: 'in_store',
    asset_type: 'SVR-01',
    asset_entry_person: 'EMP001',
    asset_contract: 'CT-2025-001',
    asset_applicant: 'EMP002',
    asset_manager: 'EMP003',
    asset_using_location: '数据中心A',
    asset_storage: 'WH-01',
    asset_description: '主节点服务器',
    ...overrides,
  } as unknown as AssetExcelRow
}

const validRow = makeAssetRow()

describe('assetImportConfig 基础配置', () => {
  it('entityName 与 idField 正确', () => {
    expect(assetImportConfig.entityName).toBe('资产')
    expect(assetImportConfig.idField).toBe('asset_name')
    expect(assetImportConfig.requiredFields).toContain('asset_type')
    expect(assetImportConfig.excelHeaderMap.资产名称).toBe('asset_name')
  })

  describe('validateItem', () => {
    it('完全合法数据通过校验', () => {
      const result = assetImportConfig.validateItem(validRow)
      expect(result.valid).toBe(true)
      expect(result.errors).toEqual({})
    })

    it('资产名称为空时失败', () => {
      const result = assetImportConfig.validateItem(makeAssetRow({ asset_name: '  ' }))
      expect(result.valid).toBe(false)
      expect(result.errors.asset_name).toBe('资产名称不能为空')
    })

    it('资产名称过短时失败', () => {
      const result = assetImportConfig.validateItem(makeAssetRow({ asset_name: 'A' }))
      expect(result.valid).toBe(false)
      expect(result.errors.asset_name).toBe('名称长度 2-100 个字符')
    })

    it('资产名称过长时失败', () => {
      const result = assetImportConfig.validateItem(makeAssetRow({ asset_name: 'A'.repeat(101) }))
      expect(result.valid).toBe(false)
      expect(result.errors.asset_name).toBe('名称长度 2-100 个字符')
    })

    it('规格型号为空时失败', () => {
      const result = assetImportConfig.validateItem(makeAssetRow({ asset_specification: '' }))
      expect(result.valid).toBe(false)
      expect(result.errors.asset_specification).toBe('规格型号不能为空')
    })

    it('单价非数字时失败', () => {
      const result = assetImportConfig.validateItem(makeAssetRow({ asset_purchase_price: 'abc' }))
      expect(result.valid).toBe(false)
      expect(result.errors.asset_purchase_price).toBe('单价必须是有效数字且不小于0')
    })

    it('单价为负数时失败', () => {
      const result = assetImportConfig.validateItem(makeAssetRow({ asset_purchase_price: -1 }))
      expect(result.valid).toBe(false)
      expect(result.errors.asset_purchase_price).toBe('单价必须是有效数字且不小于0')
    })

    it('采购数量非数字时失败', () => {
      const result = assetImportConfig.validateItem(makeAssetRow({ asset_purchase_number: 'abc' }))
      expect(result.valid).toBe(false)
      expect(result.errors.asset_purchase_number).toBe('采购数量必须是正整数')
    })

    it('采购数量为 0 时失败', () => {
      const result = assetImportConfig.validateItem(makeAssetRow({ asset_purchase_number: 0 }))
      expect(result.valid).toBe(false)
      expect(result.errors.asset_purchase_number).toBe('采购数量必须是正整数')
    })

    it('采购数量非整数时失败', () => {
      const result = assetImportConfig.validateItem(makeAssetRow({ asset_purchase_number: 1.5 }))
      expect(result.valid).toBe(false)
      expect(result.errors.asset_purchase_number).toBe('采购数量必须是正整数')
    })

    it('入库日期格式错误时失败', () => {
      const result = assetImportConfig.validateItem(
        makeAssetRow({ asset_entry_date: '2025/01/15' }),
      )
      expect(result.valid).toBe(false)
      expect(result.errors.asset_entry_date).toBe('入库日期格式应为 YYYY-MM-DD')
    })

    it('入库日期为空时不校验', () => {
      const result = assetImportConfig.validateItem(makeAssetRow({ asset_entry_date: '' }))
      expect(result.errors.asset_entry_date).toBeUndefined()
    })

    it('资产分类编码为空时失败', () => {
      const result = assetImportConfig.validateItem(makeAssetRow({ asset_type: '  ' }))
      expect(result.valid).toBe(false)
      expect(result.errors.asset_type).toBe('资产分类编码不能为空')
    })

    it('采购日期格式错误时失败', () => {
      const result = assetImportConfig.validateItem(
        makeAssetRow({ asset_purchase_date: '2025/01/10' }),
      )
      expect(result.valid).toBe(false)
      expect(result.errors.asset_purchase_date).toBe('采购日期格式应为 YYYY-MM-DD')
    })

    it('采购日期为空时不校验', () => {
      const result = assetImportConfig.validateItem(makeAssetRow({ asset_purchase_date: '' }))
      expect(result.errors.asset_purchase_date).toBeUndefined()
    })

    it('质保期非数字时失败', () => {
      const result = assetImportConfig.validateItem(makeAssetRow({ asset_warranty_period: 'abc' }))
      expect(result.valid).toBe(false)
      expect(result.errors.asset_warranty_period).toBe('质保期必须是有效数字')
    })

    it('质保期为负数时失败', () => {
      const result = assetImportConfig.validateItem(makeAssetRow({ asset_warranty_period: -1 }))
      expect(result.valid).toBe(false)
      expect(result.errors.asset_warranty_period).toBe('质保期必须是有效数字')
    })

    it('质保期为空时不校验', () => {
      const result = assetImportConfig.validateItem(makeAssetRow({ asset_warranty_period: '' }))
      expect(result.errors.asset_warranty_period).toBeUndefined()
    })

    it('当前状态非法时失败', () => {
      const result = assetImportConfig.validateItem(makeAssetRow({ asset_current_status: 'bogus' }))
      expect(result.valid).toBe(false)
      expect(result.errors.asset_current_status).toContain('当前状态值非法')
    })

    it('当前状态合法时通过', () => {
      const result = assetImportConfig.validateItem(
        makeAssetRow({ asset_current_status: 'in_use' }),
      )
      expect(result.valid).toBe(true)
    })

    it('当前状态为空时不校验', () => {
      const result = assetImportConfig.validateItem(makeAssetRow({ asset_current_status: '' }))
      expect(result.errors.asset_current_status).toBeUndefined()
    })
  })

  describe('transformToApiData', () => {
    it('完整行转换且数字字段规则正确', () => {
      const data = assetImportConfig.transformToApiData(validRow)
      expect(data.asset_name).toBe('服务器主机')
      expect(data.asset_specification).toBe('Dell R750')
      expect(data.asset_brand).toBe('戴尔')
      expect(data.asset_unit).toBe('台')
      expect(data.asset_purchase_price).toBe('35000')
      expect(data.asset_purchase_number).toBe(2)
      expect(data.asset_purchase_date).toBe('2025-01-10')
      expect(data.asset_warranty_period).toBe(3)
      expect(data.asset_entry_date).toBe('2025-01-15')
      expect(data.asset_type).toBe('SVR-01')
      expect(data.asset_entry_person).toBe('EMP001')
      expect(data.asset_contract).toBe('CT-2025-001')
      expect(data.asset_applicant).toBe('EMP002')
      expect(data.asset_manager).toBe('EMP003')
      expect(data.asset_using_location).toBe('数据中心A')
      expect(data.asset_storage).toBe('WH-01')
      expect(data.asset_description).toBe('主节点服务器')
    })

    it('可选字段为空时回退为 null', () => {
      const data = assetImportConfig.transformToApiData(
        makeAssetRow({
          asset_brand: '',
          asset_unit: undefined,
          asset_purchase_date: undefined,
          asset_warranty_period: '',
          asset_entry_person: '',
          asset_contract: undefined,
          asset_applicant: '',
          asset_manager: undefined,
          asset_using_location: '',
          asset_storage: undefined,
          asset_description: '',
        }),
      )
      expect(data.asset_brand).toBeNull()
      expect(data.asset_unit).toBeNull()
      expect(data.asset_purchase_date).toBeNull()
      expect(data.asset_warranty_period).toBeNull()
      expect(data.asset_entry_person).toBeNull()
      expect(data.asset_contract).toBeNull()
      expect(data.asset_applicant).toBeNull()
      expect(data.asset_manager).toBeNull()
      expect(data.asset_using_location).toBeNull()
      expect(data.asset_storage).toBeNull()
      expect(data.asset_description).toBeNull()
    })

    it('字符串字段被 trim', () => {
      const data = assetImportConfig.transformToApiData(
        makeAssetRow({
          asset_name: ' 服务器主机 ',
          asset_specification: ' Dell R750 ',
          asset_brand: ' 戴尔 ',
          asset_unit: ' 台 ',
          asset_entry_date: ' 2025-01-15 ',
          asset_type: ' SVR-01 ',
          asset_description: ' 主节点 ',
        }),
      )
      expect(data.asset_name).toBe('服务器主机')
      expect(data.asset_specification).toBe('Dell R750')
      expect(data.asset_brand).toBe('戴尔')
      expect(data.asset_unit).toBe('台')
      expect(data.asset_entry_date).toBe('2025-01-15')
      expect(data.asset_type).toBe('SVR-01')
      expect(data.asset_description).toBe('主节点')
    })

    it('非数字单价转为 NaN 字符串', () => {
      const data = assetImportConfig.transformToApiData(
        makeAssetRow({ asset_purchase_price: 'abc' }),
      )
      expect(data.asset_purchase_price).toBe('NaN')
    })

    it('字符串数量转数字', () => {
      const data = assetImportConfig.transformToApiData(
        makeAssetRow({ asset_purchase_number: '2' }),
      )
      expect(data.asset_purchase_number).toBe(2)
    })

    it('质保期字符串转数字', () => {
      const data = assetImportConfig.transformToApiData(
        makeAssetRow({ asset_warranty_period: '3' }),
      )
      expect(data.asset_warranty_period).toBe(3)
    })

    it('采购日期字符串被 trim', () => {
      const data = assetImportConfig.transformToApiData(
        makeAssetRow({ asset_purchase_date: ' 2025-01-10 ' }),
      )
      expect(data.asset_purchase_date).toBe('2025-01-10')
    })

    it('createFn 返回空对象', async () => {
      await expect(assetImportConfig.createFn(validRow)).resolves.toEqual({})
    })
  })
})

describe('assetImportConfig 静态导出', () => {
  it('assetHeaderExamples 定义完整', () => {
    expect(assetHeaderExamples).toHaveLength(19)
    expect(assetHeaderExamples[1]).toMatchObject({
      headerName: '资产名称',
      field: 'asset_name',
      required: true,
    })
    expect(assetHeaderExamples[0].required).toBe(false)
  })

  it('assetExampleColumns 与表头对应', () => {
    expect(assetExampleColumns).toHaveLength(assetHeaderExamples.length)
    expect(assetExampleColumns[1]).toEqual({ prop: 'asset_name', label: '资产名称' })
  })

  it('assetExampleRows 包含两条示例', () => {
    expect(assetExampleRows).toHaveLength(2)
    expect(assetExampleRows[0].asset_specification).toBe('Dell R750')
    expect(assetExampleRows[1].asset_storage_code).toBe('WH-02')
  })
})
