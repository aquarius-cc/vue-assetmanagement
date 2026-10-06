import { describe, it, expect } from 'vitest'
import { createRouter, createMemoryHistory } from 'vue-router'
import { defineComponent } from 'vue'
import { routesMainCore } from '../routes-main-core'

/**
 * 【L-1】静态段优先于动态段的解析锁定。index.spec.ts 走 vi.mock('vue-router')，
 * 无法做真实 resolve；本文件用实时 vue-router + 真实 routesMainCore 构建路由，
 * 断言 `/main/assetdetails/grouped` 命中 `AssetGroupedContent` 而非 `:asset_code?`。
 * resolve() 只做匹配、不触发懒加载组件，故无需真实 mount。
 */
const Dummy = defineComponent({ render: () => null })

const routes = [
  { path: '/login', name: 'Login', component: Dummy },
  {
    path: '/main',
    name: 'Main',
    component: Dummy,
    children: [...routesMainCore],
  },
]

describe('Route resolution: /main/assetdetails/grouped', () => {
  it('resolves to AssetGroupedContent (static segment beats :asset_code?)', () => {
    const router = createRouter({ history: createMemoryHistory(), routes })
    const resolved = router.resolve('/main/assetdetails/grouped')
    const leaf = resolved.matched[resolved.matched.length - 1]
    expect(leaf.name).toBe('AssetGroupedContent')
    expect(leaf.meta.enableGrouping).toBeUndefined()
    // vue-router 把静态 props 归一化为嵌套视图形态 { default: {...} }
    expect(leaf.props).toEqual({ default: { enableGrouping: true } })
    expect(resolved.path).toBe('/main/assetdetails/grouped')
  })

  it('keeps :asset_code? handler for ordinary recordcodes', () => {
    const router = createRouter({ history: createMemoryHistory(), routes })
    const resolved = router.resolve('/main/assetdetails/RC-1001')
    const leaf = resolved.matched[resolved.matched.length - 1]
    expect(leaf.name).toBe('AssetContentDetails')
    expect((resolved.params.asset_code as string) ?? '').toBe('RC-1001')
  })
})
