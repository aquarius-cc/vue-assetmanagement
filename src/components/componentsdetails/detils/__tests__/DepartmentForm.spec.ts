/** [批次4 S9] DepartmentForm 挂载覆盖（生成式浅挂载；行为断言随迭代加深） */
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { describe, it, expect, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
const { createMock } = vi.hoisted(() => ({ createMock: vi.fn() }))
vi.mock('@/stores/departmentStore', () => ({
  useDepartmentStore: () => ({
    loading: false,
    create: createMock,
    update: vi.fn(),
    getById: vi.fn(),
    setRefreshFlag: vi.fn(),
  }),
}))
vi.mock('@/utils/errorHandler', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/utils/errorHandler')>()
  return { ...actual, notifyCallerError: vi.fn() }
})
vi.mock('@/utils/logger', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/utils/logger')>()
  return { ...actual, logError: vi.fn() }
})
vi.mock('element-plus', () => ({
  ElMessage: { error: vi.fn(), success: vi.fn(), warning: vi.fn() },
  ElMessageBox: { confirm: vi.fn(() => Promise.resolve('confirm')) },
}))
vi.mock('vue-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('vue-router')>()),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn(), go: vi.fn() }),
  useRoute: () => ({ path: '/', params: {}, query: {}, matched: [] }),
  onBeforeRouteUpdate: vi.fn(),
  onBeforeRouteLeave: vi.fn(),
}))
import Component from '../DepartmentForm.vue'
import { ElMessage } from 'element-plus'
import { notifyCallerError } from '@/utils/errorHandler'
import { logError } from '@/utils/logger'
describe('DepartmentForm 挂载（S9 零覆盖补测）', () => {
  it('浅挂载渲染不抛错', () => {
    const wrapper = mount(Component, {
      shallow: true,
      global: {
        plugins: [createPinia()],
        stubs: {
          'el-button': { template: '<div />' },
          'el-card': { template: '<div />' },
          'el-col': { template: '<div />' },
          'el-form': { template: '<div />' },
          'el-form-item': { template: '<div />' },
          'el-icon': { template: '<div />' },
          'el-input': { template: '<div />' },
          'el-input-number': { template: '<div />' },
          'el-row': { template: '<div />' },
        },
      },
    })
    expect(wrapper.exists()).toBe(true)
  })

  it('[B-35] 提交失败：AxiosError 不直弹后端原文，收编 notifyCallerError + logError', async () => {
    const axiosError = {
      isAxiosError: true,
      message: 'Request failed with status code 500',
      response: { status: 500, data: { message: '数据库连接失败' } },
    }
    createMock.mockRejectedValue(axiosError)

    const wrapper = mount(Component, {
      shallow: true,
      global: {
        plugins: [createPinia()],
        stubs: {
          'el-button': {
            template: '<button @click="$emit(\'click\')"><slot /></button>',
            emits: ['click'],
          },
          'el-card': { template: '<div><slot /></div>' },
          'el-col': { template: '<div><slot /></div>' },
          'el-form': {
            template: '<div><slot /></div>',
            methods: { validate: (cb: (valid: boolean) => void) => cb(true) },
          },
          'el-form-item': { template: '<div><slot /></div>' },
          'el-icon': { template: '<i><slot /></i>' },
          'el-input': { template: '<input />' },
          'el-input-number': { template: '<input />' },
          'el-row': { template: '<div><slot /></div>' },
        },
      },
    })

    const submitBtn = wrapper.findAll('button').find((b) => b.text().includes('提交'))
    expect(submitBtn).toBeTruthy()
    await submitBtn!.trigger('click')
    await flushPromises()

    // 拦截器已提示 → 组件侧不得再弹后端原文
    expect(vi.mocked(ElMessage.error)).not.toHaveBeenCalled()
    expect(vi.mocked(notifyCallerError)).toHaveBeenCalledWith(axiosError, expect.any(String))
    expect(vi.mocked(logError)).toHaveBeenCalledWith(
      'components/componentsdetails/detils/DepartmentForm',
      expect.any(String),
      axiosError,
    )
    // 静态防回潮：不再手写 response.data.message 提取
    const source = readFileSync(
      resolve(process.cwd(), 'src/components/componentsdetails/detils/DepartmentForm.vue'),
      'utf-8',
    )
    expect(source).not.toContain('response?.data?.message')
  })
})

// [S9 生成式补测] 中和传递性 API 调用（组件→composable→store 链），禁真实请求（T12）
vi.mock('@/api/request', () => ({
  get: vi.fn(() => Promise.resolve({ code: 200, data: { count: 0, results: [] }, message: 'ok' })),
  post: vi.fn(() => Promise.resolve({ code: 200, data: {}, message: 'ok' })),
  put: vi.fn(() => Promise.resolve({ code: 200, data: {}, message: 'ok' })),
  patch: vi.fn(() => Promise.resolve({ code: 200, data: {}, message: 'ok' })),
  delete: vi.fn(() => Promise.resolve({ code: 200, data: {}, message: 'ok' })),
  buildLoginRedirectUrl: vi.fn(() => '/login'),
  clearCacheByPattern: vi.fn(),
  degradedCacheKeys: new Set(),
}))

// [S9 生成式补测] 经 @/api/index 的真实调用链一并中和（含 *API 命名导出与 request 对象）
vi.mock('@/api/index', () => {
  const payload = { count: 0, results: [] as unknown[], page: 1, page_size: 20, total_pages: 0 }
  const mk = () => vi.fn(() => Promise.resolve(payload))
  const apiStub = () => new Proxy({}, { get: () => mk() })
  return {
    request: apiStub(),
    unwrapResponse: vi.fn((res: { data?: unknown } | undefined) => res?.data ?? res),
    getBlob: mk(),
    clearCacheByPattern: vi.fn(),
    degradedCacheKeys: new Set(),
    buildLoginRedirectUrl: vi.fn(() => '/login'),
    authAPI: apiStub(),
    userAPI: apiStub(),
    departmentAPI: apiStub(),
    assetAPI: apiStub(),
    dashboardAPI: apiStub(),
    contractAPI: apiStub(),
    storageAPI: apiStub(),
    assetTypeAPI: apiStub(),
    outAssetAPI: apiStub(),
    recycleAssetAPI: apiStub(),
    damagedAssetAPI: apiStub(),
    wasteAssetAPI: apiStub(),
    networkAPI: apiStub(),
    unregisteredAssetAPI: apiStub(),
    operationLogAPI: apiStub(),
    harddiskSnAPI: apiStub(),
  }
})
