import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref, nextTick } from 'vue'
import type { AssetDetail } from '@/types/asset'

vi.mock('@/utils/Format', () => ({
  formatDate: vi.fn((v: string) => (v ? `formatted_${v}` : null)),
  formatNumber: vi.fn((v: string | number) => String(v)),
  getStatusDisplay: vi.fn((v: string | undefined) => (v ? `status_${v}` : '')),
  contractTypeMapping: { purchase: '采购合同', lease: '租赁合同' } as Record<string, string>,
  contractSettlementStatusMapping: { settled: '已结算', pending: '未结算' } as Record<string, string>,
  storageMapping: { warehouse: '仓库', office: '办公区' } as Record<string, string>,
}))

import { useAssetInfoCards } from '../useAssetInfoCards'

const createMockAsset = (overrides?: Partial<AssetDetail>): AssetDetail =>
  ({
    asset_code: 'A001',
    asset_name: '测试资产',
    asset_brand: '品牌A',
    asset_unit: '台',
    asset_specification: '规格X',
    asset_type: { type_code: 'T01', type_name: '电子设备', parent_type_code: 'P01', level: 2, type_description: '描述' },
    asset_using_location: '北京',
    asset_purchase_price: 1000,
    asset_purchase_number: 5,
    asset_purchase_date: '2024-01-15',
    asset_warranty_period: 12,
    asset_entry_date: '2024-02-01',
    asset_entry_person_jobcode: 'E001',
    asset_contract: {
      contract_code: 'C001',
      contract_name: '采购合同A',
      contract_type: 'purchase',
      contract_supplier: '供应商X',
      contract_price: 5000,
      contract_signing_date: '2024-01-10',
      contract_settledment_status: 'settled',
    },
    asset_entry_person: { employee_jobcode: 'E001', employee_name: '张三' },
    asset_applicant: {
      employee_department_name: '技术部',
      employee_jobcode: 'E002',
      employee_name: '李四',
      employee_status: 'active',
      employee_phone: '13800138000',
      employee_location: '北京办公室',
    },
    asset_manager: {
      employee_department_name: 'IT部',
      employee_jobcode: 'E003',
      employee_name: '王五',
      employee_status: 'active',
      employee_phone: '13900139000',
      employee_location: '上海办公室',
    },
    asset_storage: {
      storage_code: 'S001',
      storage_name: '主仓库',
      storage_type: 'warehouse',
      storage_address: '北京市朝阳区',
      storage_description: '主存储仓库',
    },
    asset_description: '这是一个测试资产的详细描述',
    ...overrides,
  }) as unknown as AssetDetail

describe('useAssetInfoCards', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return all card computed refs', () => {
    const assetDetail = ref<AssetDetail | null>(null)
    const result = useAssetInfoCards(assetDetail)

    expect(result.basicInfoCard).toBeDefined()
    expect(result.assetTypeCard).toBeDefined()
    expect(result.contractCard).toBeDefined()
    expect(result.entryPersonCard).toBeDefined()
    expect(result.applicantCard).toBeDefined()
    expect(result.managerCard).toBeDefined()
    expect(result.storageCard).toBeDefined()
    expect(result.descriptionCard).toBeDefined()
  })

  it('should render basicInfoCard with correct fields', () => {
    const asset = createMockAsset()
    const assetDetail = ref(asset)
    const { basicInfoCard } = useAssetInfoCards(assetDetail)

    expect(basicInfoCard.value.title).toBe('基本信息')
    expect(basicInfoCard.value.fields).toHaveLength(2)
    // 左列
    expect(basicInfoCard.value.fields[0]).toContainEqual(
      expect.objectContaining({ label: '编码', value: 'A001' }),
    )
    expect(basicInfoCard.value.fields[0]).toContainEqual(
      expect.objectContaining({ label: '名称', value: '测试资产' }),
    )
    // 右列
    expect(basicInfoCard.value.fields[1]).toContainEqual(
      expect.objectContaining({ label: '单价', value: 1000 }),
    )
  })

  it('should format price fields in basicInfoCard', () => {
    const asset = createMockAsset({ asset_purchase_price: 9999 })
    const assetDetail = ref(asset)
    const { basicInfoCard } = useAssetInfoCards(assetDetail)

    const priceField = basicInfoCard.value.fields[1].find((f) => f.label === '单价')
    expect(priceField?.formatter?.(9999)).toBe('¥9999')
  })

  it('should show assetTypeCard only when asset_type exists', () => {
    const withType = ref(createMockAsset())
    const { assetTypeCard: cardWith } = useAssetInfoCards(withType)
    expect(cardWith.value.visible).toBe(true)

    const withoutType = ref(createMockAsset({ asset_type: undefined }))
    const { assetTypeCard: cardWithout } = useAssetInfoCards(withoutType)
    expect(cardWithout.value.visible).toBe(false)
  })

  it('should show contractCard only when asset_contract exists', () => {
    const withContract = ref(createMockAsset())
    const { contractCard: cardWith } = useAssetInfoCards(withContract)
    expect(cardWith.value.visible).toBe(true)

    const withoutContract = ref(createMockAsset({ asset_contract: undefined }))
    const { contractCard: cardWithout } = useAssetInfoCards(withoutContract)
    expect(cardWithout.value.visible).toBe(false)
  })

  it('should format contract type using contractTypeMapping', () => {
    const assetDetail = ref(createMockAsset())
    const { contractCard } = useAssetInfoCards(assetDetail)

    const typeField = contractCard.value.fields[0].find((f) => f.label === '合同类型')
    expect(typeField?.formatter?.('purchase')).toBe('采购合同')
  })

  it('should show entryPersonCard only when asset_entry_person exists', () => {
    const withPerson = ref(createMockAsset())
    const { entryPersonCard: cardWith } = useAssetInfoCards(withPerson)
    expect(cardWith.value.visible).toBe(true)

    const withoutPerson = ref(createMockAsset({ asset_entry_person: undefined }))
    const { entryPersonCard: cardWithout } = useAssetInfoCards(withoutPerson)
    expect(cardWithout.value.visible).toBe(false)
  })

  it('should show applicantCard only when asset_applicant exists', () => {
    const withApplicant = ref(createMockAsset())
    const { applicantCard: cardWith } = useAssetInfoCards(withApplicant)
    expect(cardWith.value.visible).toBe(true)

    const withoutApplicant = ref(createMockAsset({ asset_applicant: undefined }))
    const { applicantCard: cardWithout } = useAssetInfoCards(withoutApplicant)
    expect(cardWithout.value.visible).toBe(false)
  })

  it('should format applicant status using getStatusDisplay', () => {
    const assetDetail = ref(createMockAsset())
    const { applicantCard } = useAssetInfoCards(assetDetail)

    const statusField = applicantCard.value.fields[1].find((f) => f.label === '申请人状态')
    expect(statusField?.formatter?.('active')).toBe('status_active')
  })

  it('should show managerCard only when asset_manager exists', () => {
    const withManager = ref(createMockAsset())
    const { managerCard: cardWith } = useAssetInfoCards(withManager)
    expect(cardWith.value.visible).toBe(true)

    const withoutManager = ref(createMockAsset({ asset_manager: undefined }))
    const { managerCard: cardWithout } = useAssetInfoCards(withoutManager)
    expect(cardWithout.value.visible).toBe(false)
  })

  it('should show storageCard only when asset_storage exists', () => {
    const withStorage = ref(createMockAsset())
    const { storageCard: cardWith } = useAssetInfoCards(withStorage)
    expect(cardWith.value.visible).toBe(true)

    const withoutStorage = ref(createMockAsset({ asset_storage: undefined }))
    const { storageCard: cardWithout } = useAssetInfoCards(withoutStorage)
    expect(cardWithout.value.visible).toBe(false)
  })

  it('should format storage type using storageMapping', () => {
    const assetDetail = ref(createMockAsset())
    const { storageCard } = useAssetInfoCards(assetDetail)

    const typeField = storageCard.value.fields[0].find((f) => f.label === '仓库类型')
    expect(typeField?.formatter?.('warehouse')).toBe('仓库')
  })

  it('should show descriptionCard only when asset_description is non-empty', () => {
    const withDesc = ref(createMockAsset({ asset_description: '描述内容' }))
    const { descriptionCard: cardWith } = useAssetInfoCards(withDesc)
    expect(cardWith.value.visible).toBe(true)

    const emptyDesc = ref(createMockAsset({ asset_description: '' }))
    const { descriptionCard: cardEmpty } = useAssetInfoCards(emptyDesc)
    expect(cardEmpty.value.visible).toBe(false)

    const whitespaceDesc = ref(createMockAsset({ asset_description: '   ' }))
    const { descriptionCard: cardWs } = useAssetInfoCards(whitespaceDesc)
    expect(cardWs.value.visible).toBe(false)
  })

  it('should handle null assetDetail gracefully', () => {
    const assetDetail = ref<AssetDetail | null>(null)
    const { basicInfoCard, assetTypeCard, contractCard } = useAssetInfoCards(assetDetail)

    expect(basicInfoCard.value.title).toBe('基本信息')
    expect(basicInfoCard.value.fields[0][0].value).toBeUndefined()
    expect(assetTypeCard.value.visible).toBe(false)
    expect(contractCard.value.visible).toBe(false)
  })

  it('should reactively update when assetDetail changes', async () => {
    const assetDetail = ref<AssetDetail | null>(null)
    const { basicInfoCard } = useAssetInfoCards(assetDetail)

    expect(basicInfoCard.value.fields[0][0].value).toBeUndefined()

    assetDetail.value = createMockAsset()
    await nextTick()

    expect(basicInfoCard.value.fields[0][0].value).toBe('A001')
  })
})
