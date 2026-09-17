import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import {
  useContractStore,
  addPaymentRecord,
  deletePaymentRecord,
  approvePaymentRecord,
  batchCreateContracts,
} from '../contractStore'

vi.mock('@/api/contract', () => ({
  contractAPI: {
    getContracts: vi.fn(),
    getContractByRecordcode: vi.fn(),
    getContractByName: vi.fn(),
    createContract: vi.fn(),
    updateContract: vi.fn(),
    deleteContract: vi.fn(),
    batchDeleteContracts: vi.fn(),
    addPaymentRecord: vi.fn(),
    deletePaymentRecord: vi.fn(),
    approvePaymentRecord: vi.fn(),
    batchCreateContracts: vi.fn(),
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

  describe('详情/更新/批量删除', () => {
    it('应该调用API获取详情', async () => {
      const { contractAPI } = await import('@/api/contract')
      vi.mocked(contractAPI.getContractByRecordcode).mockResolvedValue({
        recordcode: 'CT-001',
      } as never)

      const result = await store.getById('CT-001')

      expect(result).toBeDefined()
    })

    it('应该调用API更新合同', async () => {
      const { contractAPI } = await import('@/api/contract')
      vi.mocked(contractAPI.updateContract).mockResolvedValue({
        recordcode: 'CT-001',
      } as never)

      await store.update({ recordcode: 'CT-001', contract_name: '新合同名' } as never)

      expect(contractAPI.updateContract).toHaveBeenCalled()
    })

    it('应该调用API批量删除', async () => {
      const { contractAPI } = await import('@/api/contract')
      vi.mocked(contractAPI.batchDeleteContracts).mockResolvedValue({
        total: 1,
        success_count: 1,
        fail_count: 0,
        success_ids: ['CT-001'],
        fail_items: [],
      })

      await store.removeBatch(['CT-001'])

      expect(contractAPI.batchDeleteContracts).toHaveBeenCalledWith(['CT-001'])
    })
  })

  describe('支付记录操作', () => {
    it('应该调用addPaymentRecord添加付款记录', async () => {
      const { contractAPI } = await import('@/api/contract')
      vi.mocked(contractAPI.addPaymentRecord).mockResolvedValue({
        contract: { recordcode: 'CT-001' },
        payment_records: [],
      } as never)

      const result = await addPaymentRecord('CT-001', {
        amount: 1000,
        description: '首付款',
      })

      expect(contractAPI.addPaymentRecord).toHaveBeenCalledWith('CT-001', {
        amount: 1000,
        description: '首付款',
      })
      expect(result).toBeDefined()
    })

    it('应该调用deletePaymentRecord删除付款记录', async () => {
      const { contractAPI } = await import('@/api/contract')
      vi.mocked(contractAPI.deletePaymentRecord).mockResolvedValue({
        contract: { recordcode: 'CT-001' },
        payment_records: [],
      } as never)

      await deletePaymentRecord('CT-001', 'PAY-001')

      expect(contractAPI.deletePaymentRecord).toHaveBeenCalledWith('CT-001', 'PAY-001')
    })

    it('应该调用approvePaymentRecord审核付款记录', async () => {
      const { contractAPI } = await import('@/api/contract')
      vi.mocked(contractAPI.approvePaymentRecord).mockResolvedValue({
        contract: { recordcode: 'CT-001' },
        payment_records: [],
      } as never)

      await approvePaymentRecord('CT-001', 'PAY-001')

      expect(contractAPI.approvePaymentRecord).toHaveBeenCalledWith('CT-001', 'PAY-001')
    })
  })

  describe('批量创建', () => {
    it('应该调用batchCreateContracts批量创建', async () => {
      const mockResult = {
        total: 2,
        success_count: 2,
        fail_count: 0,
        success_ids: ['CT-001', 'CT-002'],
        fail_items: [],
      }

      const { contractAPI } = await import('@/api/contract')
      vi.mocked(contractAPI.batchCreateContracts).mockResolvedValue(mockResult as never)

      const items = [
        { contract_name: '合同A', contract_number: 'PO-2026-001' },
        { contract_name: '合同B', contract_number: 'PO-2026-002' },
      ]
      const result = await batchCreateContracts(items)

      expect(contractAPI.batchCreateContracts).toHaveBeenCalledWith(items)
      expect(result.success_count).toBe(2)
    })
  })
})
