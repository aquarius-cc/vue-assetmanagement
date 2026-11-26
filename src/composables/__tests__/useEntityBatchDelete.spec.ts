/**
 * useEntityBatchDelete 单元测试（批次 5 M-FE-02）
 * 覆盖：预检（空选择/缺 id/静默配置）、confirm 前 guard 置位、取消值集合、
 * 成功顺序（removeBatch → onSuccess → clearSelection → refresh）、失败出口、
 * 双击防重（confirm 仅 1 次）、guard 复位（异常/取消双路径）。
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mocks = vi.hoisted(() => ({
  confirm: vi.fn(),
  message: { success: vi.fn(), warning: vi.fn(), error: vi.fn(), info: vi.fn() },
  logError: vi.fn(),
  notifyCallerError: vi.fn(),
}))

vi.mock('element-plus', () => ({
  ElMessage: mocks.message,
  ElMessageBox: { confirm: mocks.confirm },
}))

vi.mock('@/utils/logger', () => ({ logError: mocks.logError }))

vi.mock('@/utils/errorHandler', () => ({ notifyCallerError: mocks.notifyCallerError }))

import { useEntityBatchDelete } from '../useEntityBatchDelete'

interface Row {
  code?: string
}

const makeRows = (codes: (string | undefined)[]): Row[] => codes.map((code) => ({ code }))

/** 构建标准配置：getIds 取 code 键，removeBatch/refresh/clearSelection 均为 mock */
function makeConfig(overrides: Record<string, unknown> = {}) {
  const calls: string[] = []
  const removeBatch = vi.fn(async (ids: string[]) => {
    calls.push(`removeBatch:${ids.join(',')}`)
    return { ok: true }
  })
  const clearSelection = vi.fn(() => {
    calls.push('clearSelection')
  })
  const refresh = vi.fn(async () => {
    calls.push('refresh')
  })
  const onSuccess = vi.fn(async () => {
    calls.push('onSuccess')
  })
  const config = {
    getIds: (rows: Row[]) => rows.map((r) => r.code).filter((c): c is string => !!c),
    removeBatch,
    clearSelection,
    refresh,
    onSuccess,
    ...overrides,
  }
  return { config, calls, removeBatch, clearSelection, refresh, onSuccess }
}

/** 制造 pending 的 confirm Promise（双击场景：第二次调用发生在 confirm 未决时） */
function makePendingConfirm(): { resolve: () => void; reject: (v: unknown) => void } {
  let resolve!: () => void
  let reject!: (v: unknown) => void
  mocks.confirm.mockReturnValueOnce(
    new Promise<void>((res, rej) => {
      resolve = res
      reject = rej
    }),
  )
  return { resolve, reject }
}

describe('useEntityBatchDelete', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.confirm.mockResolvedValue('confirm')
  })

  it('空选择（undefined）：提示且不调用 removeBatch', async () => {
    const { config, removeBatch } = makeConfig()
    const { handleBatchDelete } = useEntityBatchDelete(config)

    await handleBatchDelete(undefined)

    expect(mocks.message.warning).toHaveBeenCalledWith('请先选择要删除的数据')
    expect(removeBatch).not.toHaveBeenCalled()
    expect(mocks.confirm).not.toHaveBeenCalled()
  })

  it('空选择（空数组）：同上', async () => {
    const { config, removeBatch } = makeConfig()
    const { handleBatchDelete } = useEntityBatchDelete(config)

    await handleBatchDelete([])

    expect(mocks.message.warning).toHaveBeenCalledTimes(1)
    expect(removeBatch).not.toHaveBeenCalled()
  })

  it('emptySelectionMessage=null：静默返回不弹提示（AssetTypeDetails 现状）', async () => {
    const { config, removeBatch } = makeConfig({ emptySelectionMessage: null })
    const { handleBatchDelete } = useEntityBatchDelete(config)

    await handleBatchDelete([])

    expect(mocks.message.warning).not.toHaveBeenCalled()
    expect(mocks.message.error).not.toHaveBeenCalled()
    expect(removeBatch).not.toHaveBeenCalled()
  })

  it('全部缺标识：报错且不进入 confirm', async () => {
    const { config, removeBatch } = makeConfig()
    const { handleBatchDelete } = useEntityBatchDelete(config)

    await handleBatchDelete(makeRows([undefined, undefined]))

    expect(mocks.message.error).toHaveBeenCalledWith('无法删除：选中的数据缺少唯一标识')
    expect(mocks.confirm).not.toHaveBeenCalled()
    expect(removeBatch).not.toHaveBeenCalled()
  })

  it('missingIdMessage=null：空标识也放行（AssetTypeDetails 现状）', async () => {
    const { config, removeBatch } = makeConfig({ missingIdMessage: null })
    const { handleBatchDelete } = useEntityBatchDelete(config)

    await handleBatchDelete(makeRows([undefined]))

    expect(mocks.message.error).not.toHaveBeenCalled()
    expect(mocks.confirm).toHaveBeenCalledTimes(1)
    expect(removeBatch).toHaveBeenCalledWith([])
  })

  it('自定义预检文案透传', async () => {
    const { config } = makeConfig({
      emptySelectionMessage: '请先选择要删除的数据',
      missingIdMessage: '记录编码缺失，无法删除',
    })
    const { handleBatchDelete } = useEntityBatchDelete(config)

    await handleBatchDelete(undefined)
    await handleBatchDelete(makeRows([undefined]))

    expect(mocks.message.warning).toHaveBeenCalledWith('请先选择要删除的数据')
    expect(mocks.message.error).toHaveBeenCalledWith('记录编码缺失，无法删除')
  })

  it('确认成功：removeBatch → onSuccess → clearSelection → refresh 严格顺序', async () => {
    const { config, calls, removeBatch } = makeConfig()
    const { handleBatchDelete } = useEntityBatchDelete(config)

    await handleBatchDelete(makeRows(['A', undefined, 'B']))

    expect(removeBatch).toHaveBeenCalledWith(['A', 'B'])
    expect(calls).toEqual(['removeBatch:A,B', 'onSuccess', 'clearSelection', 'refresh'])
  })

  it('onSuccess 异步返回时被 await 后才清空选择与刷新', async () => {
    const { config, calls } = makeConfig()
    const { handleBatchDelete } = useEntityBatchDelete(config)

    await handleBatchDelete(makeRows(['A']))

    // calls 顺序断言即证明 refresh 在 onSuccess 完成后执行
    expect(calls.indexOf('onSuccess')).toBeLessThan(calls.indexOf('refresh'))
  })

  it('取消（cancel）：不调用 removeBatch 且不走错误出口', async () => {
    mocks.confirm.mockRejectedValueOnce('cancel')
    const { config, removeBatch } = makeConfig()
    const { handleBatchDelete } = useEntityBatchDelete(config)

    await handleBatchDelete(makeRows(['A']))

    expect(removeBatch).not.toHaveBeenCalled()
    expect(mocks.message.error).not.toHaveBeenCalled()
    expect(mocks.notifyCallerError).not.toHaveBeenCalled()
  })

  it('cancelValues 自定义：close 同样视为取消', async () => {
    mocks.confirm.mockRejectedValueOnce('close')
    const { config, removeBatch } = makeConfig({ cancelValues: ['cancel', 'close'] })
    const { handleBatchDelete } = useEntityBatchDelete(config)

    await handleBatchDelete(makeRows(['A']))

    expect(removeBatch).not.toHaveBeenCalled()
    expect(mocks.notifyCallerError).not.toHaveBeenCalled()
  })

  it('removeBatch 失败：默认出口 logError + notifyCallerError', async () => {
    const error = new Error('boom')
    const failingRemoveBatch = vi.fn(async () => {
      throw error
    })
    const { config } = makeConfig({
      removeBatch: failingRemoveBatch,
      logTag: 'components/TestDetails',
    })
    const { handleBatchDelete } = useEntityBatchDelete(config)

    await handleBatchDelete(makeRows(['A']))

    expect(failingRemoveBatch).toHaveBeenCalledTimes(1)
    expect(mocks.logError).toHaveBeenCalledWith('components/TestDetails', '批量删除失败:', error)
    expect(mocks.notifyCallerError).toHaveBeenCalledWith(error, '批量删除失败，请重试')
  })

  it('onError 自定义：覆盖默认出口', async () => {
    const error = new Error('boom')
    const onError = vi.fn()
    const { config } = makeConfig({
      removeBatch: vi.fn(async () => {
        throw error
      }),
      onError,
    })
    const { handleBatchDelete } = useEntityBatchDelete(config)

    await handleBatchDelete(makeRows(['A']))

    expect(onError).toHaveBeenCalledWith(error)
    expect(mocks.notifyCallerError).not.toHaveBeenCalled()
  })

  it('双击：confirm 未决期间第二次调用直接返回，confirm/removeBatch 各仅 1 次', async () => {
    const pending = makePendingConfirm()
    const { config, removeBatch } = makeConfig()
    const { handleBatchDelete, isBatchDeleting } = useEntityBatchDelete(config)

    const first = handleBatchDelete(makeRows(['A']))
    await Promise.resolve()
    expect(isBatchDeleting.value).toBe(true)

    await handleBatchDelete(makeRows(['A']))
    expect(mocks.confirm).toHaveBeenCalledTimes(1)

    pending.resolve()
    await first
    expect(removeBatch).toHaveBeenCalledTimes(1)
    expect(isBatchDeleting.value).toBe(false)
  })

  it('guard 复位：取消路径（revision-4 回归屏障）', async () => {
    mocks.confirm.mockRejectedValueOnce('cancel')
    const { config } = makeConfig()
    const { handleBatchDelete, isBatchDeleting } = useEntityBatchDelete(config)

    await handleBatchDelete(makeRows(['A']))

    expect(isBatchDeleting.value).toBe(false)
  })

  it('guard 复位：异常路径', async () => {
    const { config } = makeConfig({
      removeBatch: vi.fn(async () => {
        throw new Error('boom')
      }),
    })
    const { handleBatchDelete, isBatchDeleting } = useEntityBatchDelete(config)

    await handleBatchDelete(makeRows(['A']))

    expect(isBatchDeleting.value).toBe(false)
  })

  it('confirmMessage 自定义文案携带 ids 数量', async () => {
    const { config } = makeConfig({
      confirmMessage: (_rows: Row[], ids: string[]) => `确认删除 ${ids.length} 条？`,
      confirmTitle: '删除确认',
    })
    const { handleBatchDelete } = useEntityBatchDelete(config)

    await handleBatchDelete(makeRows(['A', 'B']))

    expect(mocks.confirm).toHaveBeenCalledWith(
      '确认删除 2 条？',
      '删除确认',
      expect.objectContaining({ type: 'warning' }),
    )
  })
})
