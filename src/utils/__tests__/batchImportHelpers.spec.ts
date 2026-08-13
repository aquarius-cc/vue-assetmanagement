import { describe, it, expect } from 'vitest'
import { validationTagType, validationTagText } from '../batchImportHelpers'

type Row = {
  validationStatus: 'success' | 'error'
  submitStatus?: 'pending' | 'success' | 'error'
}

function makeRow(status: Row): Row {
  return status
}

describe('batchImportHelpers', () => {
  describe('validationTagType', () => {
    it('submitStatus error 优先返回 danger', () => {
      expect(
        validationTagType(makeRow({ validationStatus: 'success', submitStatus: 'error' })),
      ).toBe('danger')
    })

    it('submitStatus success 返回 success', () => {
      expect(
        validationTagType(makeRow({ validationStatus: 'success', submitStatus: 'success' })),
      ).toBe('success')
    })

    it('未提交且校验失败返回 danger', () => {
      expect(validationTagType(makeRow({ validationStatus: 'error' }))).toBe('danger')
    })

    it('未提交且校验成功返回 success', () => {
      expect(validationTagType(makeRow({ validationStatus: 'success' }))).toBe('success')
    })
  })

  describe('validationTagText', () => {
    it('submitStatus error 返回提交失败', () => {
      expect(
        validationTagText(makeRow({ validationStatus: 'success', submitStatus: 'error' })),
      ).toBe('提交失败')
    })

    it('submitStatus success 返回已提交', () => {
      expect(
        validationTagText(makeRow({ validationStatus: 'success', submitStatus: 'success' })),
      ).toBe('已提交')
    })

    it('未提交且校验失败返回验证失败', () => {
      expect(validationTagText(makeRow({ validationStatus: 'error' }))).toBe('验证失败')
    })

    it('未提交且校验成功返回有效', () => {
      expect(validationTagText(makeRow({ validationStatus: 'success' }))).toBe('有效')
    })
  })
})
