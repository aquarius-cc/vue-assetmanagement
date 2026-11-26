/**
 * [批次 5 M-FE-02] AssetTypeChildList 批删防重 prop 用例。
 * batchDeleting=true 时批量删除按钮 loading（禁连点），false 时恢复正常。
 */
import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'
import AssetTypeChildList from '../AssetTypeChildList.vue'
import type { AssetType } from '@/types/assettype'

const children: AssetType[] = [{ type_code: 'T01', type_name: '硬件', level: 2 } as AssetType]

function mountList(batchDeleting?: boolean) {
  return mount(AssetTypeChildList, {
    props: { children, batchDeleting },
    global: {
      stubs: {
        'el-card': { template: '<div><slot /><slot name="header" /></div>' },
        'el-table': { template: '<div><slot /></div>' },
        'el-table-column': { template: '<div><slot /></div>' },
        'el-button': {
          template: '<button :data-loading="String(loading ?? false)"><slot /></button>',
          props: ['disabled', 'loading'],
        },
        'el-icon': { template: '<i />' },
      },
    },
  })
}

describe('AssetTypeChildList 批删防重（M-FE-02）', () => {
  it('batchDeleting=true 时批删按钮 loading，false 时恢复', async () => {
    const wrapper = mountList(false)
    const button = wrapper.findAll('button').find((b) => b.text().includes('批量删除'))
    expect(button).toBeDefined()
    expect(button!.attributes('data-loading')).toBe('false')

    await wrapper.setProps({ batchDeleting: true })
    expect(button!.attributes('data-loading')).toBe('true')

    await wrapper.setProps({ batchDeleting: false })
    expect(button!.attributes('data-loading')).toBe('false')
  })
})
