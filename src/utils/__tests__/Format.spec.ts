import { describe, it, expect, vi } from 'vitest'
import {
  formatDate,
  formatPrice,
  formatNumber,
  contractiInfoFormate,
  assetCurrentStatusMapping,
  assetTypeMapping,
  contractTypeMapping,
  contractSettlementStatusMapping,
  storageMapping,
  userStatusMapping,
  getStatusDisplay,
  validateUserStatus,
  transformAndValidateExcelUser,
  transformAndValidateExcelDepartment,
  outassetStatusMapping,
  outassetTypeMapping,
  getAssetStatusText,
  getOutAssetStatusText,
  parseExcelDate,
  USER_STATUS_INPUT_MAPPING,
  USER_STATUS_DISPLAY_MAPPING,
} from '../Format'

vi.mock('@/utils/User', () => ({
  EmployeeStatus: {
    ACTIVE: 'active',
    LEFT: 'left',
    RETIREMENT: 'retirement',
  },
}))

describe('Format', () => {
  describe('formatDate', () => {
    it('returns null for null or undefined', () => {
      expect(formatDate(null)).toBeNull()
      expect(formatDate(undefined)).toBeNull()
    })

    it('formats Date object correctly', () => {
      const date = new Date(2024, 0, 15)
      expect(formatDate(date)).toBe('2024-01-15')
    })

    it('formats string date correctly', () => {
      expect(formatDate('2024-03-25')).toBe('2024-03-25')
      expect(formatDate('2024-12-31T00:00:00Z')).toBe('2024-12-31')
    })

    it('formats timestamp correctly', () => {
      const timestamp = new Date(2024, 5, 15).getTime()
      expect(formatDate(timestamp)).toBe('2024-06-15')
    })

    it('formats 10-digit second timestamp correctly', () => {
      const timestamp = Math.floor(new Date(2024, 5, 15).getTime() / 1000)
      expect(formatDate(timestamp)).toBe('2024-06-15')
    })

    it('returns null for invalid date string', () => {
      expect(formatDate('invalid-date')).toBeNull()
    })

    it('returns null for empty string', () => {
      expect(formatDate('')).toBeNull()
    })

    it('handles edge cases', () => {
      const leapYearDate = new Date(2024, 1, 29)
      expect(formatDate(leapYearDate)).toBe('2024-02-29')
      const newYearDate = new Date(2024, 0, 1)
      expect(formatDate(newYearDate)).toBe('2024-01-01')
    })
  })

  describe('formatPrice', () => {
    it('formats number to two decimal places', () => {
      expect(formatPrice(1000)).toBe('1000.00')
      expect(formatPrice(99.9)).toBe('99.90')
      expect(formatPrice(0)).toBe('0.00')
    })

    it('formats string to two decimal places', () => {
      expect(formatPrice('1234')).toBe('1234.00')
      expect(formatPrice('99.5')).toBe('99.50')
    })

    it('returns default 0.00 for null', () => {
      expect(formatPrice(null)).toBe('0.00')
    })

    it('returns default 0.00 for undefined', () => {
      expect(formatPrice(undefined)).toBe('0.00')
    })

    it('returns default 0.00 for NaN string', () => {
      expect(formatPrice('abc')).toBe('0.00')
    })

    it('handles negative numbers', () => {
      expect(formatPrice(-100)).toBe('-100.00')
    })
  })

  describe('formatNumber', () => {
    it('returns 0 for null', () => {
      expect(formatNumber(null)).toBe('0')
    })

    it('returns 0 for undefined', () => {
      expect(formatNumber(undefined)).toBe('0')
    })

    it('returns 0 for empty string', () => {
      expect(formatNumber('')).toBe('0')
    })

    it('returns 0 for NaN string', () => {
      expect(formatNumber('abc')).toBe('0')
    })

    it('formats number with locale', () => {
      expect(formatNumber(1234)).toBe('1,234')
      expect(formatNumber(1234567)).toBe('1,234,567')
    })

    it('formats string number', () => {
      expect(formatNumber('1234')).toBe('1,234')
    })
  })

  describe('contractiInfoFormate', () => {
    it('returns empty object for null input', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      expect(contractiInfoFormate(null as any)).toEqual({})
      expect(warnSpy).toHaveBeenCalled()
      warnSpy.mockRestore()
    })

    it('returns empty object for undefined input', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      expect(contractiInfoFormate(undefined as any)).toEqual({})
      warnSpy.mockRestore()
    })

    it('formats contract data with dates and numbers', () => {
      const input = {
        contract_code: 'C001',
        contract_name: 'Test',
        contract_price: '5000',
        contract_warranty_period: '3',
        contract_settledment_price: '1000',
        contract_paid_price: '2000',
        contract_paid_count_number: '2',
        contract_type: ' purchase ',
        contract_signing_date: '2024-01-15',
        contract_settledment_status: 'pending',
      }
      const result = contractiInfoFormate(input)
      expect(result.contract_code).toBe('C001')
      expect(result.contract_price).toBe(5000)
      expect(result.contract_warranty_period).toBe(3)
      expect(result.contract_settledment_price).toBe(1000)
      expect(result.contract_paid_price).toBe(2000)
      expect(result.contract_paid_count_number).toBe(2)
      expect(result.contract_type).toBe('purchase')
      expect(result.contract_signing_date).toBe('2024-01-15')
      expect(result.contract_settledment_status).toBe('pending')
    })

    it('handles null number fields with defaults', () => {
      const input = {
        contract_price: null,
        contract_warranty_period: null,
        contract_settledment_price: null,
        contract_paid_price: null,
        contract_paid_count_number: null,
        contract_type: null,
        contract_settledment_status: null,
      }
      const result = contractiInfoFormate(input)
      expect(result.contract_price).toBeUndefined()
      expect(result.contract_warranty_period).toBeUndefined()
      expect(result.contract_settledment_price).toBeNull()
      expect(result.contract_paid_price).toBe(0)
      expect(result.contract_paid_count_number).toBe(0)
      expect(result.contract_type).toBeUndefined()
    })

    it('works with vue ref input', async () => {
      const { ref } = await import('vue')
      const input = ref({
        contract_code: 'C002',
        contract_settledment_status: 'invalid',
      })
      const result = contractiInfoFormate(input as any)
      expect(result.contract_code).toBe('C002')
      expect(result.contract_settledment_status).toBe('pending')
    })
  })

  describe('assetCurrentStatusMapping', () => {
    it('contains all required status mappings', () => {
      expect(assetCurrentStatusMapping).toHaveProperty('in_store', '在库')
      expect(assetCurrentStatusMapping).toHaveProperty('recycled_pending', '已回收待发放')
      expect(assetCurrentStatusMapping).toHaveProperty('in_use', '在用')
      expect(assetCurrentStatusMapping).toHaveProperty('broken', '已损坏')
      expect(assetCurrentStatusMapping).toHaveProperty('repairing', '维修中')
      expect(assetCurrentStatusMapping).toHaveProperty('lost', '已遗失')
      expect(assetCurrentStatusMapping).toHaveProperty('damaged', '待报废')
      expect(assetCurrentStatusMapping).toHaveProperty('scrapped', '已报废')
    })
  })

  describe('assetTypeMapping', () => {
    it('contains all required type mappings', () => {
      expect(assetTypeMapping).toHaveProperty('hardware', '硬件')
      expect(assetTypeMapping).toHaveProperty('software', '软件')
      expect(assetTypeMapping).toHaveProperty('lowvalue', '低值易耗')
      expect(assetTypeMapping).toHaveProperty('other', '其他')
    })
  })

  describe('contractTypeMapping', () => {
    it('maps all contract types', () => {
      expect(contractTypeMapping.purchase).toBe('采购合同')
      expect(contractTypeMapping.service).toBe('服务合同')
      expect(contractTypeMapping.information_construction).toBe('信息化建设合同')
      expect(contractTypeMapping.direct_procurement).toBe('直接采购合同')
    })
  })

  describe('contractSettlementStatusMapping', () => {
    it('maps settlement statuses', () => {
      expect(contractSettlementStatusMapping.pending).toBe('待结算')
      expect(contractSettlementStatusMapping.settled).toBe('已结算')
    })
  })

  describe('storageMapping', () => {
    it('maps storage types', () => {
      expect(storageMapping.newasset).toBe('新货仓库')
      expect(storageMapping.recycle).toBe('回收仓库')
      expect(storageMapping.damaged).toBe('待报废仓库')
    })
  })

  describe('userStatusMapping', () => {
    it('maps all user statuses', () => {
      expect(userStatusMapping.active).toBe('在职员工')
      expect(userStatusMapping.left).toBe('离职员工')
      expect(userStatusMapping.retirement).toBe('退休员工')
      expect(userStatusMapping.dismissed).toBe('辞退员工')
    })
  })

  describe('getStatusDisplay', () => {
    it('returns correct display text for valid status', () => {
      expect(getStatusDisplay('active')).toBe('在职员工')
      expect(getStatusDisplay('left')).toBe('离职员工')
      expect(getStatusDisplay('retirement')).toBe('退休员工')
    })

    it('returns raw status for unknown status', () => {
      expect(getStatusDisplay('unknown')).toBe('unknown')
    })

    it('returns 未知 for undefined', () => {
      expect(getStatusDisplay(undefined)).toBe('未知')
    })
  })

  describe('getAssetStatusText', () => {
    it('returns correct text for valid status', () => {
      expect(getAssetStatusText('in_store')).toBe('在库')
      expect(getAssetStatusText('in_use')).toBe('在用')
      expect(getAssetStatusText('broken')).toBe('已损坏')
    })

    it('returns 未知 for invalid status', () => {
      expect(getAssetStatusText('unknown')).toBe('未知')
    })

    it('returns 未知 for null or undefined', () => {
      expect(getAssetStatusText(null)).toBe('未知')
      expect(getAssetStatusText(undefined)).toBe('未知')
    })
  })

  describe('getOutAssetStatusText', () => {
    it('returns correct text for valid out asset status', () => {
      expect(getOutAssetStatusText('in_use')).toBe('在用')
      expect(getOutAssetStatusText('recycled_pending')).toBe('已回收待发放')
      expect(getOutAssetStatusText('damaged')).toBe('待报废')
      expect(getOutAssetStatusText('scrapped')).toBe('已报废')
    })

    it('returns 未知 for invalid status', () => {
      expect(getOutAssetStatusText('unknown')).toBe('未知')
    })

    it('returns 未知 for null or undefined', () => {
      expect(getOutAssetStatusText(null)).toBe('未知')
      expect(getOutAssetStatusText(undefined)).toBe('未知')
    })
  })

  describe('outassetStatusMapping', () => {
    it('contains all out asset status mappings', () => {
      expect(outassetStatusMapping.recycled_pending).toBe('已回收待发放')
      expect(outassetStatusMapping.in_use).toBe('在用')
      expect(outassetStatusMapping.damaged).toBe('待报废')
      expect(outassetStatusMapping.scrapped).toBe('已报废')
    })
  })

  describe('outassetTypeMapping', () => {
    it('maps out asset types', () => {
      expect(outassetTypeMapping.receive).toBe('领用')
      expect(outassetTypeMapping.borrow).toBe('借用')
    })
  })

  describe('USER_STATUS_INPUT_MAPPING', () => {
    it('maps all input status values', () => {
      expect(USER_STATUS_INPUT_MAPPING['在职']).toBe('active')
      expect(USER_STATUS_INPUT_MAPPING['离职']).toBe('left')
      expect(USER_STATUS_INPUT_MAPPING['退休']).toBe('retirement')
      expect(USER_STATUS_INPUT_MAPPING['在职员工']).toBe('active')
      expect(USER_STATUS_INPUT_MAPPING['离职员工']).toBe('left')
      expect(USER_STATUS_INPUT_MAPPING['退休员工']).toBe('retirement')
    })
  })

  describe('USER_STATUS_DISPLAY_MAPPING', () => {
    it('maps status to display text', () => {
      expect(USER_STATUS_DISPLAY_MAPPING['active']).toBe('在职')
      expect(USER_STATUS_DISPLAY_MAPPING['left']).toBe('离职')
      expect(USER_STATUS_DISPLAY_MAPPING['retirement']).toBe('退休')
    })
  })

  describe('validateUserStatus', () => {
    it('returns EmployeeStatus for valid Chinese input', () => {
      expect(validateUserStatus('在职')).toBe('active')
      expect(validateUserStatus('离职')).toBe('left')
      expect(validateUserStatus('退休')).toBe('retirement')
    })

    it('returns EmployeeStatus for valid English input', () => {
      expect(validateUserStatus('active')).toBe('active')
      expect(validateUserStatus('left')).toBe('left')
      expect(validateUserStatus('retirement')).toBe('retirement')
    })

    it('returns null for invalid status', () => {
      expect(validateUserStatus('unknown')).toBeNull()
      expect(validateUserStatus('')).toBeNull()
    })

    it('trims and lowercases input', () => {
      expect(validateUserStatus('  ACTIVE  ')).toBe('active')
      expect(validateUserStatus('  Inactive  ')).toBeNull()
    })
  })

  describe('transformAndValidateExcelUser', () => {
    const departmentCodeMap: Record<string, string> = {
      D001: '技术部',
      D002: '财务部',
    }

    it('transforms valid excel data', () => {
      const excelData = {
        姓名: '张三',
        工号: 'E001',
        电话: '13800138000',
        位置: '北京',
        状态: '在职',
        部门代码: 'D001',
      }
      const result = transformAndValidateExcelUser(excelData, departmentCodeMap)
      expect(result.validationStatus).toBe('success')
      expect(result.user_name).toBe('张三')
      expect(result.user_jobcode).toBe('E001')
      expect(result.user_phone).toBe('13800138000')
      expect(result.user_location).toBe('北京')
      expect(result.user_status).toBe('active')
      expect(result.user_department_code).toBe('D001')
      expect(result.user_department_name).toBe('技术部')
    })

    it('returns error for missing user_name', () => {
      const excelData = {
        工号: 'E001',
        电话: '13800138000',
        状态: '在职',
        部门代码: 'D001',
      }
      const result = transformAndValidateExcelUser(excelData, departmentCodeMap)
      expect(result.validationStatus).toBe('error')
      expect(result.validationError).toContain('姓名')
    })

    it('returns error for missing user_jobcode', () => {
      const excelData = {
        姓名: '张三',
        电话: '13800138000',
        状态: '在职',
        部门代码: 'D001',
      }
      const result = transformAndValidateExcelUser(excelData, departmentCodeMap)
      expect(result.validationStatus).toBe('error')
      expect(result.validationError).toContain('工号')
    })

    it('returns error for missing user_phone', () => {
      const excelData = {
        姓名: '张三',
        工号: 'E001',
        状态: '在职',
        部门代码: 'D001',
      }
      const result = transformAndValidateExcelUser(excelData, departmentCodeMap)
      expect(result.validationStatus).toBe('error')
      expect(result.validationError).toContain('电话')
    })

    it('returns error for missing user_department_code', () => {
      const excelData = {
        姓名: '张三',
        工号: 'E001',
        电话: '13800138000',
        状态: '在职',
      }
      const result = transformAndValidateExcelUser(excelData, departmentCodeMap)
      expect(result.validationStatus).toBe('error')
      expect(result.validationError).toContain('部门代码')
    })

    it('returns error for invalid status', () => {
      const excelData = {
        姓名: '张三',
        工号: 'E001',
        电话: '13800138000',
        状态: '未知状态',
        部门代码: 'D001',
      }
      const result = transformAndValidateExcelUser(excelData, departmentCodeMap)
      expect(result.validationStatus).toBe('error')
      expect(result.validationError).toContain('不合法')
    })

    it('returns error for non-existent department code', () => {
      const excelData = {
        姓名: '张三',
        工号: 'E001',
        电话: '13800138000',
        状态: '在职',
        部门代码: 'D999',
      }
      const result = transformAndValidateExcelUser(excelData, departmentCodeMap)
      expect(result.validationStatus).toBe('error')
      expect(result.validationError).toContain('不存在')
    })

    it('uses default description when not provided', () => {
      const excelData = {
        姓名: '张三',
        工号: 'E001',
        电话: '13800138000',
        状态: '在职',
        部门代码: 'D001',
      }
      const result = transformAndValidateExcelUser(excelData, departmentCodeMap)
      expect(result.user_description).toBe('')
    })
  })

  describe('transformAndValidateExcelDepartment', () => {
    it('transforms valid department data', () => {
      const excelData = {
        部门编码: 'D001',
        部门名称: '技术部',
        部门信息员: '张三',
      }
      const result = transformAndValidateExcelDepartment(excelData)
      expect(result.validationStatus).toBe('success')
      expect(result.department_code).toBe('D001')
      expect(result.department_name).toBe('技术部')
      expect(result.department_information).toBe('张三')
    })

    it('returns error for missing department_code', () => {
      const excelData = {
        部门名称: '技术部',
        部门信息员: '张三',
      }
      const result = transformAndValidateExcelDepartment(excelData)
      expect(result.validationStatus).toBe('error')
      expect(result.validationError).toContain('部门编码不能为空')
    })

    it('returns error for missing department_name', () => {
      const excelData = {
        部门编码: 'D001',
        部门信息员: '张三',
      }
      const result = transformAndValidateExcelDepartment(excelData)
      expect(result.validationStatus).toBe('error')
      expect(result.validationError).toContain('部门名称不能为空')
    })
  })

  describe('parseExcelDate', () => {
    it('returns empty string for empty input', () => {
      expect(parseExcelDate('')).toBe('')
    })

    it('returns YYYY-MM-DD directly if already formatted', () => {
      expect(parseExcelDate('2024-01-15')).toBe('2024-01-15')
    })

    it('parses MM-DD-YYYY format', () => {
      const result = parseExcelDate('01/15/2024')
      expect(result).toBe('2024-01-15')
    })

    it('parses numeric date string', () => {
      const result = parseExcelDate('45000')
      expect(result).not.toBe('未知')
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    })

    it('returns 未知 for invalid date', () => {
      expect(parseExcelDate('not-a-date')).toBe('未知')
    })

    it('handles DD/MM/YYYY format', () => {
      // parseExcelDate cannot distinguish DD/MM from MM/DD — both match the same regex.
      // When day > 12, JS Date interprets as invalid month, returning '未知'.
      const result = parseExcelDate('25/12/2024')
      expect(result).toBe('未知')
    })
  })
})
