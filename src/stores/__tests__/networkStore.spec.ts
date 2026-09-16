import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useNetworkStore } from '../networkStore'

vi.mock('@/api/network', () => ({
  networkAPI: {
    testConnection: vi.fn(),
    testLoginAPI: vi.fn(),
  },
}))

describe('NetworkStore', () => {
  let networkStore: ReturnType<typeof useNetworkStore>

  beforeEach(() => {
    const pinia = createPinia()
    setActivePinia(pinia)
    networkStore = useNetworkStore()
    vi.clearAllMocks()
  })

  describe('连通性测试', () => {
    it('testConnection应代理API并返回结果', async () => {
      const { networkAPI } = await import('@/api/network')
      vi.mocked(networkAPI.testConnection).mockResolvedValue({
        status: 'success',
        message: 'Django服务器连接正常',
      } as never)

      const result = await networkStore.testConnection()

      expect(result.status).toBe('success')
      expect(networkAPI.testConnection).toHaveBeenCalled()
    })

    it('testConnection API失败时应抛出异常', async () => {
      const { networkAPI } = await import('@/api/network')
      vi.mocked(networkAPI.testConnection).mockRejectedValue(new Error('网络不可达'))

      await expect(networkStore.testConnection()).rejects.toThrow('网络不可达')
    })
  })

  describe('登录接口测试', () => {
    it('testLoginAPI应代理API并返回结果', async () => {
      const { networkAPI } = await import('@/api/network')
      vi.mocked(networkAPI.testLoginAPI).mockResolvedValue({
        status: 'success',
        message: '登录接口存在且可访问',
      } as never)

      const result = await networkStore.testLoginAPI()

      expect(result.status).toBe('success')
      expect(networkAPI.testLoginAPI).toHaveBeenCalled()
    })

    it('testLoginAPI API失败时应抛出异常', async () => {
      const { networkAPI } = await import('@/api/network')
      vi.mocked(networkAPI.testLoginAPI).mockRejectedValue(new Error('诊断失败'))

      await expect(networkStore.testLoginAPI()).rejects.toThrow('诊断失败')
    })
  })
})
