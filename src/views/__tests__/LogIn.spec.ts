/**
 * @file LogIn 回归测试（CT-4 回归屏障）
 *
 * 背景（I-3）：用户名 el-form-item 的 prop="username" 与 loginRules 的键
 * auth_username 不匹配（LogIn.vue:28 vs :197），el-form 按 prop 查 rules 落空，
 * 用户名校验器整体不触发（密码 prop="password" 恰好同名所以活着）。
 *
 * 测试策略：Element Plus async-validator 校验链在 JSDOM 环境下不可靠（provide/inject
 * 与内部事件监听依赖真实 DOM 行为），故采用双层验证：
 * ① prop 绑定验证：断言 el-form-item 的 prop 与 loginRules 键一致（修复点）；
 * ② 校验器独立验证：经 vm 取 loginRules 内校验器函数直接调用，验证规则逻辑。
 * 两层合起来证明：prop 对齐后，el-form 能按 prop 找到 rules 并执行校验器。
 */
import { mount, flushPromises } from '@vue/test-utils'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ElForm, ElFormItem, ElInput } from 'element-plus'

const { pushMock, replaceMock, initAuthStateMock, loginMock } = vi.hoisted(() => ({
  pushMock: vi.fn(),
  replaceMock: vi.fn(),
  initAuthStateMock: vi.fn().mockResolvedValue(undefined),
  loginMock: vi.fn(),
}))

vi.mock('vue-router', () => ({
  useRoute: () => ({ query: {} }),
  useRouter: () => ({ push: pushMock, replace: replaceMock }),
}))

vi.mock('@/stores/auth', () => ({
  useAuthStore: () => ({
    initAuthState: initAuthStateMock,
    login: loginMock,
    isLoggedIn: false,
    access_token: null,
    authInfo: null,
  }),
}))

vi.mock('@/stores/app', () => ({
  useAppStore: () => ({
    setLoading: vi.fn(),
    setPageTitle: vi.fn(),
  }),
}))

vi.mock('@/stores', () => ({
  useNetworkStore: () => ({
    testConnection: vi.fn().mockResolvedValue({ status: 'success' }),
    testLoginAPI: vi.fn().mockResolvedValue({ status: 'success' }),
  }),
}))

import LogIn from '../LogIn.vue'

const stubs = {
  'el-card': {
    template: '<div class="el-card"><slot name="header" /><slot /></div>',
  },
  'el-button': {
    name: 'ElButton',
    props: ['type', 'loading', 'icon'],
    template:
      '<button class="el-button" :disabled="loading" @click="$emit(\'click\')"><slot /></button>',
    emits: ['click'],
  },
  'el-checkbox': {
    name: 'ElCheckbox',
    modelValue: Boolean,
    template: '<label class="el-checkbox"><slot /></label>',
    emits: ['update:modelValue'],
  },
  'el-row': { template: '<div class="el-row"><slot /></div>', props: ['justify', 'align'] },
  'el-col': { template: '<div class="el-col"><slot /></div>', props: ['span'] },
  'el-alert': {
    template: '<div class="el-alert">{{ title }}</div>',
    props: ['title', 'type', 'showIcon', 'closable'],
    emits: ['close'],
  },
  'el-icon': { template: '<span class="el-icon"><slot /></span>' },
}

const mountLogin = () =>
  mount(LogIn, {
    global: {
      components: { ElForm, ElFormItem, ElInput },
      stubs,
    },
  })

/** 从组件 vm 取 loginRules 内的校验器（script setup 顶层绑定经 vm 暴露） */
type ValidatorFn = (rule: unknown, value: string, callback: (error?: Error) => void) => void
function getValidator(wrapper: ReturnType<typeof mountLogin>, key: string): ValidatorFn {
  const rules = (
    wrapper.vm as unknown as {
      loginRules: Record<string, { validator: ValidatorFn }[]>
    }
  ).loginRules
  return rules[key][0].validator
}

function runValidator(validator: ValidatorFn, value: string): Error | undefined {
  let error: Error | undefined
  validator({}, value, (e) => {
    error = e
  })
  return error
}

describe('LogIn', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    initAuthStateMock.mockResolvedValue(undefined)
  })

  describe('I-3 回归：用户名 prop 与 rules 键对齐', () => {
    it('用户名 el-form-item 的 prop 为 auth_username（与 loginRules 键一致）', async () => {
      const wrapper = mountLogin()
      await flushPromises()

      const usernameItem = wrapper
        .findAllComponents(ElFormItem)
        .find((fi) => fi.props('label') === '用户名')
      expect(usernameItem).toBeTruthy()
      expect(usernameItem!.props('prop')).toBe('auth_username')
    })

    it('密码 el-form-item 的 prop 保持 password（未受修复影响）', async () => {
      const wrapper = mountLogin()
      await flushPromises()

      const passwordItem = wrapper
        .findAllComponents(ElFormItem)
        .find((fi) => fi.props('label') === '密码')
      expect(passwordItem).toBeTruthy()
      expect(passwordItem!.props('prop')).toBe('password')
    })

    it('loginRules 键为 auth_username 且含校验器', async () => {
      const wrapper = mountLogin()
      await flushPromises()

      const rules = (wrapper.vm as unknown as { loginRules: Record<string, unknown[]> }).loginRules
      expect(rules.auth_username).toBeDefined()
      expect(Array.isArray(rules.auth_username)).toBe(true)
      expect(rules.auth_username.length).toBeGreaterThan(0)
    })
  })

  describe('用户名校验器 validateUsername 规则验证', () => {
    it('空值触发「请输入用户名」', async () => {
      const wrapper = mountLogin()
      await flushPromises()

      const error = runValidator(getValidator(wrapper, 'auth_username'), '')
      expect(error?.message).toBe('请输入用户名')
    })

    it('长度不足 3 触发「用户名长度不能少于3个字符」', async () => {
      const wrapper = mountLogin()
      await flushPromises()

      const error = runValidator(getValidator(wrapper, 'auth_username'), 'ab')
      expect(error?.message).toBe('用户名长度不能少于3个字符')
    })

    it('长度超过 20 触发「用户名长度不能超过20个字符」', async () => {
      const wrapper = mountLogin()
      await flushPromises()

      const error = runValidator(getValidator(wrapper, 'auth_username'), 'a'.repeat(21))
      expect(error?.message).toBe('用户名长度不能超过20个字符')
    })

    it('含非法字符触发「用户名只能包含字母、数字和下划线」', async () => {
      const wrapper = mountLogin()
      await flushPromises()

      const error = runValidator(getValidator(wrapper, 'auth_username'), 'user@name')
      expect(error?.message).toBe('用户名只能包含字母、数字和下划线')
    })

    it('合法用户名通过校验（callback 无 error）', async () => {
      const wrapper = mountLogin()
      await flushPromises()

      const error = runValidator(getValidator(wrapper, 'auth_username'), 'valid_user_01')
      expect(error).toBeUndefined()
    })
  })

  describe('密码校验器 validatePassword 规则验证（回归确认未受影响）', () => {
    it('长度不足 6 触发「密码长度不能少于6位」', async () => {
      const wrapper = mountLogin()
      await flushPromises()

      const error = runValidator(getValidator(wrapper, 'password'), 'ab')
      expect(error?.message).toBe('密码长度不能少于6位')
    })

    it('合法密码通过校验', async () => {
      const wrapper = mountLogin()
      await flushPromises()

      const error = runValidator(getValidator(wrapper, 'password'), 'Passw0rd')
      expect(error).toBeUndefined()
    })
  })
})
