import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useContractStore } from '../contractStore'

vi.mock('@/api/contract', () => ({
  contractAPI: {
    getContracts: vi.fn(),
    getContractByCodeOrId: vi.fn(),
    getContractByName: vi.fn(),
    createContract: vi.fn(),
    updateContract: vi.fn(),
    deleteContract: vi.fn(),
    batchDeleteContracts: vi.fn(),
  },
}))

vi.mock('element-plus', () => ({
  ElMessage: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
  },
}))

describe('ContractStore', () => {
  let store: ReturnType<typeof useContractStore>

  beforeEach(() => {
    const pinia = createPinia()
    setActivePinia(pinia)
    store = useContractStore()
    vi.clearAllMocks()
  })

  describe('初始化状态', () => {
    it('应该初始化为空列表', () => {
      expect(store.list).toEqual([])
      expect(store.loading).toBe(false)
      expect(store.pagination.total).toBe(0)
    })
  })

  describe('获取列表', () => {
    it('应该调用API获取合同列表', async () => {
      const mockResponse = {
        count: 1,
        next: null,
        previous: null,
        results: [
          {
            recordcode: 'CT-001',
            contract_name: '采购合同A',
            contract_number: 'PO-2026-001',
          },
        ],
      }

      const { contractAPI } = await import('@/api/contract')
      vi.mocked(contractAPI.getContracts).mockResolvedValue(mockResponse)

      await store.getList()

      expect(store.list).toHaveLength(1)
      expect(store.list[0].recordcode).toBe('CT-001')
      expect(store.list[0].contract_name).toBe('采购合同A')
    })

    it('应该更新分页状态', async () => {
      const { contractAPI } = await import('@/api/contract')
      vi.mocked(contractAPI.getContracts).mockResolvedValue({
        count: 100,
        next: null,
        previous: null,
        results: [],
      })

      await store.getList({ page: 5, page_size: 20 })

      expect(store.pagination.total).toBe(100)
      expect(store.pagination.page).toBe(5)
    })

    it('应该处理API错误', async () => {
      const { contractAPI } = await import('@/api/contract')
      vi.mocked(contractAPI.getContracts).mockRejectedValue(new Error('网络错误'))

      await expect(store.getList()).rejects.toThrow('网络错误')
    })
  })

  describe('创建记录', () => {
    it('应该调用API创建合同', async () => {
      const mockCreated = {
        recordcode: 'CT-001',
        contract_name: '采购合同A',
        contract_number: 'PO-2026-001',
      }

      const { contractAPI } = await import('@/api/contract')
      vi.mocked(contractAPI.createContract).mockResolvedValue(mockCreated)

      await store.create({
        contract_name: '采购合同A',
        contract_number: 'PO-2026-001',
      } as any)

      expect(store.list).toHaveLength(1)
      expect(store.list[0].recordcode).toBe('CT-001')
    })

    it('应该处理创建失败', async () => {
      const { contractAPI } = await import('@/api/contract')
      vi.mocked(contractAPI.createContract).mockRejectedValue(new Error('创建失败'))

      await expect(
        store.create({ contract_name: '采购合同A', contract_number: 'PO-2026-001' } as any),
      ).rejects.toThrow('创建失败')
    })
  })

  describe('删除记录', () => {
    it('应该调用API删除合同', async () => {
      const { contractAPI } = await import('@/api/contract')
      vi.mocked(contractAPI.deleteContract).mockResolvedValue()

      await store.remove('CT-001')

      expect(contractAPI.deleteContract).toHaveBeenCalledWith('CT-001')
    })
  })

  describe('按名称查询', () => {
    it('应该调用API按名称搜索合同', async () => {
      const mockResponse = {
        results: [
          {
            recordcode: 'CT-001',
            contract_name: '采购合同A',
          },
        ],
      }

      const { contractAPI } = await import('@/api/contract')
      vi.mocked(contractAPI.getContractByName).mockResolvedValue(mockResponse)

      const result = await store.getByName('采购合同A')

      expect(result).toHaveLength(1)
      expect(result[0].contract_name).toBe('采购合同A')
    })
  })
})
