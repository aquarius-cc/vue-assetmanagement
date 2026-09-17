import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import type { UnregisteredAsset } from '@/types/unregisteredasset'
import { HandleType } from '@/types/unregisteredasset'
import { useUnregisteredApproval } from '../useUnregisteredApproval'

const mocks = vi.hoisted(() => ({
  elMessage: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() },
  elMessageBox: vi.fn(),
}))

vi.mock('element-plus', () => ({
  ElMessage: mocks.elMessage,
  ElMessageBox: Object.assign(mocks.elMessageBox, {
    confirm: vi.fn(async () => 'confirm'),
    prompt: vi.fn(async () => ({ value: '' })),
  }),
}))

let captured: any

function makeDetail(): UnregisteredAsset {
  return {
    id: 1,
    unregistered_code: 'UN-001',
    scenario_type: 's1_no_record',
    discovery_date: '2025-01-01',
    discovery_location: '机房',
    asset_name: '服务器',
    approval_status: 'pending',
    created_at: '2025-01-01T00:00:00+08:00',
    updated_at: '2025-01-01T00:00:00+08:00',
  }
}

function findOnClick(node: unknown): (() => void) | undefined {
  if (!node || typeof node !== 'object') return undefined
  const vnode = node as Record<string, any>
  if (typeof vnode.props?.onClick === 'function') return vnode.props.onClick
  if (Array.isArray(vnode.children)) {
    for (const child of vnode.children) {
      const onClick = findOnClick(child)
      if (onClick) return onClick
    }
  }
  return undefined
}

async function clickFirstHandleType() {
  await vi.waitFor(() => {
    expect(captured).toBeTruthy()
  })
  const onClick = findOnClick(captured.message)
  expect(onClick).toBeTruthy()
  onClick!()
}

function setup() {
  const detailData = ref<UnregisteredAsset | null>(makeDetail())
  const store = { setRefreshFlag: vi.fn() }
  const api = { approveUnregisteredAsset: vi.fn(async () => undefined) }
  const loadDetail = vi.fn(async () => undefined)
  const { handleApprove, handleReject } = useUnregisteredApproval({
    detailData,
    store,
    api,
    loadDetail,
  })
  return { detailData, store, api, loadDetail, handleApprove, handleReject }
}

beforeEach(() => {
  vi.clearAllMocks()
  captured = undefined
  mocks.elMessageBox.mockReset()
  mocks.elMessageBox.mockImplementation((opts: any) => {
    captured = opts
    return new Promise(() => {})
  })
  mocks.elMessageBox.prompt.mockReset()
  mocks.elMessageBox.prompt.mockResolvedValue({ value: '' })
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

describe('useUnregisteredApproval', () => {
  it('详情为空时审批直接返回', async () => {
    const { detailData, handleApprove, api } = setup()
    detailData.value = null
    await handleApprove()
    expect(api.approveUnregisteredAsset).not.toHaveBeenCalled()
    expect(mocks.elMessageBox).not.toHaveBeenCalled()
  })

  it('审批成功路径调用 API 并刷新详情与列表标记', async () => {
    const { handleApprove, api, store, loadDetail } = setup()
    const pending = handleApprove()
    await clickFirstHandleType()
    await pending
    expect(api.approveUnregisteredAsset).toHaveBeenCalledWith('UN-001', {
      handle_type: HandleType.CREATE_AND_RECYCLE,
      approval_remark: '审批通过',
    })
    expect(mocks.elMessage.success).toHaveBeenCalledWith('审批通过')
    expect(loadDetail).toHaveBeenCalledWith('UN-001')
    expect(store.setRefreshFlag).toHaveBeenCalledWith(true)
  })

  it('关闭处理类型弹窗时返回 null 并中止审批', async () => {
    const { handleApprove, api } = setup()
    const pending = handleApprove()
    await vi.waitFor(() => {
      expect(captured).toBeTruthy()
    })
    captured.beforeClose('cancel', undefined, vi.fn())
    await pending
    expect(api.approveUnregisteredAsset).not.toHaveBeenCalled()
    expect(mocks.elMessage.success).not.toHaveBeenCalled()
  })

  it('处理类型弹窗被取消时返回 null 并中止审批', async () => {
    mocks.elMessageBox.mockRejectedValue('cancel')
    const { handleApprove, api } = setup()
    await handleApprove()
    expect(api.approveUnregisteredAsset).not.toHaveBeenCalled()
  })

  it('审批接口异常时提示错误', async () => {
    const { handleApprove, api, loadDetail, store } = setup()
    api.approveUnregisteredAsset.mockRejectedValueOnce(new Error('boom'))
    const pending = handleApprove()
    await clickFirstHandleType()
    await pending
    expect(mocks.elMessage.error).toHaveBeenCalledWith('审批操作失败，请重试')
    expect(loadDetail).not.toHaveBeenCalled()
    expect(store.setRefreshFlag).not.toHaveBeenCalled()
  })

  it('详情为空时拒绝直接返回', async () => {
    const { detailData, handleReject, api } = setup()
    detailData.value = null
    await handleReject()
    expect(mocks.elMessageBox.prompt).not.toHaveBeenCalled()
    expect(api.approveUnregisteredAsset).not.toHaveBeenCalled()
  })

  it('拒绝审批成功后使用填写的原因', async () => {
    const { handleReject, api, store, loadDetail } = setup()
    mocks.elMessageBox.prompt.mockResolvedValueOnce({ value: '不再使用' })
    await handleReject()
    expect(api.approveUnregisteredAsset).toHaveBeenCalledWith('UN-001', {
      handle_type: HandleType.REJECT,
      approval_remark: '不再使用',
    })
    expect(mocks.elMessage.success).toHaveBeenCalledWith('已拒绝')
    expect(loadDetail).toHaveBeenCalledWith('UN-001')
    expect(store.setRefreshFlag).toHaveBeenCalledWith(true)
  })

  it('拒绝原因为空时回退为审批拒绝', async () => {
    const { handleReject, api } = setup()
    mocks.elMessageBox.prompt.mockResolvedValueOnce({ value: '' })
    await handleReject()
    expect(api.approveUnregisteredAsset).toHaveBeenCalledWith('UN-001', {
      handle_type: HandleType.REJECT,
      approval_remark: '审批拒绝',
    })
  })

  it('拒绝弹窗点击取消时静默返回', async () => {
    const { handleReject, api } = setup()
    mocks.elMessageBox.prompt.mockRejectedValueOnce('cancel')
    await handleReject()
    expect(api.approveUnregisteredAsset).not.toHaveBeenCalled()
    expect(mocks.elMessage.error).not.toHaveBeenCalled()
  })

  it('拒绝弹窗关闭时静默返回', async () => {
    const { handleReject, api } = setup()
    mocks.elMessageBox.prompt.mockRejectedValueOnce('close')
    await handleReject()
    expect(api.approveUnregisteredAsset).not.toHaveBeenCalled()
    expect(mocks.elMessage.error).not.toHaveBeenCalled()
  })

  it('拒绝接口异常时提示错误', async () => {
    const { handleReject, api } = setup()
    api.approveUnregisteredAsset.mockRejectedValueOnce(new Error('boom'))
    await handleReject()
    expect(mocks.elMessage.error).toHaveBeenCalledWith('拒绝操作失败，请重试')
  })
})
