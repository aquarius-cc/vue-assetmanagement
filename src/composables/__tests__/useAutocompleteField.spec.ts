import { describe, it, expect } from 'vitest'
import { reactive } from 'vue'
import { useAutocompleteField } from '../useAutocompleteField'

describe('useAutocompleteField', () => {
  it('handleSelect writes item keys into form fields and tracks selection', () => {
    const form = reactive({ name: '', code: '' })
    const field = useAutocompleteField({
      form,
      nameField: 'name',
      codeField: 'code',
      itemKey: 'label',
      codeKey: 'value',
    })

    field.handleSelect({ label: '资产A', value: 'A001' })

    expect(field.selectedItem.value).toEqual({ label: '资产A', value: 'A001' })
    expect(form.name).toBe('资产A')
    expect(form.code).toBe('A001')
  })

  it('uses default itemKey/codeKey when not provided', () => {
    const form = reactive({ name: '', code: '' })
    const field = useAutocompleteField({ form, nameField: 'name', codeField: 'code' })

    field.handleSelect({ value: 'v1', code: 'c1' })

    expect(form.name).toBe('v1')
    expect(form.code).toBe('c1')
  })

  it('handleChange keeps selection when value matches the selected item', () => {
    const form = reactive({ name: '', code: '' })
    const field = useAutocompleteField({
      form,
      nameField: 'name',
      codeField: 'code',
      itemKey: 'label',
    })

    field.handleSelect({ label: '资产A', code: 'A001' })
    field.handleChange('资产A')

    expect(field.selectedItem.value).not.toBeNull()
    expect(form.code).toBe('A001')
  })

  it('handleChange clears code when value differs from selection', () => {
    const form = reactive({ name: '', code: '' })
    const field = useAutocompleteField({
      form,
      nameField: 'name',
      codeField: 'code',
      itemKey: 'label',
    })

    field.handleSelect({ label: '资产A', code: 'A001' })
    field.handleChange('手动输入')

    expect(field.selectedItem.value).toBeNull()
    expect(form.code).toBe('')
  })

  it('handleChange clears code when no selection exists', () => {
    const form = reactive({ name: '', code: 'A001' })
    const field = useAutocompleteField({ form, nameField: 'name', codeField: 'code' })

    field.handleChange('任意输入')

    expect(field.selectedItem.value).toBeNull()
    expect(form.code).toBe('')
  })

  it('clear resets selection and form fields', () => {
    const form = reactive({ name: '', code: '' })
    const field = useAutocompleteField({ form, nameField: 'name', codeField: 'code' })

    field.handleSelect({ value: 'v', code: 'c' })
    field.clear()

    expect(field.selectedItem.value).toBeNull()
    expect(form.name).toBe('')
    expect(form.code).toBe('')
  })
})
