import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('element-plus', () => ({
  ElMessage: {
    error: vi.fn(),
    success: vi.fn(),
    warning: vi.fn(),
  },
}))

import {
  useAssetFormAssociations,
  useAssetFormAssociationMethods,
  useEmployeeLinkage,
} from '../useAssetFormHelpers'

describe('useAssetFormAssociations', () => {
  const mockAssetTypeStore = { getList: vi.fn() }
  const mockContractStore = { getList: vi.fn() }
  const mockStorageStore = { getList: vi.fn() }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should initialize with empty arrays', () => {
    const { assetTypes, contracts, storages } = useAssetFormAssociations(
      mockAssetTypeStore,
      mockContractStore,
      mockStorageStore,
    )
    expect(assetTypes.value).toEqual([])
    expect(contracts.value).toEqual([])
    expect(storages.value).toEqual([])
  })

  it('should load associations successfully', async () => {
    mockAssetTypeStore.getList.mockResolvedValue([{ id: 1 }])
    mockContractStore.getList.mockResolvedValue([{ id: 2 }])
    mockStorageStore.getList.mockResolvedValue([{ id: 3 }])

    const { assetTypes, contracts, storages, loadAssociations } = useAssetFormAssociations(
      mockAssetTypeStore,
      mockContractStore,
      mockStorageStore,
    )

    await loadAssociations()

    expect(assetTypes.value).toEqual([{ id: 1 }])
    expect(contracts.value).toEqual([{ id: 2 }])
    expect(storages.value).toEqual([{ id: 3 }])
    expect(mockAssetTypeStore.getList).toHaveBeenCalledWith({ page: 1, page_size: 100 })
    expect(mockContractStore.getList).toHaveBeenCalledWith({ page: 1, page_size: 100 })
    expect(mockStorageStore.getList).toHaveBeenCalledWith({ page: 1, page_size: 100 })
  })

  it('should show error message when loadAssociations fails', async () => {
    const { ElMessage } = await import('element-plus')
    mockAssetTypeStore.getList.mockRejectedValue(new Error('网络错误'))

    const { loadAssociations } = useAssetFormAssociations(
      mockAssetTypeStore,
      mockContractStore,
      mockStorageStore,
    )

    await loadAssociations()

    expect(ElMessage.error).toHaveBeenCalledWith('获取基础数据失败')
  })
})

describe('useAssetFormAssociationMethods', () => {
  const contracts = [
    { contract_name: '合同A', contract_code: 'C001', recordcode: 'R001' },
    { contract_name: '合同B', contract_code: 'C002', recordcode: 'R002' },
  ] as any[]

  const storages = [
    { storage_name: '仓库1', storage_code: 'S001' },
    { storage_name: '仓库2', storage_code: 'S002' },
  ] as any[]

  let onContractUpdate: ReturnType<typeof vi.fn>
  let onStorageCodeUpdate: ReturnType<typeof vi.fn>
  let getContractByName: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()
    onContractUpdate = vi.fn()
    onStorageCodeUpdate = vi.fn()
    getContractByName = vi.fn()
  })

  const createMethods = (contractsOverride = contracts, storagesOverride = storages) =>
    useAssetFormAssociationMethods(
      { value: contractsOverride } as any,
      { value: storagesOverride } as any,
      getContractByName,
      onContractUpdate,
      onStorageCodeUpdate,
    )

  describe('fetchContractSuggestions', () => {
    it('should return empty array for empty query', async () => {
      const { fetchContractSuggestions } = createMethods()
      const cb = vi.fn()
      await fetchContractSuggestions('', cb)
      expect(cb).toHaveBeenCalledWith([])
    })

    it('should fetch and transform contract suggestions', async () => {
      getContractByName.mockResolvedValue(contracts)
      const { fetchContractSuggestions } = createMethods()
      const cb = vi.fn()

      await fetchContractSuggestions('合同', cb)

      expect(getContractByName).toHaveBeenCalledWith('合同')
      expect(cb).toHaveBeenCalledWith([
        { value: '合同A', contract_name: '合同A', contract_code: 'C001', recordcode: 'R001' },
        { value: '合同B', contract_name: '合同B', contract_code: 'C002', recordcode: 'R002' },
      ])
    })

    it('should return empty on fetch error', async () => {
      getContractByName.mockRejectedValue(new Error('fail'))
      const { fetchContractSuggestions } = createMethods()
      const cb = vi.fn()

      await fetchContractSuggestions('合同', cb)

      expect(cb).toHaveBeenCalledWith([])
    })
  })

  describe('handleContractSelect', () => {
    it('should call onContractUpdate with selected contract', () => {
      const { handleContractSelect } = createMethods()
      handleContractSelect({
        value: '合同A',
        contract_name: '合同A',
        contract_code: 'C001',
        recordcode: 'R001',
      })
      expect(onContractUpdate).toHaveBeenCalledWith('合同A', 'C001')
    })
  })

  describe('handleContractNameChange', () => {
    it('should clear update when name is empty', () => {
      const { handleContractNameChange } = createMethods()
      handleContractNameChange('')
      expect(onContractUpdate).toHaveBeenCalledWith('', '')
    })

    it('should find matching contract and update', () => {
      const { handleContractNameChange } = createMethods()
      handleContractNameChange('合同A')
      expect(onContractUpdate).toHaveBeenCalledWith('合同A', 'C001')
    })

    it('should set name only if no matching contract', () => {
      const { handleContractNameChange } = createMethods()
      handleContractNameChange('未知合同')
      expect(onContractUpdate).toHaveBeenCalledWith('未知合同', '')
    })
  })

  describe('handleContractCodeChange', () => {
    it('should clear update when code is empty', () => {
      const { handleContractCodeChange } = createMethods()
      handleContractCodeChange('')
      expect(onContractUpdate).toHaveBeenCalledWith('', '')
    })

    it('should find matching contract by code', () => {
      const { handleContractCodeChange } = createMethods()
      handleContractCodeChange('C002')
      expect(onContractUpdate).toHaveBeenCalledWith('合同B', 'C002')
    })

    it('should set code only if no matching contract', () => {
      const { handleContractCodeChange } = createMethods()
      handleContractCodeChange('UNKNOWN')
      expect(onContractUpdate).toHaveBeenCalledWith('', 'UNKNOWN')
    })
  })

  describe('handleStorageNameChange', () => {
    it('should clear update when name is empty', () => {
      const { handleStorageNameChange } = createMethods()
      handleStorageNameChange('')
      expect(onStorageCodeUpdate).toHaveBeenCalledWith('')
    })

    it('should find matching storage and update code', () => {
      const { handleStorageNameChange } = createMethods()
      handleStorageNameChange('仓库1')
      expect(onStorageCodeUpdate).toHaveBeenCalledWith('S001')
    })

    it('should set empty code if no matching storage', () => {
      const { handleStorageNameChange } = createMethods()
      handleStorageNameChange('不存在的仓库')
      expect(onStorageCodeUpdate).toHaveBeenCalledWith('')
    })
  })
})

describe('useEmployeeLinkage', () => {
  let getUserByName: ReturnType<typeof vi.fn>
  let getUserByCode: ReturnType<typeof vi.fn>
  let onUpdate: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()
    getUserByName = vi.fn()
    getUserByCode = vi.fn()
    onUpdate = vi.fn()
  })

  const createLinkage = () => useEmployeeLinkage(getUserByName, getUserByCode, onUpdate)

  describe('fetchSuggestions', () => {
    it('should return empty for empty query', async () => {
      const { fetchSuggestions } = createLinkage()
      const cb = vi.fn()
      await fetchSuggestions('', cb)
      expect(cb).toHaveBeenCalledWith([])
    })

    it('should fetch and transform user suggestions', async () => {
      getUserByName.mockResolvedValue([
        { employee_name: '张三', employee_jobcode: 'E001', employee_department_name: '技术部' },
      ])
      const { fetchSuggestions } = createLinkage()
      const cb = vi.fn()

      await fetchSuggestions('张', cb)

      expect(cb).toHaveBeenCalledWith([
        { value: '张三', user_name: '张三', user_jobcode: 'E001', department_name: '技术部' },
      ])
    })

    it('should return empty on error', async () => {
      getUserByName.mockRejectedValue(new Error('fail'))
      const { fetchSuggestions } = createLinkage()
      const cb = vi.fn()

      await fetchSuggestions('张', cb)

      expect(cb).toHaveBeenCalledWith([])
    })
  })

  describe('handleSelect', () => {
    it('should call onUpdate with selected user info', () => {
      const { handleSelect } = createLinkage()
      handleSelect({ value: '张三', user_name: '张三', user_jobcode: 'E001', department_name: '' })
      expect(onUpdate).toHaveBeenCalledWith('张三', 'E001')
    })
  })

  describe('handleNameChange', () => {
    it('should skip if selectFlag is false (just selected from dropdown)', async () => {
      const { handleSelect, handleNameChange } = createLinkage()
      handleSelect({ value: '张三', user_name: '张三', user_jobcode: 'E001', department_name: '' })
      await handleNameChange('张三')
      expect(getUserByName).not.toHaveBeenCalled()
    })

    it('should clear when name is empty', async () => {
      const { handleNameChange } = createLinkage()
      await handleNameChange('   ')
      expect(onUpdate).toHaveBeenCalledWith('', '')
    })

    it('should call onUpdate with single match', async () => {
      getUserByName.mockResolvedValue([{ employee_name: '张三', employee_jobcode: 'E001' }])
      const { handleNameChange } = createLinkage()
      await handleNameChange('张三')
      expect(onUpdate).toHaveBeenCalledWith('张三', 'E001')
    })

    it('should show codes when multiple matches', async () => {
      getUserByName.mockResolvedValue([
        { employee_name: '张三', employee_jobcode: 'E001' },
        { employee_name: '张三', employee_jobcode: 'E002' },
      ])
      const { handleNameChange } = createLinkage()
      await handleNameChange('张三')
      expect(onUpdate).toHaveBeenCalledWith('张三', 'E001, E002 (请选择一个正确工号')
    })

    it('should show error when no matches', async () => {
      getUserByName.mockResolvedValue([])
      const { handleNameChange } = createLinkage()
      await handleNameChange('不存在')
      expect(onUpdate).toHaveBeenCalledWith('不存在', '姓名错误，无对应工号')
    })

    it('should handle query error', async () => {
      getUserByName.mockRejectedValue(new Error('fail'))
      const { handleNameChange } = createLinkage()
      await handleNameChange('张三')
      expect(onUpdate).toHaveBeenCalledWith('张三', '查询失败，无法验证工号')
    })
  })

  describe('handleCodeChange', () => {
    it('should clear when code is empty', async () => {
      const { handleCodeChange } = createLinkage()
      await handleCodeChange('')
      expect(onUpdate).toHaveBeenCalledWith('', '')
    })

    it('should call onUpdate with found user', async () => {
      getUserByCode.mockResolvedValue({ employee_name: '张三', employee_jobcode: 'E001' })
      const { handleCodeChange } = createLinkage()
      await handleCodeChange('E001')
      expect(onUpdate).toHaveBeenCalledWith('张三', 'E001')
    })

    it('should show error when user not found', async () => {
      getUserByCode.mockResolvedValue(null)
      const { handleCodeChange } = createLinkage()
      await handleCodeChange('UNKNOWN')
      expect(onUpdate).toHaveBeenCalledWith('工号错误，无对应姓名', 'UNKNOWN')
    })

    it('should handle query error', async () => {
      getUserByCode.mockRejectedValue(new Error('fail'))
      const { handleCodeChange } = createLinkage()
      await handleCodeChange('E001')
      expect(onUpdate).toHaveBeenCalledWith('查询失败', 'E001')
    })
  })
})
