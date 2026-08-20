import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import DarkModeToggle from './DarkModeToggle.vue'

// Mock useDarkMode composable
const mockIsDark = ref(false)
const mockToggleDark = vi.fn()

vi.mock('@/composables/useDarkMode', () => ({
  useDarkMode: () => ({
    isDark: mockIsDark,
    toggleDark: mockToggleDark,
  }),
}))

describe('DarkModeToggle', () => {
  beforeEach(() => {
    // Reset DOM
    document.documentElement.classList.remove('dark')
    localStorage.clear()
    // Reset shared mutable state to deterministic baseline
    mockIsDark.value = false
    mockToggleDark.mockClear()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('renders correctly', () => {
    const wrapper = mount(DarkModeToggle)

    expect(wrapper.find('.dark-mode-toggle').exists()).toBe(true)
    expect(wrapper.find('.toggle-icon').exists()).toBe(true)
    expect(wrapper.find('.toggle-text').exists()).toBe(true)
  })

  it('displays correct text based on dark mode state', async () => {
    mockIsDark.value = false

    const wrapper = mount(DarkModeToggle)

    // Light mode - shows "暗色模式" as the target to switch to
    expect(wrapper.find('.toggle-text').text()).toBe('暗色模式')

    // Switch to dark mode
    mockIsDark.value = true
    await wrapper.vm.$nextTick()

    // Dark mode - shows "亮色模式" as the target to switch to
    expect(wrapper.find('.toggle-text').text()).toBe('亮色模式')
  })

  it('calls toggleDark when clicked', async () => {
    mockIsDark.value = false

    const wrapper = mount(DarkModeToggle)

    await wrapper.find('.dark-mode-toggle').trigger('click')

    expect(mockToggleDark).toHaveBeenCalledTimes(1)
  })

  it('hides text when compact prop is true', () => {
    const wrapper = mount(DarkModeToggle, {
      props: {
        compact: true,
      },
    })

    expect(wrapper.find('.toggle-text').exists()).toBe(false)
  })

  it('shows text when compact prop is false', () => {
    const wrapper = mount(DarkModeToggle, {
      props: {
        compact: false,
      },
    })

    expect(wrapper.find('.toggle-text').exists()).toBe(true)
  })

  it('has correct title attribute', () => {
    mockIsDark.value = false

    const wrapper = mount(DarkModeToggle)

    // Light mode - title should be "切换到暗色模式"
    expect(wrapper.attributes('title')).toBe('切换到暗色模式')
  })

  it('applies correct CSS classes', () => {
    const wrapper = mount(DarkModeToggle)

    expect(wrapper.classes()).toContain('dark-mode-toggle')
  })
})
