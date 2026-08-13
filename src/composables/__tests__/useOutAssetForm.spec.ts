import { describe, it, expect, vi, beforeEach } from 'vitest'
import { defineComponent } from 'vue'
import { mount } from '@vue/test-utils'
import type { AssetDetail } from '@/types/asset'

const currentQuery: { value: Record<string, string> } = { value: {} }

const {
  mockPush,
  mockBack,
  mockGo,
  mockGetById,
  mockUpdate,
  mockCreate,
  mockSetRefreshFlag,
  mockAssetGetByName,
  mockAssetGetById,
  mockShowError,
  mockGetFuzzySearch,
} = vi.hoisted(() => ({
  mockPush: vi.fn(),
  mockBack: vi.fn(),
  mockGo: vi.fn(),
  mockGetById: vi.fn(async () => null),
  mockUpdate: vi.fn(async () => {}),
  mockCreate: vi.fn(async () => {}),
  mockSetRefreshFlag: vi.fn(),
  mockAssetGetByName: vi.fn(async () => [] as AssetDetail[]),
  mockAssetGetById: vi.fn(async () => null),
  mockShowError: vi.fn(),
  mockGetFuzzySearch: vi.fn(async () => ({ results: [] })),
}))

vi.mock('vue-router', () => ({
  useRoute: () => ({ query: currentQuery.value }),
  useRouter: () => ({ push: mockPush, back: mockBack, go: mockGo }),
}))

vi.mock('element-plus', () => ({
  ElMessage: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}))

vi.mock('@/stores/outAssetStore', () => ({
  useOutAssetStore: () => ({
    getById: mockGetById,
    update: mockUpdate,
    create: mockCreate,
    setRefreshFlag: mockSetRefreshFlag,
  }),
}))

vi.mock('@/stores/assetStore', () => ({
  useAssetStore: () => ({
    getByName: mockAssetGetByName,
    getById: mockAssetGetById,
  }),
}))

vi.mock('@/utils/errorHandler', () => ({
  showErrorMessage: mockShowError,
}))

vi.mock('@/utils/Format', () => ({
  formatDate: (v: string) => v,
}))

vi.mock('@/api/user', () => ({
  userAPI: { getFuzzySearch: mockGetFuzzySearch },
}))

import { useOutAssetForm } from '../useOutAssetForm'
import { ElMessage } from 'element-plus'
import { AssetCurrentStatus } from '@/types/asset'

const mockElMessageSuccess = vi.mocked(ElMessage.success)
const mockElMessageError = vi.mocked(ElMessage.error)
const mockElMessageInfo = vi.mocked(ElMessage.info)

function makeAsset(overrides: Partial<AssetDetail> = {}): AssetDetail {
  return {
    asset_code: 'AS001',
    asset_name: '笔记本',
    asset_current_status: AssetCurrentStatus.IN_STORE,
    ...overrides,
  } as AssetDetail
}

function mountForm() {
  const Wrapper = defineComponent({
    setup() {
      return { form: useOutAssetForm() }
    },
    template: '<div />',
  })
  const wrapper = mount(Wrapper)
  return wrapper.vm.form as ReturnType<typeof useOutAssetForm>
}

describe('useOutAssetForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    currentQuery.value = {}
    mockGetById.mockResolvedValue(null)
    mockUpdate.mockResolvedValue()
    mockCreate.mockResolvedValue()
    mockAssetGetByName.mockResolvedValue([])
    mockAssetGetById.mockResolvedValue(null)
    mockGetFuzzySearch.mockResolvedValue({ results: [] })
  })

  describe('初始化', () => {
    it('无 code 时为新增模式', () => {
      const { isEditMode } = useOutAssetForm()
      expect(isEditMode.value).toBe(false)
    })

    it('有 code 时为编辑模式', () => {
      currentQuery.value = { code: 'OUT001' }
      const { isEditMode } = useOutAssetForm()
      expect(isEditMode.value).toBe(true)
    })
  })

  describe('outAssetForm 映射', () => {
    it('空字段映射为 null，日期默认今天', () => {
      const { outAssetCreateExtendedForm, outAssetForm } = useOutAssetForm()
      outAssetCreateExtendedForm.outasset_description = ''

      const form = outAssetForm.value

      expect(form.outasset_applicant_jobcode).toBeNull()
      expect(form.outasset_manager_jobcode).toBeNull()
      expect(form.outasset_using_location).toBeNull()
      expect(form.outasset_description).toBeNull()
      expect(form.outasset_date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    })

    it('有值时透传并使用 formatDate', () => {
      const { outAssetCreateExtendedForm, outAssetForm } = useOutAssetForm()
      outAssetCreateExtendedForm.outasset_applicant_jobcode = 'J001'
      outAssetCreateExtendedForm.outasset_date = '2024-05-01'
      outAssetCreateExtendedForm.return_date = '2024-06-01'

      const form = outAssetForm.value

      expect(form.outasset_applicant_jobcode).toBe('J001')
      expect(form.outasset_date).toBe('2024-05-01')
      expect(form.return_date).toBe('2024-06-01')
    })
  })

  describe('rules 校验', () => {
    it('借用类型缺少归还日期时校验失败', () => {
      const { rules, outAssetCreateExtendedForm } = useOutAssetForm()
      const validator = rules.return_date[0].validator
      outAssetCreateExtendedForm.outasset_type = 'borrow'
      const callback = vi.fn()

      validator({}, '', callback)

      expect(callback).toHaveBeenCalledWith(expect.any(Error))
    })

    it('借用类型有归还日期时校验通过', () => {
      const { rules } = useOutAssetForm()
      const validator = rules.return_date[0].validator
      const callback = vi.fn()

      validator({}, '2024-06-01', callback)

      expect(callback).toHaveBeenCalledWith()
    })

    it('非借用类型无需归还日期', () => {
      const { rules } = useOutAssetForm()
      const callback = vi.fn()

      rules.return_date[0].validator({}, '', callback)

      expect(callback).toHaveBeenCalledWith()
    })
  })

  describe('资产建议', () => {
    it('fetchAssetSuggestions 仅返回在库与待发放资产', async () => {
      const { fetchAssetSuggestions } = useOutAssetForm()
      mockAssetGetByName.mockResolvedValue([
        makeAsset({ asset_name: 'A1', asset_code: 'A1' }),
        makeAsset({
          asset_name: 'A2',
          asset_code: 'A2',
          asset_current_status: AssetCurrentStatus.RECYCLED_PENDING,
        }),
        makeAsset({
          asset_name: 'A3',
          asset_code: 'A3',
          asset_current_status: AssetCurrentStatus.IN_USE,
        }),
      ])
      const cb = vi.fn()

      await fetchAssetSuggestions('A', cb)

      expect(mockAssetGetByName).toHaveBeenCalledWith('A')
      expect(cb).toHaveBeenCalledWith([
        { value: 'A1', asset_name: 'A1', asset_code: 'A1', asset_current_status: 'in_store' },
        {
          value: 'A2',
          asset_name: 'A2',
          asset_code: 'A2',
          asset_current_status: 'recycled_pending',
        },
      ])
    })

    it('空关键词直接返回空建议', async () => {
      const { fetchAssetSuggestions } = useOutAssetForm()
      const cb = vi.fn()

      await fetchAssetSuggestions('  ', cb)

      expect(mockAssetGetByName).not.toHaveBeenCalled()
      expect(cb).toHaveBeenCalledWith([])
    })
  })

  describe('资产选择与校验', () => {
    it('handleAssetSelect 填充表单并提示', () => {
      const { handleAssetSelect, outAssetCreateExtendedForm, selectedAsset } = useOutAssetForm()

      handleAssetSelect(makeAsset())

      expect(outAssetCreateExtendedForm.outasset_code).toBe('AS001')
      expect(outAssetCreateExtendedForm.outasset_name).toBe('笔记本')
      expect(selectedAsset.value?.asset_code).toBe('AS001')
      expect(mockElMessageSuccess).toHaveBeenCalledWith('资产已选择')
    })

    it('handleAssetNameSelect 记录建议项', () => {
      const { handleAssetNameSelect, outAssetCreateExtendedForm, selectedAsset } = useOutAssetForm()

      handleAssetNameSelect({ value: '笔记本', asset_name: '笔记本', asset_code: 'AS002' })

      expect(selectedAsset.value).toEqual({
        value: '笔记本',
        asset_name: '笔记本',
        asset_code: 'AS002',
        asset_current_status: '',
      })
      expect(outAssetCreateExtendedForm.outasset_name).toBe('笔记本')
      expect(outAssetCreateExtendedForm.outasset_code).toBe('AS002')
    })

    it('handleAssetNameChange 不匹配时清除选中', () => {
      const { handleAssetNameSelect, handleAssetNameChange, selectedAsset } = useOutAssetForm()

      handleAssetNameSelect({ value: '笔记本', asset_name: '笔记本', asset_code: 'AS002' })
      handleAssetNameChange('台式机')

      expect(selectedAsset.value).toBeNull()
    })

    describe('handleAssetNameBlur', () => {
      it('与选中项一致时直接返回', async () => {
        const { handleAssetNameSelect, handleAssetNameBlur } = useOutAssetForm()
        handleAssetNameSelect({ value: '笔记本', asset_name: '笔记本', asset_code: 'AS002' })

        await handleAssetNameBlur({ target: { value: '笔记本' } } as unknown as FocusEvent)

        expect(mockAssetGetByName).not.toHaveBeenCalled()
      })

      it('空值时清空资产信息', async () => {
        const { handleAssetNameSelect, handleAssetNameBlur, outAssetCreateExtendedForm } =
          useOutAssetForm()
        handleAssetNameSelect({ value: '笔记本', asset_name: '笔记本', asset_code: 'AS002' })

        await handleAssetNameBlur({ target: { value: '' } } as unknown as FocusEvent)

        expect(outAssetCreateExtendedForm.outasset_code).toBe('')
        expect(outAssetCreateExtendedForm.outasset_name).toBe('')
      })

      it('匹配唯一资产时自动填充', async () => {
        mockAssetGetByName.mockResolvedValue([makeAsset({ asset_name: '唯一资产' })])
        const { handleAssetNameBlur, outAssetCreateExtendedForm, selectedAsset } = useOutAssetForm()

        await handleAssetNameBlur({ target: { value: '唯一资产' } } as unknown as FocusEvent)

        expect(outAssetCreateExtendedForm.outasset_name).toBe('唯一资产')
        expect(outAssetCreateExtendedForm.outasset_code).toBe('AS001')
        expect(selectedAsset.value?.asset_code).toBe('AS001')
      })

      it('存在多条匹配时提示从下拉选择', async () => {
        mockAssetGetByName.mockResolvedValue([
          makeAsset({ asset_name: '同名片1' }),
          makeAsset({ asset_name: '同名片2' }),
        ])
        const { handleAssetNameBlur, outAssetCreateExtendedForm, selectedAsset } = useOutAssetForm()

        await handleAssetNameBlur({ target: { value: '同名' } } as unknown as FocusEvent)

        expect(outAssetCreateExtendedForm.outasset_code).toBe('(请从下拉列表中选择正确的资产)')
        expect(selectedAsset.value).toBeNull()
      })

      it('查询异常时清空资产信息', async () => {
        mockAssetGetByName.mockRejectedValue(new Error('boom'))
        const { handleAssetNameBlur, outAssetCreateExtendedForm } = useOutAssetForm()

        await handleAssetNameBlur({ target: { value: '报错资产' } } as unknown as FocusEvent)

        expect(outAssetCreateExtendedForm.outasset_code).toBe('')
      })
    })

    describe('handleAssetCodeChange', () => {
      it('空白编码时清空', async () => {
        const { handleAssetCodeChange, outAssetCreateExtendedForm } = useOutAssetForm()

        await handleAssetCodeChange('  ')

        expect(outAssetCreateExtendedForm.outasset_code).toBe('')
      })

      it('找到资产时填充表单', async () => {
        mockAssetGetById.mockResolvedValue(makeAsset())
        const { handleAssetCodeChange, outAssetCreateExtendedForm, selectedAsset } =
          useOutAssetForm()

        await handleAssetCodeChange('AS001')

        expect(outAssetCreateExtendedForm.outasset_name).toBe('笔记本')
        expect(selectedAsset.value?.asset_code).toBe('AS001')
      })

      it('未找到时提示编码错误', async () => {
        mockAssetGetById.mockResolvedValue(null)
        const { handleAssetCodeChange, outAssetCreateExtendedForm, selectedAsset } =
          useOutAssetForm()

        await handleAssetCodeChange('NOTEXIST')

        expect(outAssetCreateExtendedForm.outasset_code).toBe('编码错误，无此资产')
        expect(outAssetCreateExtendedForm.outasset_name).toBe('')
        expect(selectedAsset.value).toBeNull()
      })

      it('查询异常时弹出通用错误并清空', async () => {
        mockAssetGetById.mockRejectedValue(new Error('boom'))
        const { handleAssetCodeChange, outAssetCreateExtendedForm } = useOutAssetForm()

        await handleAssetCodeChange('AS001')

        expect(mockShowError).toHaveBeenCalledWith(expect.any(Error), '系统错误，请稍后再试')
        expect(outAssetCreateExtendedForm.outasset_code).toBe('')
      })
    })
  })

  describe('loadEditData', () => {
    it('编辑模式挂载后加载详情并填充表单', async () => {
      currentQuery.value = { code: 'OUT001' }
      mockGetById.mockResolvedValue({
        outasset_code: 'OUT001',
        outasset_number: 2,
        outasset_applicant_jobcode: 'J001',
        outasset_applicant: { employee_name: '张三' },
        outasset_manager: { employee_name: '李四' },
        outasset_date: '2024-05-01',
        return_date: '2024-06-01',
        outasset_type: 'borrow',
        outasset_using_location: 'A座',
        outasset_description: '描述',
        asset_name: '打印机',
      })
      const form = mountForm()

      await vi.waitFor(() => expect(mockGetById).toHaveBeenCalled())
      expect(form.outAssetCreateExtendedForm.outasset_code).toBe('OUT001')
      expect(form.outAssetCreateExtendedForm.outasset_number).toBe(2)
      expect(form.outAssetCreateExtendedForm.outasset_applicant_name).toBe('张三')
      expect(form.outAssetCreateExtendedForm.outasset_manager_name).toBe('李四')
      expect(form.outAssetCreateExtendedForm.outasset_description).toBe('描述')
      expect(form.outAssetCreateExtendedForm.outasset_name).toBe('打印机')
      expect(form.isLoading.value).toBe(false)
    })

    it('编辑模式记录不存在时提示并返回', async () => {
      currentQuery.value = { code: 'OUT001' }
      mockGetById.mockResolvedValue(null)
      mountForm()

      await vi.waitFor(() => expect(mockGetById).toHaveBeenCalled())

      expect(mockElMessageError).toHaveBeenCalledWith('未找到该出库记录')
      expect(mockBack).toHaveBeenCalled()
    })

    it('编辑模式加载异常时提示并返回', async () => {
      currentQuery.value = { code: 'OUT001' }
      mockGetById.mockRejectedValue(new Error('boom'))
      mountForm()

      await vi.waitFor(() => expect(mockShowError).toHaveBeenCalled())

      expect(mockShowError).toHaveBeenCalledWith(expect.any(Error), '加载出库记录失败')
      expect(mockBack).toHaveBeenCalled()
    })
  })

  describe('submitForm', () => {
    function mockValidate(valid: boolean) {
      return vi.fn((cb: (v: boolean) => void) => cb(valid))
    }

    it('校验失败时提示必填', () => {
      const { submitForm, formRef } = useOutAssetForm()
      formRef.value = { validate: mockValidate(false) }

      submitForm()

      expect(mockElMessageError).toHaveBeenCalledWith('请填写所有必填项')
      expect(mockCreate).not.toHaveBeenCalled()
    })

    it('新增模式提交成功并跳转', async () => {
      const { submitForm, formRef } = useOutAssetForm()
      formRef.value = { validate: mockValidate(true) }

      submitForm()
      await vi.waitFor(() => expect(mockElMessageSuccess).toHaveBeenCalled())

      expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({ outasset_code: '' }))
      expect(mockSetRefreshFlag).toHaveBeenCalledWith(true)
      expect(mockPush).toHaveBeenCalledWith({ name: 'OutAssetDetails' })
    })

    it('编辑模式未修改时提示无需提交', async () => {
      currentQuery.value = { code: 'OUT001' }
      mockGetById.mockResolvedValue({
        outasset_code: 'OUT001',
        outasset_number: 1,
        outasset_type: 'borrow',
        outasset_using_location: 'A座',
        asset_name: '旧资产',
      })
      const form = mountForm()

      await vi.waitFor(() => expect(mockGetById).toHaveBeenCalled())
      form.formRef.value = { validate: (cb: (v: boolean) => void) => cb(true) } as never
      form.submitForm()

      expect(mockElMessageInfo).toHaveBeenCalledWith('数据未修改，无需提交')
      expect(mockUpdate).not.toHaveBeenCalled()
    })

    it('编辑模式有修改时调用 update', async () => {
      currentQuery.value = { code: 'OUT001' }
      mockGetById.mockResolvedValue({
        outasset_code: 'OUT001',
        outasset_number: 1,
        outasset_type: 'borrow',
        outasset_using_location: 'A座',
        asset_name: '旧资产',
      })
      const form = mountForm()

      await vi.waitFor(() => expect(mockGetById).toHaveBeenCalled())
      form.outAssetCreateExtendedForm.outasset_description = '改过了'
      form.formRef.value = { validate: (cb: (v: boolean) => void) => cb(true) } as never
      form.submitForm()
      await vi.waitFor(() => expect(mockElMessageSuccess).toHaveBeenCalled())

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ asset_recordcode: 'OUT001' }),
      )
    })

    it('编辑模式更新成功后跳转列表', async () => {
      currentQuery.value = { code: 'OUT001' }
      const { submitForm, formRef } = useOutAssetForm()
      formRef.value = { validate: mockValidate(true) }

      submitForm()
      await vi.waitFor(() => expect(mockPush).toHaveBeenCalled())

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ asset_recordcode: 'OUT001' }),
      )
      expect(mockSetRefreshFlag).toHaveBeenCalledWith(true)
    })

    it('提交异常时提示操作失败', async () => {
      mockCreate.mockRejectedValue(new Error('boom'))
      const { submitForm, formRef } = useOutAssetForm()
      formRef.value = { validate: mockValidate(true) }

      submitForm()
      await vi.waitFor(() => expect(mockShowError).toHaveBeenCalled())

      expect(mockShowError).toHaveBeenCalledWith(expect.any(Error), '操作失败')
    })
  })

  describe('resetForm 与 goBack', () => {
    it('resetForm 清空表单并提示', () => {
      const { resetForm, outAssetCreateExtendedForm } = useOutAssetForm()
      outAssetCreateExtendedForm.outasset_code = 'AS001'
      outAssetCreateExtendedForm.outasset_number = 5

      resetForm()

      expect(outAssetCreateExtendedForm.outasset_code).toBe('')
      expect(outAssetCreateExtendedForm.outasset_number).toBe(1)
      expect(mockElMessageInfo).toHaveBeenCalledWith('表单已重置')
    })

    it('goBack 回退历史', () => {
      const { goBack } = useOutAssetForm()
      goBack()
      expect(mockGo).toHaveBeenCalledWith(-1)
    })
  })
})
