import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAppStore } from '../app'

describe('AppStore', () => {
  let store: ReturnType<typeof useAppStore>

  const localStorageMock = (() => {
    let store: Record<string, string> = {}
    return {
      getItem: vi.fn((key: string) => store[key] ?? null),
      setItem: vi.fn((key: string, value: string) => {
        store[key] = value
      }),
      removeItem: vi.fn((key: string) => {
        delete store[key]
      }),
      clear: vi.fn(() => {
        store = {}
      }),
    }
  })()

  beforeEach(() => {
    Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock, writable: true })
    Object.defineProperty(document, 'title', { writable: true, value: '' })
    document.documentElement.classList.toggle = vi.fn(() => false)
    document.documentElement.style.setProperty = vi.fn()

    const pinia = createPinia()
    setActivePinia(pinia)
    store = useAppStore()
    vi.clearAllMocks()
  })

  describe('初始状态', () => {
    it('应该具有默认值', () => {
      expect(store.loading).toBe(false)
      expect(store.sidebarCollapsed).toBe(false)
      expect(store.breadcrumbs).toEqual([])
      expect(store.pageTitle).toBe('资产管理系统')
      expect(store.theme).toBe('light')
    })
  })

  describe('setLoading', () => {
    it('应该设置 loading 为 true', () => {
      store.setLoading(true)
      expect(store.loading).toBe(true)
    })

    it('应该设置 loading 为 false', () => {
      store.setLoading(true)
      store.setLoading(false)
      expect(store.loading).toBe(false)
    })
  })

  describe('toggleSidebar', () => {
    it('应该切换侧边栏状态', () => {
      expect(store.sidebarCollapsed).toBe(false)
      store.toggleSidebar()
      expect(store.sidebarCollapsed).toBe(true)
      store.toggleSidebar()
      expect(store.sidebarCollapsed).toBe(false)
    })

    it('应该保存状态到 localStorage', () => {
      store.toggleSidebar()
      expect(localStorageMock.setItem).toHaveBeenCalledWith('sidebarCollapsed', 'true')
    })
  })

  describe('setPageTitle', () => {
    it('应该更新页面标题', () => {
      store.setPageTitle('用户管理')
      expect(store.pageTitle).toBe('用户管理')
    })

    it('应该更新 document.title', () => {
      store.setPageTitle('用户管理')
      expect(document.title).toBe('用户管理 - 资产管理系统')
    })
  })

  describe('setBreadcrumbs', () => {
    it('应该设置面包屑导航', () => {
      const crumbs = [{ name: '首页', path: '/' }, { name: '资产管理' }]
      store.setBreadcrumbs(crumbs)
      expect(store.breadcrumbs).toEqual(crumbs)
    })

    it('应该支持空面包屑', () => {
      store.setBreadcrumbs([{ name: '首页' }])
      store.setBreadcrumbs([])
      expect(store.breadcrumbs).toEqual([])
    })
  })

  describe('setTheme', () => {
    it('应该切换主题', () => {
      store.setTheme('dark')
      expect(store.theme).toBe('dark')
    })

    it('应该保存主题到 localStorage', () => {
      store.setTheme('dark')
      expect(localStorageMock.setItem).toHaveBeenCalledWith('theme', 'dark')
    })

    it('应该操作 documentElement 的 classList', () => {
      store.setTheme('dark')
      expect(document.documentElement.classList.toggle).toHaveBeenCalledWith('dark', true)

      vi.mocked(document.documentElement.classList.toggle).mockReturnValue(
        false as unknown as DOMTokenList,
      )
      store.setTheme('light')
      expect(document.documentElement.classList.toggle).toHaveBeenCalledWith('dark', false)
    })
  })

  describe('initAppState', () => {
    it('应该从 localStorage 恢复侧边栏状态', () => {
      localStorageMock.getItem.mockImplementation((key: string) => {
        if (key === 'sidebarCollapsed') return 'true'
        return null
      })
      store.initAppState()
      expect(store.sidebarCollapsed).toBe(true)
    })

    it('应该从 localStorage 恢复主题', () => {
      localStorageMock.getItem.mockImplementation((key: string) => {
        if (key === 'theme') return 'dark'
        return null
      })
      store.initAppState()
      expect(store.theme).toBe('dark')
    })

    it('应该从 localStorage 恢复主色调', () => {
      localStorageMock.getItem.mockImplementation((key: string) => {
        if (key === 'primaryColor') return '#FF0000'
        return null
      })
      store.initAppState()
      expect(store.primaryColor).toBe('#FF0000')
      expect(document.documentElement.style.setProperty).toHaveBeenCalledWith(
        '--el-color-primary',
        '#FF0000',
      )
    })

    it('应该从 localStorage 恢复应用设置', () => {
      const savedSettings = JSON.stringify({ pageSize: 50, language: 'en-US' })
      localStorageMock.getItem.mockImplementation((key: string) => {
        if (key === 'appSettings') return savedSettings
        return null
      })
      store.initAppState()
      expect(store.settings.pageSize).toBe(50)
      expect(store.settings.language).toBe('en-US')
      expect(store.settings.showBreadcrumbs).toBe(true)
    })

    it('应该处理 localStorage 中无效的 JSON', () => {
      localStorageMock.getItem.mockImplementation((key: string) => {
        if (key === 'appSettings') return 'invalid-json'
        return null
      })
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      store.initAppState()
      expect(consoleSpy).toHaveBeenCalled()
      consoleSpy.mockRestore()
    })
  })

  describe('补充 action', () => {
    it('setSidebarCollapsed 设置并保存状态', () => {
      store.setSidebarCollapsed(true)
      expect(store.sidebarCollapsed).toBe(true)
      expect(localStorageMock.setItem).toHaveBeenCalledWith('sidebarCollapsed', 'true')
    })

    it('setPrimaryColor 设置颜色并保存 CSS 变量', () => {
      store.setPrimaryColor('#123456')
      expect(store.primaryColor).toBe('#123456')
      expect(localStorageMock.setItem).toHaveBeenCalledWith('primaryColor', '#123456')
      expect(document.documentElement.style.setProperty).toHaveBeenCalledWith(
        '--el-color-primary',
        '#123456',
      )
    })

    it('resetAppState 重置全部状态并清理存储', () => {
      store.setSidebarCollapsed(true)
      store.setPageTitle('测试页')
      store.setTheme('dark')
      store.setBreadcrumbs([{ name: '首页' }])

      store.resetAppState()

      expect(store.loading).toBe(false)
      expect(store.sidebarCollapsed).toBe(false)
      expect(store.breadcrumbs).toEqual([])
      expect(store.pageTitle).toBe('资产管理系统')
      expect(store.theme).toBe('light')
      expect(store.primaryColor).toBe('#2B5FD7')
      expect(store.settings.pageSize).toBe(20)
      for (const key of ['sidebarCollapsed', 'theme', 'primaryColor', 'appSettings']) {
        expect(localStorageMock.removeItem).toHaveBeenCalledWith(key)
      }
    })

    it('updateSettings 合并并保存设置', () => {
      store.updateSettings({ pageSize: 50, language: 'en-US' })
      expect(store.settings.pageSize).toBe(50)
      expect(store.settings.language).toBe('en-US')
      expect(store.settings.showBreadcrumbs).toBe(true)
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'appSettings',
        JSON.stringify(store.settings),
      )
    })
  })
})
