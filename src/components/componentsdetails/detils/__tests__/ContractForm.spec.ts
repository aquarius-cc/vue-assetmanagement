/**
 * ContractForm 状态出边下拉测试(P3-04)
 *
 * 背景:合同状态机为线性 8 态,前端原下拉恒渲染全部 8 态,任意跳转均可提交,
 * 只能靠后端 400 兜底。P3-04 起后端 ContractDetailSerializer 下发
 * allowed_next_states(唯一合法出边),编辑态下拉收口为「当前态 ∪ 出边」,
 * 终态禁用;新建态保持全量 8 态。
 *
 * 覆盖:
 * - 编辑态:list 缓存命中但无出边字段(列表序列化器不含)→ 回退 getById
 * - 编辑态:下拉选项 = 当前态 + 出边;终态(出边空)禁用下拉
 * - 新建态:8 态全量,不触发 getById
 */
import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ContractForm from '../ContractForm.vue'
import type { Contract } from '@/types/contract'

const routeState = vi.hoisted(() => ({ query: {} as Record<string, string> }))
const routerPush = vi.hoisted(() => vi.fn())

vi.mock('vue-router', () => ({
  useRoute: () => ({ query: routeState.query }),
  useRouter: () => ({ push: routerPush }),
}))

const storeMock = vi.hoisted(() => ({
  list: [] as Contract[],
  getById: vi.fn<(code: string) => Promise<Contract | null>>(),
  loading: false,
  update: vi.fn(),
  create: vi.fn(),
}))

vi.mock('@/stores/contractStore', () => ({
  useContractStore: () => storeMock,
}))

vi.mock('element-plus', () => ({
  ElMessage: { error: vi.fn(), success: vi.fn() },
}))

/** 渲染 el-select 插槽以便统计 el-option;不声明 props,使 placeholder/disabled 落为 DOM 属性 */
const ElSelectStub = {
  template: '<div class="el-select-stub"><slot /></div>',
}

const makeContract = (overrides: Partial<Contract>): Contract =>
  ({
    recordcode: 'R1',
    contract_code: 'C001',
    contract_name: '测试合同',
    contract_type: 'service',
    supplier_name: '供应商A',
    contract_amount: '10000',
    contract_start_date: null,
    contract_end_date: null,
    contract_status: 'purchasing',
    receive_check_date: null,
    initial_check_date: null,
    final_check_date: null,
    project_change: false,
    project_change_type: null,
    project_change_description: null,
    settlemented_price: '0',
    amount_paid: '0',
    amount_unpaid: '0',
    has_payment: false,
    contract_description: null,
    sort_order: 0,
    version: 1,
    created_at: '2026-01-01T00:00:00+08:00',
    updated_at: '2026-01-01T00:00:00+08:00',
    ...overrides,
  }) as Contract

const mountForm = () =>
  mount(ContractForm, {
    shallow: true,
    global: {
      stubs: { 'el-select': ElSelectStub },
    },
  })

/** 按 placeholder 定位合同结算状态下拉(表单内另有合同类型下拉,防串位) */
const statusSelect = (wrapper: ReturnType<typeof mountForm>) => {
  const found = wrapper
    .findAll('.el-select-stub')
    .find((s) => s.attributes('placeholder') === '请选择结算状态')
  if (!found) throw new Error('合同结算状态下拉未渲染')
  return found
}

const optionValues = (wrapper: ReturnType<typeof mountForm>): string[] =>
  statusSelect(wrapper)
    .findAll('el-option')
    .map((o) => o.attributes('value') ?? '')

describe('ContractForm 状态出边下拉(P3-04)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    routeState.query = {}
    storeMock.list = []
    storeMock.getById.mockReset()
  })

  it('编辑态:list 缓存命中但缺 allowed_next_states 时回退 getById 取出边', async () => {
    routeState.query = { code: 'C001' }
    // 列表序列化器(ContractListSerializer)不含该字段,模拟 list 缓存条目
    storeMock.list = [makeContract({ contract_code: 'C001', contract_status: 'purchasing' })]
    storeMock.getById.mockResolvedValue(
      makeContract({
        contract_code: 'C001',
        contract_status: 'purchasing',
        allowed_next_states: ['purchase_finished'],
      }),
    )

    const wrapper = mountForm()
    await flushPromises()

    expect(storeMock.getById).toHaveBeenCalledWith('C001')
    expect(optionValues(wrapper)).toEqual(['purchasing', 'purchase_finished'])
    wrapper.unmount()
  })

  it('编辑态:list 条目已带出边时直接使用,不调 getById', async () => {
    routeState.query = { code: 'C001' }
    storeMock.list = [
      makeContract({
        contract_code: 'C001',
        contract_status: 'project_settlement',
        allowed_next_states: ['settlement_done'],
      }),
    ]

    const wrapper = mountForm()
    await flushPromises()

    expect(storeMock.getById).not.toHaveBeenCalled()
    expect(optionValues(wrapper)).toEqual(['project_settlement', 'settlement_done'])
    wrapper.unmount()
  })

  it('编辑态:终态出边为空时仅渲染当前态且禁用下拉', async () => {
    routeState.query = { code: 'C001' }
    storeMock.getById.mockResolvedValue(
      makeContract({
        contract_code: 'C001',
        contract_status: 'project_finished',
        allowed_next_states: [],
      }),
    )

    const wrapper = mountForm()
    await flushPromises()

    expect(optionValues(wrapper)).toEqual(['project_finished'])
    // stub 无 props 声明,disabled 经 fallthrough 落为 DOM 属性(布尔 true → 存在)
    expect(statusSelect(wrapper).attributes('disabled')).toBe('true')
    wrapper.unmount()
  })

  it('编辑态:出边含非法键时被过滤,仅保留 CONTRACT_STATUS_MAP 内键', async () => {
    routeState.query = { code: 'C001' }
    storeMock.getById.mockResolvedValue(
      makeContract({
        contract_code: 'C001',
        contract_status: 'receive_check',
        allowed_next_states: ['initial_check', 'bogus_state'],
      }),
    )

    const wrapper = mountForm()
    await flushPromises()

    expect(optionValues(wrapper)).toEqual(['receive_check', 'initial_check'])
    wrapper.unmount()
  })

  it('新建态:渲染全部 8 态且不调 getById', async () => {
    const wrapper = mountForm()
    await flushPromises()

    expect(storeMock.getById).not.toHaveBeenCalled()
    expect(optionValues(wrapper)).toHaveLength(8)
    // 新建态可用:disabled fallthrough 为 "false"
    expect(statusSelect(wrapper).attributes('disabled')).toBe('false')
    wrapper.unmount()
  })
})
