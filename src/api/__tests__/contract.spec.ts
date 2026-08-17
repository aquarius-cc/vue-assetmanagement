import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockRequest, mockUnwrapResponse } = vi.hoisted(() => ({
  mockRequest: {
    get: vi.fn().mockResolvedValue({ code: 0, data: {}, message: '' }),
    post: vi.fn().mockResolvedValue({ code: 0, data: {}, message: '' }),
    put: vi.fn().mockResolvedValue({ code: 0, data: {}, message: '' }),
    patch: vi.fn().mockResolvedValue({ code: 0, data: {}, message: '' }),
    delete: vi.fn().mockResolvedValue({ code: 0, data: {}, message: '' }),
  },
  mockUnwrapResponse: vi.fn(
    async (promise: Promise<{ code: number; data: unknown; message: string }>) => {
      const res = await promise
      if (res.code !== 0) throw new Error(res.message || '请求失败')
      return res.data
    },
  ),
}))

vi.mock('@/api/index', () => ({
  request: mockRequest,
  unwrapResponse: mockUnwrapResponse,
}))

import { contractAPI } from '@/api/contract'

describe('contractAPI', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('getContracts calls GET /assets/contracts/', async () => {
    await contractAPI.getContracts({ page: 1 })
    expect(mockRequest.get).toHaveBeenCalledWith('/assets/contracts/', { page: 1 })
  })

  it('getContractByRecordcode calls GET /assets/contracts/{code}/', async () => {
    await contractAPI.getContractByRecordcode('C001')
    expect(mockRequest.get).toHaveBeenCalledWith('/assets/contracts/C001/', undefined, true, 300000)
  })

  it('getContractByName calls GET /assets/contracts/getcontractByname/{name}/', async () => {
    await contractAPI.getContractByName('Test Contract')
    expect(mockRequest.get).toHaveBeenCalledWith(
      '/assets/contracts/getcontractByname/Test%20Contract/',
    )
  })

  it('createContract calls POST /assets/contracts/', async () => {
    await contractAPI.createContract({ contract_name: 'New' } as never)
    expect(mockRequest.post).toHaveBeenCalledWith('/assets/contracts/', { contract_name: 'New' })
  })

  it('updateContract calls PUT /assets/contracts/{code}/', async () => {
    await contractAPI.updateContract({ recordcode: 'C001', contract_name: 'Updated' } as never)
    expect(mockRequest.put).toHaveBeenCalledWith('/assets/contracts/C001/', {
      recordcode: 'C001',
      contract_name: 'Updated',
    })
  })

  it('updateContract throws when recordcode is missing', () => {
    expect(() => contractAPI.updateContract({ contract_name: 'Test' } as never)).toThrow(
      'recordcode is required',
    )
  })

  it('deleteContract calls DELETE /assets/contracts/{code}/', async () => {
    await contractAPI.deleteContract('C001')
    expect(mockRequest.delete).toHaveBeenCalledWith('/assets/contracts/C001/')
  })

  it('batchDeleteContracts calls POST /assets/contracts/batch-delete/', async () => {
    await contractAPI.batchDeleteContracts(['C001', 'C002'])
    expect(mockRequest.post).toHaveBeenCalledWith('/assets/contracts/batch-delete/', {
      ids: ['C001', 'C002'],
    })
  })

  it('addPaymentRecord calls POST /assets/contracts/{code}/payment_record/', async () => {
    await contractAPI.addPaymentRecord('C001', { amount: 1000, description: 'payment' })
    expect(mockRequest.post).toHaveBeenCalledWith('/assets/contracts/C001/payment_record/', {
      amount: 1000,
      description: 'payment',
    })
  })

  it('batchCreateContracts calls POST /assets/contracts/batch-create/', async () => {
    await contractAPI.batchCreateContracts([{ contract_name: 'X' } as never])
    expect(mockRequest.post).toHaveBeenCalledWith('/assets/contracts/batch-create/', {
      items: [{ contract_name: 'X' }],
    })
  })
})
