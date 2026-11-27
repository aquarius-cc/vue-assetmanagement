import { defineComponent, h, ref } from 'vue'
import { mount, flushPromises } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { useTableLayoutFallback, type RelayoutTarget } from '../useTableLayoutFallback'

const mountHost = (setup: () => Record<string, unknown>, errorHandler = vi.fn()) => {
  const Host = defineComponent({ setup, render: () => h('div') })
  return { wrapper: mount(Host, { global: { config: { errorHandler } } }), errorHandler }
}

describe('useTableLayoutFallback', () => {
  it('无 onReady 时挂载后在 nextTick 后调用 doLayout 一次', async () => {
    const doLayout = vi.fn()
    const { errorHandler } = mountHost(() => {
      const tableRef = ref<RelayoutTarget | null>({ doLayout })
      useTableLayoutFallback(tableRef)
      return {}
    })

    await flushPromises()

    expect(doLayout).toHaveBeenCalledTimes(1)
    expect(errorHandler).not.toHaveBeenCalled()
  })

  it('有 onReady 时先执行 onReady 再重排', async () => {
    const calls: string[] = []
    const doLayout = vi.fn(() => calls.push('doLayout'))
    const onReady = vi.fn(async () => {
      calls.push('onReady')
    })
    const { errorHandler } = mountHost(() => {
      const tableRef = ref<RelayoutTarget | null>({ doLayout })
      useTableLayoutFallback(tableRef, onReady)
      return {}
    })

    await flushPromises()

    expect(onReady).toHaveBeenCalledTimes(1)
    expect(calls).toEqual(['onReady', 'doLayout'])
    expect(errorHandler).not.toHaveBeenCalled()
  })

  it('onReady 抛错时 finally 仍重排，错误经 app errorHandler 上抛', async () => {
    const error = new Error('load failed')
    const doLayout = vi.fn()
    const onReady = vi.fn(async () => {
      throw error
    })
    const { errorHandler } = mountHost(() => {
      const tableRef = ref<RelayoutTarget | null>({ doLayout })
      useTableLayoutFallback(tableRef, onReady)
      return {}
    })

    await flushPromises()

    expect(doLayout).toHaveBeenCalledTimes(1)
    expect(errorHandler).toHaveBeenCalledTimes(1)
    expect(errorHandler.mock.calls[0][0]).toBe(error)
  })

  it('tableRef 为 null 时不调用重排也不抛错', async () => {
    const { errorHandler } = mountHost(() => {
      const tableRef = ref<RelayoutTarget | null>(null)
      useTableLayoutFallback(tableRef)
      return {}
    })

    await flushPromises()

    expect(errorHandler).not.toHaveBeenCalled()
  })

  it('doLayout 方法缺失时不抛错', async () => {
    const { errorHandler } = mountHost(() => {
      const tableRef = ref<RelayoutTarget | null>({})
      useTableLayoutFallback(tableRef)
      return {}
    })

    await flushPromises()

    expect(errorHandler).not.toHaveBeenCalled()
  })
})
