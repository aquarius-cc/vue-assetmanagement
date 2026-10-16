/**
 * @file ContractPaymentRecord 回归测试（M-7 / BF-095）
 *
 * 背景：添加支付弹窗收集了 date/payment_method，但提交载荷只传 amount/description，
 * 两字段被静默丢弃（表单必填校验形同虚设）。本套件锁定修复后行为：
 * ① 提交载荷含 payment_date/payment_method（键名对齐 ContractBatchPaymentRecordItemSerializer）；
 * ② 死代码删除后组件正常挂载渲染（payments ref/loadPayments/loading 已移除）。
 *
 * 环境约束（vitest.config.ts 为独立 plugins:[vue()]，不合并 vite.config.ts）：
 * unplugin-vue-components / ElementPlusResolver 不生效 → 所有 el-* 必须显式 stub。
 */
import { mount, flushPromises } from '@vue/test-utils'
import { describe, it, expect, vi, beforeEach } from 'vitest'

const { elMessageSuccess, elMessageError, addPaymentMock, deletePaymentMock, approvePaymentMock } =
  vi.hoisted(() => ({
    elMessageSuccess: vi.fn(),
    elMessageError: vi.fn(),
    addPaymentMock: vi.fn(),
    deletePaymentMock: vi.fn(),
    approvePaymentMock: vi.fn(),
  }))

vi.mock('element-plus', () => ({
  ElMessage: { success: elMessageSuccess, error: elMessageError },
  ElMessageBox: { confirm: vi.fn(() => Promise.resolve('confirm')) },
}))

vi.mock('@/stores/contractStore', () => ({
  addPaymentRecord: addPaymentMock,
  deletePaymentRecord: deletePaymentMock,
  approvePaymentRecord: approvePaymentMock,
}))

import ContractPaymentRecord from '../ContractPaymentRecord.vue'
import type { Contract } from '@/types/contract'

const CONTRACT = {
  recordcode: 'CT-001',
  contract_amount: 10000,
  amount_paid: 4000,
  amount_unpaid: 6000,
  paid_record: {
    payments: [
      {
        id: 1,
        date: '2026-01-01',
        amount: 4000,
        description: '首付款',
        payment_method: 'bank_transfer',
        operator: '李某',
        status: 'approved',
      },
    ],
  },
} as unknown as Contract

const stubs = {
  'el-card': { template: '<div class="el-card"><slot name="header" /><slot /></div>' },
  'el-row': { template: '<div class="el-row"><slot /></div>' },
  'el-col': { template: '<div class="el-col"><slot /></div>' },
  'el-statistic': { template: '<div class="el-statistic" />', props: ['title', 'value', 'prefix'] },
  'el-progress': { template: '<div class="el-progress" />', props: ['percentage', 'format'] },
  'el-table': {
    name: 'ElTable',
    template: '<div class="el-table"><slot /></div>',
    props: ['data'],
  },
  'el-table-column': {
    // 不渲染默认 slot：组件列模板为 #default="{ row }" 作用域插槽，stub 无 row 上下文会渲染崩溃
    template: '<div class="el-table-column" />',
    props: ['prop', 'label', 'width', 'minWidth', 'fixed'],
  },
  'el-tag': { template: '<span class="el-tag"><slot /></span>', props: ['type', 'size'] },
  'el-dialog': {
    name: 'ElDialog',
    template: '<div class="el-dialog"><slot /><slot name="footer" /></div>',
    props: ['modelValue', 'title', 'width', 'closeOnClickModal'],
  },
  'el-form': {
    name: 'ElForm',
    template: '<form class="el-form"><slot /></form>',
    methods: {
      validate(callback?: (valid: boolean) => void) {
        if (typeof callback === 'function') callback(true)
        return Promise.resolve(true)
      },
    },
  },
  'el-form-item': {
    template: '<div class="el-form-item"><slot /></div>',
    props: ['label', 'prop'],
  },
  'el-date-picker': {
    name: 'ElDatePicker',
    modelValue: String,
    props: ['modelValue', 'type', 'placeholder', 'format', 'value-format', 'style'],
    emits: ['update:modelValue'],
    template:
      '<input class="el-date-picker" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
  },
  'el-input-number': {
    name: 'ElInputNumber',
    modelValue: Number,
    props: ['modelValue', 'min', 'precision', 'placeholder', 'style'],
    emits: ['update:modelValue'],
    template:
      '<input class="el-input-number" type="number" :value="modelValue" @input="$emit(\'update:modelValue\', Number($event.target.value))" />',
  },
  'el-input': {
    name: 'ElInput',
    modelValue: String,
    props: ['modelValue', 'type', 'rows', 'placeholder'],
    emits: ['update:modelValue'],
    template:
      '<textarea class="el-input" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
  },
  'el-select': {
    name: 'ElSelect',
    modelValue: String,
    props: ['modelValue', 'placeholder', 'style'],
    emits: ['update:modelValue'],
    template:
      '<select class="el-select" :value="modelValue" @change="$emit(\'update:modelValue\', $event.target.value)"><slot /></select>',
  },
  'el-option': {
    name: 'ElOption',
    props: ['label', 'value'],
    template: '<option class="el-option" :value="value">{{ label }}</option>',
  },
  'el-button': {
    name: 'ElButton',
    props: ['type', 'size', 'loading', 'disabled'],
    template: '<button class="el-button" @click="$emit(\'click\')"><slot /></button>',
    emits: ['click'],
  },
  'el-icon': { template: '<span class="el-icon"><slot /></span>' },
}

const mountComponent = () =>
  mount(ContractPaymentRecord, {
    props: { contract: CONTRACT },
    global: { stubs, directives: { loading: {} } },
  })

describe('ContractPaymentRecord（M-7 / BF-095）', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    addPaymentMock.mockResolvedValue(undefined)
    deletePaymentMock.mockResolvedValue(undefined)
    approvePaymentMock.mockResolvedValue(undefined)
  })

  it('组件正常挂载渲染（死代码 payments/loadPayments/loading 删除后无回归）', () => {
    const wrapper = mountComponent()
    expect(wrapper.find('.payment-record').exists()).toBe(true)
    expect(wrapper.find('.el-progress').exists()).toBe(true)
  })

  it('提交载荷含 payment_date 与 payment_method，不再丢弃表单字段（M-7 回归屏障）', async () => {
    const wrapper = mountComponent()
    await flushPromises()

    const openBtn = wrapper.findAll('button').find((b) => b.text().includes('添加支付'))
    expect(openBtn).toBeTruthy()
    await openBtn!.trigger('click')
    await flushPromises()

    const dateInput = wrapper.find('.el-date-picker')
    await dateInput.setValue('2026-10-01')
    const amountInput = wrapper.find('.el-input-number')
    await amountInput.setValue(1500)
    const descInput = wrapper.find('textarea.el-input')
    await descInput.setValue('二期款')
    const methodSelect = wrapper.find('select.el-select')
    await methodSelect.setValue('cash')

    const okBtn = wrapper.findAll('button').find((b) => b.text().includes('确定'))
    expect(okBtn).toBeTruthy()
    await okBtn!.trigger('click')
    await flushPromises()

    expect(addPaymentMock).toHaveBeenCalledWith('CT-001', {
      amount: 1500,
      description: '二期款',
      payment_date: '2026-10-01',
      payment_method: 'cash',
    })
    expect(elMessageSuccess).toHaveBeenCalledWith('支付记录添加成功')
  })
})
