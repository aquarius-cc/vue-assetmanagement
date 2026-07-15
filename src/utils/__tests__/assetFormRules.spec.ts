import { describe, it, expect } from 'vitest'
import { assetFormRules } from '../assetFormRules'

describe('assetFormRules', () => {
  describe('asset_name rules', () => {
    it('has required rule', () => {
      const nameRules = assetFormRules.asset_name as Array<Record<string, unknown>>
      expect(nameRules).toBeDefined()
      expect(nameRules.length).toBeGreaterThanOrEqual(2)
      
      const requiredRule = nameRules.find((rule: Record<string, unknown>) => rule.required === true)
      expect(requiredRule).toBeDefined()
      expect(requiredRule?.message).toBe('请输入资产名称')
    })

    it('has min/max length rules', () => {
      const nameRules = assetFormRules.asset_name as Array<Record<string, unknown>>
      const lengthRule = nameRules.find((rule: Record<string, unknown>) => rule.min !== undefined)
      
      expect(lengthRule).toBeDefined()
      expect(lengthRule?.min).toBe(2)
      expect(lengthRule?.max).toBe(100)
      expect(lengthRule?.message).toBe('长度 2-100 字符')
    })
  })

  describe('asset_type rules', () => {
    it('has required rule', () => {
      const typeRules = assetFormRules.asset_type as Array<Record<string, unknown>>
      expect(typeRules).toBeDefined()
      expect(typeRules.length).toBe(1)
      
      const requiredRule = typeRules[0]
      expect(requiredRule.required).toBe(true)
      expect(requiredRule.message).toBe('请选择资产类型')
    })
  })

  describe('asset_purchase_price rules', () => {
    it('has required rule', () => {
      const priceRules = assetFormRules.asset_purchase_price as Array<Record<string, unknown>>
      expect(priceRules).toBeDefined()
      expect(priceRules.length).toBeGreaterThanOrEqual(2)
      
      const requiredRule = priceRules.find((rule: Record<string, unknown>) => rule.required === true)
      expect(requiredRule).toBeDefined()
      expect(requiredRule?.message).toBe('请输入单价')
    })

    it('has number validation rule', () => {
      const priceRules = assetFormRules.asset_purchase_price as Array<Record<string, unknown>>
      const numberRule = priceRules.find((rule: Record<string, unknown>) => rule.type === 'number')
      
      expect(numberRule).toBeDefined()
      expect(numberRule?.min).toBe(0)
      expect(numberRule?.message).toBe('单价不能为负数')
    })
  })

  describe('asset_purchase_date rules', () => {
    it('has required rule', () => {
      const dateRules = assetFormRules.asset_purchase_date as Array<Record<string, unknown>>
      expect(dateRules).toBeDefined()
      expect(dateRules.length).toBe(1)
      
      const requiredRule = dateRules[0]
      expect(requiredRule.required).toBe(true)
      expect(requiredRule.message).toBe('请选择采购日期')
    })
  })

  describe('asset_entry_date rules', () => {
    it('has required rule', () => {
      const dateRules = assetFormRules.asset_entry_date as Array<Record<string, unknown>>
      expect(dateRules).toBeDefined()
      expect(dateRules.length).toBe(1)
      
      const requiredRule = dateRules[0]
      expect(requiredRule.required).toBe(true)
      expect(requiredRule.message).toBe('请选择录入日期')
    })
  })

  describe('overall structure', () => {
    it('has all required fields', () => {
      expect(assetFormRules).toHaveProperty('asset_name')
      expect(assetFormRules).toHaveProperty('asset_type')
      expect(assetFormRules).toHaveProperty('asset_purchase_price')
      expect(assetFormRules).toHaveProperty('asset_purchase_date')
      expect(assetFormRules).toHaveProperty('asset_entry_date')
    })

    it('has correct number of fields', () => {
      expect(Object.keys(assetFormRules).length).toBe(5)
    })

    it('all fields have arrays of rules', () => {
      for (const field of Object.keys(assetFormRules)) {
        expect(Array.isArray(assetFormRules[field])).toBe(true)
      }
    })
  })
})