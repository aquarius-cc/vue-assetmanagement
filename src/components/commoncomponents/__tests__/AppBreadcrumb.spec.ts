import { describe, it, expect, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createMemoryHistory, type RouteRecordRaw } from 'vue-router'
import { createPinia, setActivePinia } from 'pinia'
import { ElBreadcrumb, ElBreadcrumbItem } from 'element-plus'
import AppBreadcrumb from '../AppBreadcrumb.vue'
import { useAppStore } from '@/stores/app'

// 路由结构模拟 MainView 场景：Dashboard（无 showPageHeader）/ 列表页（有）
const routes: RouteRecordRaw[] = [
  { path: '/', name: 'Dashboard', component: { template: '<div/>' }, meta: { title: '仪表盘' } },
  {
    path: '/main',
    name: 'Main',
    component: { template: '<router-view/>' },
    children: [
      {
        path: 'assetdetails',
        name: 'AssetDetails',
        component: { template: '<router-view/>' },
        meta: { title: '资产管理', showPageHeader: true },
        children: [
          {
            path: ':asset_code?',
            name: 'AssetContentDetails',
            component: { template: '<div/>' },
            meta: { title: '资产详情', componentName: 'AssetContentDetails' },
          },
        ],
      },
    ],
  },
]

const makeRouter = () =>
  createRouter({ history: createMemoryHistory(), routes })

describe('AppBreadcrumb', () => {
  let router = makeRouter()

  beforeEach(async () => {
    setActivePinia(createPinia())
    router = makeRouter()
    await router.push('/main/assetdetails/')
    await router.isReady()
    // afterEach 守卫在 guards.ts 中注册；单测内手动模拟其写入
    const appStore = useAppStore()
    appStore.setBreadcrumbs([
      { name: '资产管理', path: '/main/assetdetails/' },
      { name: '资产详情', path: '/main/assetdetails/' },
    ])
  })

  it('双条件成立时渲染：showPageHeader && showBreadcrumbs', async () => {
    const wrapper = mount(AppBreadcrumb, {
      global: { plugins: [router], components: { ElBreadcrumb, ElBreadcrumbItem } },
    })
    await flushPromises()
    expect(wrapper.find('.app-breadcrumb').exists()).toBe(true)
    expect(wrapper.findAll('.el-breadcrumb__item').length).toBe(2)
  })

  it('末项纯文本：无链接 anchor', async () => {
    const wrapper = mount(AppBreadcrumb, {
      global: { plugins: [router], components: { ElBreadcrumb, ElBreadcrumbItem } },
    })
    await flushPromises()
    const items = wrapper.findAll('.el-breadcrumb__item')
    // 末项（资产详情）不应可点击：EP 对带 :to 的项渲染 .is-link（router 形态），非 <a>
    const lastLink = items[items.length - 1].find('.is-link')
    expect(lastLink.exists()).toBe(false)
  })

  it('非末项且有 path 时渲染为链接', async () => {
    const wrapper = mount(AppBreadcrumb, {
      global: { plugins: [router], components: { ElBreadcrumb, ElBreadcrumbItem } },
    })
    await flushPromises()
    const firstLink = wrapper.findAll('.el-breadcrumb__item')[0].find('.is-link')
    expect(firstLink.exists()).toBe(true)
  })

  it('面包屑为空数组时不渲染空壳', async () => {
    const appStore = useAppStore()
    appStore.setBreadcrumbs([])
    const wrapper = mount(AppBreadcrumb, {
      global: { plugins: [router], components: { ElBreadcrumb, ElBreadcrumbItem } },
    })
    await flushPromises()
    expect(wrapper.find('.app-breadcrumb').exists()).toBe(false)
  })
})
