import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref, nextTick } from 'vue'

vi.mock('@/utils/Format', () => ({
  formatDate: vi.fn((v: string | null | undefined) => {
    if (!v) return null
    return `formatted_${v}`
  }),
  outassetTypeMapping: {
    receive: '领用',
    borrow: '借用',
  },
}))

vi.mock('@/utils/statusMapping', () => ({
  getAssetStatusText: vi.fn((status: string) => {
    const map: Record<string, string> = {
      recycled_pending: '已回收待发放',
      in_use: '在用',
      damaged: '待报废',
      scrapped: '已报废',
    }
    return map[status] || status
  }),
}))

import { useOutAssetDetailCards } from '../useOutAssetDetailCards'
import type { OutAssetDetailCardData } from '../useOutAssetDetailCards'
import type { OutAssetDetail } from '@/types/outasset'
import type { Contract } from '@/types/contract'
import type { EmployeeExtended } from '@/types/user'

const createMockDetail = (overrides?: Partial<OutAssetDetail>): OutAssetDetail =>
  ({
    id: 1,
    recordcode: 'OA001',
    asset_recordcode: 'RA001',
    asset_code: 'A001',
    asset_name: '测试资产',
    asset_specification: '型号X',
    outasset_date: '2024-06-15',
    outasset_current_status: 'in_use',
    using_location: '北京办公室',
    return_date: null,
    outasset_type: 'receive',
    outasset_description: '测试出库描述',
    outasset_applicant: {
      employee_name: '张三',
      employee_jobcode: 'E001',
      employee_department_name: '技术部',
    } as EmployeeExtended,
    outasset_manager: {
      employee_name: '王五',
      employee_jobcode: 'E003',
      employee_department_name: 'IT部',
    } as EmployeeExtended,
    contract: {
      contract_code: 'C001',
      contract_name: '采购合同',
      contract_amount: 5000,
      supplier_name: '供应商A',
    } as Contract,
    ...overrides,
  }) as unknown as OutAssetDetail

const createEmptyData = (): OutAssetDetailCardData => ({
  detail: null,
  applicantUser: null,
  managerUser: null,
  assetContract: null,
})

const createFullData = (): OutAssetDetailCardData => ({
  detail: createMockDetail(),
  applicantUser: null,
  managerUser: null,
  assetContract: null,
})

describe('useOutAssetDetailCards', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns all 4 card computed refs', () => {
    const data = ref(createFullData())
    const result = useOutAssetDetailCards(data)

    expect(result.basicInfoConfig).toBeDefined()
    expect(result.contractInfoConfig).toBeDefined()
    expect(result.applicantInfoConfig).toBeDefined()
    expect(result.managerInfoConfig).toBeDefined()
  })

  describe('basicInfoConfig', () => {
    it('shows correct title and icon', () => {
      const data = ref(createFullData())
      const { basicInfoConfig } = useOutAssetDetailCards(data)

      expect(basicInfoConfig.value.title).toBe('基本信息')
      expect(basicInfoConfig.value.icon).toBe('Document')
    })

    it('populates fields from detail', () => {
      const data = ref(createFullData())
      const { basicInfoConfig } = useOutAssetDetailCards(data)

      const leftCol = basicInfoConfig.value.fields[0]
      expect(leftCol).toContainEqual(
        expect.objectContaining({ label: '出库唯一标识码', value: 'OA001' }),
      )
      expect(leftCol).toContainEqual(expect.objectContaining({ label: '资产码', value: 'A001' }))

      const rightCol = basicInfoConfig.value.fields[1]
      expect(rightCol).toContainEqual(
        expect.objectContaining({ label: '资产名称', value: '测试资产' }),
      )
      expect(rightCol).toContainEqual(
        expect.objectContaining({ label: '规格型号', value: '型号X' }),
      )
    })

    it('formats outasset date using formatDate', () => {
      const data = ref(createFullData())
      const { basicInfoConfig } = useOutAssetDetailCards(data)

      const leftCol = basicInfoConfig.value.fields[0]
      const dateField = leftCol.find((f) => f.label === '出库时间')
      expect(dateField?.formatter?.('2024-06-15')).toBe('formatted_2024-06-15')
    })

    it('formats asset status to Chinese text', () => {
      const data = ref(createFullData())
      const { basicInfoConfig } = useOutAssetDetailCards(data)

      const leftCol = basicInfoConfig.value.fields[0]
      const statusField = leftCol.find((f) => f.label === '资产状态')
      expect(statusField?.formatter?.('in_use')).toBe('在用')
      expect(statusField?.formatter?.('damaged')).toBe('待报废')
      expect(statusField?.formatter?.('scrapped')).toBe('已报废')
      expect(statusField?.formatter?.('recycled_pending')).toBe('已回收待发放')
    })

    it('formats outasset type to Chinese text', () => {
      const data = ref(createFullData())
      const { basicInfoConfig } = useOutAssetDetailCards(data)

      const rightCol = basicInfoConfig.value.fields[1]
      const typeField = rightCol.find((f) => f.label === '出库类型')
      expect(typeField?.formatter?.('receive')).toBe('领用')
      expect(typeField?.formatter?.('borrow')).toBe('借用')
    })

    it('formats return date', () => {
      const data = ref(createFullData())
      const { basicInfoConfig } = useOutAssetDetailCards(data)

      const rightCol = basicInfoConfig.value.fields[1]
      const returnDateField = rightCol.find((f) => f.label === '归还日期')
      expect(returnDateField?.formatter?.('2024-12-31')).toBe('formatted_2024-12-31')
    })

    it('uses N/A default for missing fields', () => {
      const data = ref(createEmptyData())
      const { basicInfoConfig } = useOutAssetDetailCards(data)

      expect(basicInfoConfig.value.fields[0][0].defaultValue).toBe('N/A')
    })
  })

  describe('contractInfoConfig', () => {
    it('shows correct title and icon', () => {
      const data = ref(createFullData())
      const { contractInfoConfig } = useOutAssetDetailCards(data)

      expect(contractInfoConfig.value.title).toBe('合同信息')
      expect(contractInfoConfig.value.icon).toBe('Tickets')
    })

    it('populates contract fields from detail.contract', () => {
      const data = ref(createFullData())
      const { contractInfoConfig } = useOutAssetDetailCards(data)

      const leftCol = contractInfoConfig.value.fields[0]
      expect(leftCol).toContainEqual(
        expect.objectContaining({ label: '所在合同号', value: 'C001' }),
      )
      expect(leftCol).toContainEqual(expect.objectContaining({ label: '供应商', value: '供应商A' }))

      const rightCol = contractInfoConfig.value.fields[1]
      expect(rightCol).toContainEqual(
        expect.objectContaining({ label: '所在合同名称', value: '采购合同' }),
      )
      expect(rightCol).toContainEqual(expect.objectContaining({ label: '合同总价', value: 5000 }))
    })

    it('uses N/A default when contract is null', () => {
      const data = ref(createEmptyData())
      const { contractInfoConfig } = useOutAssetDetailCards(data)

      expect(contractInfoConfig.value.fields[0][0].value).toBeUndefined()
      expect(contractInfoConfig.value.fields[0][0].defaultValue).toBe('N/A')
    })
  })

  describe('applicantInfoConfig', () => {
    it('shows correct title and icon', () => {
      const data = ref(createFullData())
      const { applicantInfoConfig } = useOutAssetDetailCards(data)

      expect(applicantInfoConfig.value.title).toBe('申请人信息')
      expect(applicantInfoConfig.value.icon).toBe('User')
    })

    it('populates applicant fields from detail.outasset_applicant', () => {
      const data = ref(createFullData())
      const { applicantInfoConfig } = useOutAssetDetailCards(data)

      expect(applicantInfoConfig.value.fields[0]).toContainEqual(
        expect.objectContaining({ label: '部门', value: '技术部' }),
      )
      expect(applicantInfoConfig.value.fields[1]).toContainEqual(
        expect.objectContaining({ label: '申请人', value: '张三' }),
      )
      expect(applicantInfoConfig.value.fields[2]).toContainEqual(
        expect.objectContaining({ label: '申请人工号', value: 'E001' }),
      )
    })

    it('uses N/A default when applicant is null', () => {
      const data = ref(createEmptyData())
      const { applicantInfoConfig } = useOutAssetDetailCards(data)

      expect(applicantInfoConfig.value.fields[0][0].value).toBeUndefined()
      expect(applicantInfoConfig.value.fields[0][0].defaultValue).toBe('N/A')
    })

    it('returns null for applicant name when name is missing', () => {
      const detail = createMockDetail({
        outasset_applicant: {
          employee_name: '',
          employee_jobcode: 'E001',
          employee_department_name: '技术部',
        } as any,
      })
      const data = ref({ ...createFullData(), detail })
      const { applicantInfoConfig } = useOutAssetDetailCards(data)

      const nameField = applicantInfoConfig.value.fields[1].find((f) => f.label === '申请人')
      expect(nameField?.value).toBeNull()
    })
  })

  describe('managerInfoConfig', () => {
    it('shows correct title and icon', () => {
      const data = ref(createFullData())
      const { managerInfoConfig } = useOutAssetDetailCards(data)

      expect(managerInfoConfig.value.title).toBe('保管人信息')
      expect(managerInfoConfig.value.icon).toBe('UserFilled')
    })

    it('populates manager fields from detail.outasset_manager', () => {
      const data = ref(createFullData())
      const { managerInfoConfig } = useOutAssetDetailCards(data)

      expect(managerInfoConfig.value.fields[0]).toContainEqual(
        expect.objectContaining({ label: '部门', value: 'IT部' }),
      )
      expect(managerInfoConfig.value.fields[1]).toContainEqual(
        expect.objectContaining({ label: '保管人', value: '王五' }),
      )
      expect(managerInfoConfig.value.fields[2]).toContainEqual(
        expect.objectContaining({ label: '保管人工号', value: 'E003' }),
      )
    })

    it('uses N/A default when manager is null', () => {
      const data = ref(createEmptyData())
      const { managerInfoConfig } = useOutAssetDetailCards(data)

      expect(managerInfoConfig.value.fields[0][0].value).toBeUndefined()
      expect(managerInfoConfig.value.fields[0][0].defaultValue).toBe('N/A')
    })

    it('returns null for manager name when name is missing', () => {
      const detail = createMockDetail({
        outasset_manager: {
          employee_name: '',
          employee_jobcode: 'E003',
          employee_department_name: 'IT部',
        } as any,
      })
      const data = ref({ ...createFullData(), detail })
      const { managerInfoConfig } = useOutAssetDetailCards(data)

      const nameField = managerInfoConfig.value.fields[1].find((f) => f.label === '保管人')
      expect(nameField?.value).toBeNull()
    })
  })

  describe('reactivity', () => {
    it('updates when data changes', async () => {
      const data = ref(createEmptyData())
      const { basicInfoConfig } = useOutAssetDetailCards(data)

      expect(basicInfoConfig.value.fields[0][0].value).toBeUndefined()

      data.value = createFullData()
      await nextTick()

      expect(basicInfoConfig.value.fields[0][0].value).toBe('OA001')
    })
  })
})
