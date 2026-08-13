import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref, nextTick } from 'vue'

vi.mock('@/utils/Format', () => ({
  formatDate: vi.fn((v: string | null | undefined) => {
    if (!v) return null
    return `formatted_${v}`
  }),
}))

import { useRecycleAssetDetailCards } from '../useRecycleAssetDetailCards'
import type { RecycleAssetDetailCardData } from '../useRecycleAssetDetailCards'
import type { RecycleAssetExtended } from '@/types/recycleasset'
import type { Contract } from '@/types/contract'
import type { EmployeeExtended } from '@/types/user'
import type { Storage } from '@/types/storage'

const createMockDetail = (overrides?: Partial<RecycleAssetExtended>): RecycleAssetExtended =>
  ({
    id: 1,
    recordcode: 'RA001',
    outasset_recordcode: 'OA001',
    recycle_asset: 'A001',
    recycle_asset_number: 5,
    recycle_asset_storage_code: 'S001',
    recycle_asset_recycle_person_jobcode: 'E002',
    recycle_asset_date: '2024-06-15',
    recycle_type: '过期回收',
    recycle_asset_description: '测试回收描述',
    recycle_person_name: '李四',
    recycle_person_jobcode: 'E002',
    recycle_person_department: 'IT部',
    asset: {
      asset_code: 'A001',
      asset_name: '测试资产',
      asset_specification: '型号X',
      asset_contract: {
        contract_code: 'C001',
        contract_name: '采购合同',
        contract_amount: 5000,
        supplier_name: '供应商A',
        contract_start_date: '2024-01-10',
        contract_warranty_period: 3,
        initial_check_date: '2024-02-01',
        final_check_date: '2024-03-01',
      } as Contract,
      asset_manager: {
        employee_name: '王五',
        employee_jobcode: 'E003',
        employee_department: {
          department_name: 'IT部',
        },
      } as EmployeeExtended,
      asset_storage: {
        storage_code: 'S001',
        storage_name: '主仓库',
        storage_type: 'newasset',
        storage_address: '北京市朝阳区',
        storage_description: '主存储仓库',
      } as Storage,
    },
    ...overrides,
  }) as unknown as RecycleAssetExtended

const createEmptyData = (): RecycleAssetDetailCardData => ({
  detail: null,
  contractDetail: null,
  recyclePerson: null,
  storageDetail: null,
})

const createFullData = (): RecycleAssetDetailCardData => ({
  detail: createMockDetail(),
  contractDetail: null,
  recyclePerson: null,
  storageDetail: null,
})

describe('useRecycleAssetDetailCards', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns all 5 card computed refs', () => {
    const data = ref(createFullData())
    const result = useRecycleAssetDetailCards(data)

    expect(result.basicInfoConfig).toBeDefined()
    expect(result.contractInfoConfig).toBeDefined()
    expect(result.usingPersonInfoConfig).toBeDefined()
    expect(result.recyclePersonInfoConfig).toBeDefined()
    expect(result.storageInfoConfig).toBeDefined()
  })

  describe('basicInfoConfig', () => {
    it('shows correct title and icon', () => {
      const data = ref(createFullData())
      const { basicInfoConfig } = useRecycleAssetDetailCards(data)

      expect(basicInfoConfig.value.title).toBe('基本信息')
      expect(basicInfoConfig.value.icon).toBe('Document')
    })

    it('populates fields from detail', () => {
      const data = ref(createFullData())
      const { basicInfoConfig } = useRecycleAssetDetailCards(data)

      const leftCol = basicInfoConfig.value.fields[0]
      expect(leftCol).toContainEqual(
        expect.objectContaining({ label: '回收标识码', value: 'RA001' }),
      )
      expect(leftCol).toContainEqual(expect.objectContaining({ label: '资产码', value: 'A001' }))
      expect(leftCol).toContainEqual(
        expect.objectContaining({ label: '资产名称', value: '测试资产' }),
      )
      expect(leftCol).toContainEqual(expect.objectContaining({ label: '规格型号', value: '型号X' }))
    })

    it('formats recycle date using formatDate', () => {
      const data = ref(createFullData())
      const { basicInfoConfig } = useRecycleAssetDetailCards(data)

      const rightCol = basicInfoConfig.value.fields[1]
      const dateField = rightCol.find((f) => f.label === '回收时间')
      expect(dateField?.formatter?.('2024-06-15')).toBe('formatted_2024-06-15')
    })

    it('uses N/A default for null values', () => {
      const data = ref(createEmptyData())
      const { basicInfoConfig } = useRecycleAssetDetailCards(data)

      expect(basicInfoConfig.value.fields[0][0].defaultValue).toBe('N/A')
    })
  })

  describe('contractInfoConfig', () => {
    it('shows correct title and icon', () => {
      const data = ref(createFullData())
      const { contractInfoConfig } = useRecycleAssetDetailCards(data)

      expect(contractInfoConfig.value.title).toBe('合同信息')
      expect(contractInfoConfig.value.icon).toBe('Tickets')
    })

    it('populates contract fields from detail.asset.asset_contract', () => {
      const data = ref(createFullData())
      const { contractInfoConfig } = useRecycleAssetDetailCards(data)

      const leftCol = contractInfoConfig.value.fields[0]
      expect(leftCol).toContainEqual(expect.objectContaining({ label: '合同编码', value: 'C001' }))
      expect(leftCol).toContainEqual(
        expect.objectContaining({ label: '合同名称', value: '采购合同' }),
      )
      expect(leftCol).toContainEqual(
        expect.objectContaining({ label: '合同金额', value: 5000, isPrice: true }),
      )
      expect(leftCol).toContainEqual(
        expect.objectContaining({ label: '合同供应商', value: '供应商A' }),
      )
    })

    it('formats warranty period with year suffix', () => {
      const data = ref(createFullData())
      const { contractInfoConfig } = useRecycleAssetDetailCards(data)

      const rightCol = contractInfoConfig.value.fields[1]
      const warrantyField = rightCol.find((f) => f.label === '保修期')
      expect(warrantyField?.formatter?.(3)).toBe('3 年')
      expect(warrantyField?.formatter?.(null)).toBe('')
      expect(warrantyField?.formatter?.(undefined)).toBe('')
    })

    it('formats dates using formatDate', () => {
      const data = ref(createFullData())
      const { contractInfoConfig } = useRecycleAssetDetailCards(data)

      const rightCol = contractInfoConfig.value.fields[1]
      const signingDate = rightCol.find((f) => f.label === '签订日期')
      expect(signingDate?.formatter?.('2024-01-10')).toBe('formatted_2024-01-10')
    })
  })

  describe('usingPersonInfoConfig', () => {
    it('shows correct title and icon', () => {
      const data = ref(createFullData())
      const { usingPersonInfoConfig } = useRecycleAssetDetailCards(data)

      expect(usingPersonInfoConfig.value.title).toBe('使用人信息')
      expect(usingPersonInfoConfig.value.icon).toBe('User')
    })

    it('populates using person fields from asset.asset_manager', () => {
      const data = ref(createFullData())
      const { usingPersonInfoConfig } = useRecycleAssetDetailCards(data)

      expect(usingPersonInfoConfig.value.fields[0]).toContainEqual(
        expect.objectContaining({ label: '使用人', value: '王五' }),
      )
      expect(usingPersonInfoConfig.value.fields[1]).toContainEqual(
        expect.objectContaining({ label: '使用人工号', value: 'E003' }),
      )
      expect(usingPersonInfoConfig.value.fields[2]).toContainEqual(
        expect.objectContaining({ value: 'IT部' }),
      )
    })

    it('uses N/A default when detail is null', () => {
      const data = ref(createEmptyData())
      const { usingPersonInfoConfig } = useRecycleAssetDetailCards(data)

      expect(usingPersonInfoConfig.value.fields[0][0].value).toBeUndefined()
      expect(usingPersonInfoConfig.value.fields[0][0].defaultValue).toBe('N/A')
    })
  })

  describe('recyclePersonInfoConfig', () => {
    it('shows correct title and icon', () => {
      const data = ref(createFullData())
      const { recyclePersonInfoConfig } = useRecycleAssetDetailCards(data)

      expect(recyclePersonInfoConfig.value.title).toBe('回收人信息')
      expect(recyclePersonInfoConfig.value.icon).toBe('UserFilled')
    })

    it('populates recycle person fields', () => {
      const data = ref(createFullData())
      const { recyclePersonInfoConfig } = useRecycleAssetDetailCards(data)

      expect(recyclePersonInfoConfig.value.fields[0]).toContainEqual(
        expect.objectContaining({ label: '回收人姓名', value: '李四' }),
      )
      expect(recyclePersonInfoConfig.value.fields[1]).toContainEqual(
        expect.objectContaining({ label: '回收人工号', value: 'E002' }),
      )
      expect(recyclePersonInfoConfig.value.fields[2]).toContainEqual(
        expect.objectContaining({ value: 'IT部' }),
      )
    })
  })

  describe('storageInfoConfig', () => {
    it('shows correct title and icon', () => {
      const data = ref(createFullData())
      const { storageInfoConfig } = useRecycleAssetDetailCards(data)

      expect(storageInfoConfig.value.title).toBe('仓库信息')
      expect(storageInfoConfig.value.icon).toBe('Location')
    })

    it('populates storage fields from asset.asset_storage', () => {
      const data = ref(createFullData())
      const { storageInfoConfig } = useRecycleAssetDetailCards(data)

      const leftCol = storageInfoConfig.value.fields[0]
      expect(leftCol).toContainEqual(expect.objectContaining({ label: '仓库编码', value: 'S001' }))
      expect(leftCol).toContainEqual(
        expect.objectContaining({ label: '仓库名称', value: '主仓库' }),
      )
      expect(leftCol).toContainEqual(
        expect.objectContaining({ label: '仓库地址', value: '北京市朝阳区' }),
      )

      const rightCol = storageInfoConfig.value.fields[1]
      expect(rightCol).toContainEqual(
        expect.objectContaining({ label: '仓库类型', value: 'newasset' }),
      )
      expect(rightCol).toContainEqual(
        expect.objectContaining({ label: '仓库描述', value: '主存储仓库' }),
      )
    })

    it('uses N/A default when storage is null', () => {
      const data = ref(createEmptyData())
      const { storageInfoConfig } = useRecycleAssetDetailCards(data)

      expect(storageInfoConfig.value.fields[0][0].value).toBeUndefined()
      expect(storageInfoConfig.value.fields[0][0].defaultValue).toBe('N/A')
    })
  })

  describe('reactivity', () => {
    it('updates when data changes', async () => {
      const data = ref(createEmptyData())
      const { basicInfoConfig } = useRecycleAssetDetailCards(data)

      expect(basicInfoConfig.value.fields[0][0].value).toBeUndefined()

      data.value = createFullData()
      await nextTick()

      expect(basicInfoConfig.value.fields[0][0].value).toBe('RA001')
    })
  })
})
