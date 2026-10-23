/**
 * @file keep-alive 五页组件名与 meta.componentName 匹配静态实证（BF-138 #3 P0-4）
 * @module router/__tests__/keepAliveComponentNames
 * @description include 匹配的是路由层组件 vnode 的 name（无 name 时回退编译期 __name，
 *   即文件名推断，见 routes-main-core.ts BF-079 注释）。若某页两者皆缺，A1 静态 include
 *   下将退化为「永不缓存 + 永不重取」双重坏态——故逐页断言真实组件名 === meta.componentName。
 *   红则补齐该页 defineOptions({ name })（与 A1 同一提交）。
 */
import { describe, it, expect } from 'vitest'
import { routesMainCore } from '@/router/routes-main-core'
import { routesMainSystem } from '@/router/routes-main-system'

type AnyComp = { name?: string; __name?: string }

/** 逐路由静态断言：keepAlive 路由的 meta.componentName 必须命中真实组件名（name 或编译期 __name） */
const assertKeepAliveRoute = async (
  routes: { path: string; meta?: Record<string, unknown>; component?: () => Promise<unknown> }[],
  label: string,
) => {
  const keepAliveRoutes = routes.filter((r) => r.meta?.keepAlive)
  expect(keepAliveRoutes.length, `${label} 应存在 keepAlive 路由`).toBeGreaterThan(0)

  for (const route of keepAliveRoutes) {
    const componentName = route.meta?.componentName as string | undefined
    expect(componentName, `${label} ${route.path} 缺 meta.componentName`).toBeTruthy()

    const loader = route.component
    expect(typeof loader, `${label} ${route.path} 缺 component`).toBe('function')
    const mod = (await loader!()) as { default: AnyComp }
    const comp = mod.default
    const effectiveName = comp.name || comp.__name

    expect(
      effectiveName,
      `${label} ${route.path}: 组件 name/__name 缺失或与 meta.componentName '${componentName}' 不符`,
    ).toBe(componentName)
  }
}

describe('P0-4 keepAlive 五页组件名匹配 meta.componentName（A1 静态 include 前提）', () => {
  // core 段 4 页重型依赖图（SmartListContainer→stores→api 链）首次导入 transform 较慢，
  // 5s 默认超时实测不足（首跑 5027ms 超时），放宽至 30s；Stryker dry-run（15 worker 并行 +
  // coverage 注入）下实测再超 30s（BF-138 T16 补杀轮），提至 90s（仅导入开销，非断言逻辑）
  it('routes-main-core 的 keepAlive 路由全部命中', async () => {
    await assertKeepAliveRoute(routesMainCore as never, 'routes-main-core')
  }, 90000)

  it('routes-main-system 的 keepAlive 路由全部命中', async () => {
    await assertKeepAliveRoute(routesMainSystem as never, 'routes-main-system')
  })
})
