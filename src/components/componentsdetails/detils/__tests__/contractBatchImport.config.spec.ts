import { describe, it, expect } from 'vitest'
import type { ContractExcelRow } from '@/types/batch-import'
import {
  contractImportConfig,
  contractHeaderExamples,
  contractExampleColumns,
  contractExampleRows,
} from '../contractBatchImport.config'

function makeContractRow(overrides: Record<string, unknown> = {}): ContractExcelRow {
  return {
    contract_code: 'CT-2025-001',
    contract_name: '服务器采购合同',
    supplier_name: 'XX科技有限公司',
    contract_amount: 100000,
    contract_start_date: '2025-01-15',
    contract_type: 'tender_procurement',
    contract_warranty_period: 3,
    initial_check_date: '2025-02-01',
    final_check_date: '2025-06-30',
    contract_status: 'purchasing',
    settlemented_price: 50000,
    amount_paid: 50000,
    ...overrides,
  } as unknown as ContractExcelRow
}

const validRow = makeContractRow()

describe('contractImportConfig 基础配置', () => {
  it('entityName 与 idField 正确', () => {
    expect(contractImportConfig.entityName).toBe('合同')
    expect(contractImportConfig.idField).toBe('contract_code')
    expect(contractImportConfig.requiredFields).toContain('contract_code')
    expect(contractImportConfig.excelHeaderMap.签订日期).toBe('contract_start_date')
  })

  describe('validateItem', () => {
    it('完全合法数据通过校验', () => {
      const result = contractImportConfig.validateItem(validRow)
      expect(result.valid).toBe(true)
      expect(result.errors).toEqual({})
    })

    it('合同编码为空时失败', () => {
      const result = contractImportConfig.validateItem(makeContractRow({ contract_code: '   ' }))
      expect(result.valid).toBe(false)
      expect(result.errors.contract_code).toBe('合同编码不能为空')
    })

    it('合同名称为空时失败', () => {
      const result = contractImportConfig.validateItem(makeContractRow({ contract_name: '' }))
      expect(result.valid).toBe(false)
      expect(result.errors.contract_name).toBe('合同名称不能为空')
    })

    it('供应商为空时失败', () => {
      const result = contractImportConfig.validateItem(makeContractRow({ supplier_name: '' }))
      expect(result.valid).toBe(false)
      expect(result.errors.supplier_name).toBe('供应商不能为空')
    })

    it('合同金额非数字时失败', () => {
      const result = contractImportConfig.validateItem(makeContractRow({ contract_amount: 'abc' }))
      expect(result.valid).toBe(false)
      expect(result.errors.contract_amount).toBe('合同金额必须是有效数字且不小于0')
    })

    it('合同金额为负数时失败', () => {
      const result = contractImportConfig.validateItem(makeContractRow({ contract_amount: -1 }))
      expect(result.valid).toBe(false)
      expect(result.errors.contract_amount).toBe('合同金额必须是有效数字且不小于0')
    })

    it('签订日期为空时失败', () => {
      const result = contractImportConfig.validateItem(makeContractRow({ contract_start_date: '' }))
      expect(result.valid).toBe(false)
      expect(result.errors.contract_start_date).toBe('签订日期不能为空')
    })

    it('签订日期为非字符串且无法解析时失败', () => {
      const result = contractImportConfig.validateItem(
        makeContractRow({ contract_start_date: 20250115 }),
      )
      expect(result.valid).toBe(false)
      expect(result.errors.contract_start_date).toBe('签订日期格式应为 YYYY-MM-DD')
    })

    it('签订日期为 null 时按空处理', () => {
      const result = contractImportConfig.validateItem(
        makeContractRow({ contract_start_date: null }),
      )
      expect(result.valid).toBe(false)
      expect(result.errors.contract_start_date).toBe('签订日期不能为空')
    })

    it('签订日期格式错误时失败', () => {
      const result = contractImportConfig.validateItem(
        makeContractRow({ contract_start_date: '2025/01/15' }),
      )
      expect(result.valid).toBe(false)
      expect(result.errors.contract_start_date).toBe('签订日期格式应为 YYYY-MM-DD')
    })

    it('合同类型为空时失败', () => {
      const result = contractImportConfig.validateItem(makeContractRow({ contract_type: '' }))
      expect(result.valid).toBe(false)
      expect(result.errors.contract_type).toBe('合同类型不能为空')
    })

    it('合同类型非法时失败', () => {
      const result = contractImportConfig.validateItem(makeContractRow({ contract_type: 'bogus' }))
      expect(result.valid).toBe(false)
      expect(result.errors.contract_type).toContain('合同类型无效')
    })

    it('保修期非数字时失败', () => {
      const result = contractImportConfig.validateItem(
        makeContractRow({ contract_warranty_period: 'abc' }),
      )
      expect(result.valid).toBe(false)
      expect(result.errors.contract_warranty_period).toBe('保修期必须是有效数字且不小于0')
    })

    it('保修期为负数时失败', () => {
      const result = contractImportConfig.validateItem(
        makeContractRow({ contract_warranty_period: -1 }),
      )
      expect(result.valid).toBe(false)
      expect(result.errors.contract_warranty_period).toBe('保修期必须是有效数字且不小于0')
    })

    it('合同状态为空时失败', () => {
      const result = contractImportConfig.validateItem(makeContractRow({ contract_status: '' }))
      expect(result.valid).toBe(false)
      expect(result.errors.contract_status).toBe('合同状态不能为空')
    })

    it('合同状态非法时失败', () => {
      const result = contractImportConfig.validateItem(
        makeContractRow({ contract_status: 'bogus' }),
      )
      expect(result.valid).toBe(false)
      expect(result.errors.contract_status).toContain('合同状态无效')
    })

    it('初验日期格式错误时失败', () => {
      const result = contractImportConfig.validateItem(
        makeContractRow({ initial_check_date: '2025/02/01' }),
      )
      expect(result.valid).toBe(false)
      expect(result.errors.initial_check_date).toBe('初验日期格式应为 YYYY-MM-DD')
    })

    it('初验日期为数字时按非字符串解析并失败', () => {
      const result = contractImportConfig.validateItem(
        makeContractRow({ initial_check_date: 20250201 }),
      )
      expect(result.valid).toBe(false)
      expect(result.errors.initial_check_date).toBe('初验日期格式应为 YYYY-MM-DD')
    })

    it('初验日期为空时不校验', () => {
      const result = contractImportConfig.validateItem(makeContractRow({ initial_check_date: '' }))
      expect(result.errors.initial_check_date).toBeUndefined()
      expect(result.valid).toBe(true)
    })

    it('终验日期格式错误时失败', () => {
      const result = contractImportConfig.validateItem(
        makeContractRow({ final_check_date: '2025/06/30' }),
      )
      expect(result.valid).toBe(false)
      expect(result.errors.final_check_date).toBe('终验日期格式应为 YYYY-MM-DD')
    })

    it('终验日期为数字时按非字符串解析并失败', () => {
      const result = contractImportConfig.validateItem(
        makeContractRow({ final_check_date: 20250630 }),
      )
      expect(result.valid).toBe(false)
      expect(result.errors.final_check_date).toBe('终验日期格式应为 YYYY-MM-DD')
    })

    it('终验日期为空时不校验', () => {
      const result = contractImportConfig.validateItem(makeContractRow({ final_check_date: '' }))
      expect(result.errors.final_check_date).toBeUndefined()
      expect(result.valid).toBe(true)
    })

    it('结算价格为非数字时失败', () => {
      const result = contractImportConfig.validateItem(
        makeContractRow({ settlemented_price: 'abc' }),
      )
      expect(result.valid).toBe(false)
      expect(result.errors.settlemented_price).toBe('结算价格必须是有效数字且不小于0')
    })

    it('结算价格为负数时失败', () => {
      const result = contractImportConfig.validateItem(makeContractRow({ settlemented_price: -5 }))
      expect(result.valid).toBe(false)
      expect(result.errors.settlemented_price).toBe('结算价格必须是有效数字且不小于0')
    })

    it('结算价格为空字符串时跳过校验', () => {
      const result = contractImportConfig.validateItem(makeContractRow({ settlemented_price: '' }))
      expect(result.errors.settlemented_price).toBeUndefined()
    })

    it('已付金额为非数字时失败', () => {
      const result = contractImportConfig.validateItem(makeContractRow({ amount_paid: 'abc' }))
      expect(result.valid).toBe(false)
      expect(result.errors.amount_paid).toBe('已付金额必须是有效数字且不小于0')
    })

    it('已付金额为负数时失败', () => {
      const result = contractImportConfig.validateItem(makeContractRow({ amount_paid: -5 }))
      expect(result.valid).toBe(false)
      expect(result.errors.amount_paid).toBe('已付金额必须是有效数字且不小于0')
    })

    it('已付金额为空字符串时跳过校验', () => {
      const result = contractImportConfig.validateItem(makeContractRow({ amount_paid: '' }))
      expect(result.errors.amount_paid).toBeUndefined()
    })
  })

  describe('transformToApiData', () => {
    it('字符串字段被清洗且日期为非字符串时转字符串', () => {
      const data = contractImportConfig.transformToApiData(
        makeContractRow({
          contract_code: ' CT-2025-001 ',
          contract_name: ' 服务器 ',
          supplier_name: ' XX科技 ',
          contract_start_date: 20250115,
          contract_type: ' service ',
          contract_status: ' purchasing ',
        }),
      )
      expect(data.contract_code).toBe('CT-2025-001')
      expect(data.contract_name).toBe('服务器')
      expect(data.supplier_name).toBe('XX科技')
      expect(data.contract_start_date).toBe('20250115')
      expect(data.contract_type).toBe('service')
      expect(data.contract_status).toBe('purchasing')
      expect(data.contract_amount).toBe(100000)
      expect(data.contract_warranty_period).toBe(3)
    })

    it('日期字段全值时字符串被 trim', () => {
      const data = contractImportConfig.transformToApiData(
        makeContractRow({ initial_check_date: ' 2025-02-01 ', final_check_date: ' 2025-06-30 ' }),
      )
      expect(data.initial_check_date).toBe('2025-02-01')
      expect(data.final_check_date).toBe('2025-06-30')
    })

    it('日期字段非字符串且有值时转字符串', () => {
      const data = contractImportConfig.transformToApiData(
        makeContractRow({ initial_check_date: 20250201, final_check_date: 20250630 }),
      )
      expect(data.initial_check_date).toBe('20250201')
      expect(data.final_check_date).toBe('20250630')
    })

    it('日期字段空值回退规则正确', () => {
      const data = contractImportConfig.transformToApiData(
        makeContractRow({ initial_check_date: undefined, final_check_date: undefined }),
      )
      expect(data.initial_check_date).toBeNull()
      expect(data.final_check_date).toBeNull()
    })

    it('日期字段为空字符串时原样输出', () => {
      const data = contractImportConfig.transformToApiData(
        makeContractRow({ initial_check_date: '', final_check_date: '' }),
      )
      expect(data.initial_check_date).toBe('')
      expect(data.final_check_date).toBe('')
    })

    it('合同状态为空时返回 null', () => {
      const data = contractImportConfig.transformToApiData(makeContractRow({ contract_status: '' }))
      expect(data.contract_status).toBeNull()
    })

    it('结算价格与已付金额为空时默认 0', () => {
      const data = contractImportConfig.transformToApiData(
        makeContractRow({ settlemented_price: '', amount_paid: undefined }),
      )
      expect(data.settlemented_price).toBe(0)
      expect(data.amount_paid).toBe(0)
    })

    it('结算价格与已付金额有值时转换数字', () => {
      const data = contractImportConfig.transformToApiData(
        makeContractRow({ settlemented_price: '50000', amount_paid: 60000 }),
      )
      expect(data.settlemented_price).toBe(50000)
      expect(data.amount_paid).toBe(60000)
    })

    it('createFn 返回空对象', async () => {
      await expect(contractImportConfig.createFn(validRow)).resolves.toEqual({})
    })
  })
})

describe('contractImportConfig 静态导出', () => {
  it('contractHeaderExamples 定义完整', () => {
    expect(contractHeaderExamples).toHaveLength(12)
    expect(contractHeaderExamples[0]).toMatchObject({
      headerName: '合同编码',
      field: 'contract_code',
      required: true,
    })
  })

  it('contractExampleColumns 与表头对应', () => {
    expect(contractExampleColumns).toHaveLength(contractHeaderExamples.length)
    expect(contractExampleColumns[0]).toEqual({ prop: 'contract_code', label: '合同编码' })
  })

  it('contractExampleRows 包含两条示例', () => {
    expect(contractExampleRows).toHaveLength(2)
    expect(contractExampleRows[0].contract_code).toBe('CT-2025-001')
    expect(contractExampleRows[1].contract_status).toBe('settlement_done')
  })
})
