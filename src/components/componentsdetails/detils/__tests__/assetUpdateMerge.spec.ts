import { describe, it, expect } from 'vitest'
import type { AssetDetail } from '@/types/asset'
import { detailToUpdatePayload, dirtyDiff, isVersionConflict } from '../assetUpdateMerge'

const makeDetail = (overrides: Record<string, unknown> = {}) =>
  ({
    recordcode: 'REC-001',
    asset_code: 'A001',
    asset_name: '笔记本电脑',
    asset_specification: 'i7/16G',
    asset_brand: '联想',
    asset_unit: '台',
    asset_purchase_price: '4999.00',
    asset_purchase_number: 1,
    asset_purchase_date: '2026-01-01',
    asset_warranty_period: 3,
    asset_entry_date: '2026-01-02',
    asset_using_location: '3楼办公区',
    asset_description: '日常办公用',
    version: 5,
    asset_type: { type_code: 'AT001', type_name: '笔记本' },
    asset_contract: { contract_code: 'CT001', contract_name: '采购合同A' },
    asset_storage: { storage_code: 'ST001', storage_name: '主仓库' },
    asset_entry_person: { employee_jobcode: 'J001', employee_name: '张某' },
    asset_applicant: { employee_jobcode: 'J002', employee_name: '李某' },
    asset_manager: { employee_jobcode: 'J003', employee_name: '王某' },
    harddisk_sns: [],
    ...overrides,
  }) as unknown as AssetDetail

describe('detailToUpdatePayload（同源归一化）', () => {
  it('键集 = 编辑载荷面：16 键，无录入倍数/定位键/版本键', () => {
    const payload = detailToUpdatePayload(makeDetail())
    expect(Object.keys(payload).sort()).toEqual(
      [
        'asset_applicant',
        'asset_brand',
        'asset_contract',
        'asset_description',
        'asset_entry_date',
        'asset_entry_person',
        'asset_manager',
        'asset_name',
        'asset_purchase_date',
        'asset_purchase_price',
        'asset_specification',
        'asset_storage',
        'asset_type',
        'asset_unit',
        'asset_using_location',
        'asset_warranty_period',
      ].sort(),
    )
  })

  it('price 归一化与表单侧同源（Number→String：4999.00 → 4999），未编辑不误判脏', () => {
    const payload = detailToUpdatePayload(makeDetail())
    expect(payload.asset_purchase_price).toBe('4999')
    // 表单侧回填走 Number(detail) 再 pickPrice，与归一化结果严格相等 → diff 为空
    const formNormalized = { ...payload }
    expect(dirtyDiff(payload, formNormalized)).toEqual({})
  })

  it('FK 取嵌套对象业务码，缺失兜底空串', () => {
    const payload = detailToUpdatePayload(
      makeDetail({ asset_contract: undefined, asset_type: { type_code: 'AT9' } }),
    )
    expect(payload.asset_type).toBe('AT9')
    expect(payload.asset_contract).toBe('')
  })
})

describe('dirtyDiff（脏字段提取）', () => {
  it('仅保留变化键，未动键让位给他人并发修改', () => {
    const baseline = { a: '1', b: '2', c: '3' }
    const current = { a: '1', b: 'X', c: '3' }
    expect(dirtyDiff(baseline, current)).toEqual({ b: 'X' })
  })

  it('完全未编辑 → 空 diff', () => {
    expect(dirtyDiff({ a: '1' }, { a: '1' })).toEqual({})
  })
})

describe('isVersionConflict（信封判别）', () => {
  const errWith = (data: unknown) => ({ response: { status: 409, data } })

  it('业务码在 data.data.error_code，命中判真', () => {
    expect(
      isVersionConflict(
        errWith({ code: 409, message: 'x', data: { error_code: 'VERSION_CONFLICT' } }),
      ),
    ).toBe(true)
  })

  it('信封 code=409 但业务码缺失/不同 → 假（不可与 HTTP 码混同）', () => {
    expect(isVersionConflict(errWith({ code: 409, data: { error_code: 'OTHER' } }))).toBe(false)
    expect(isVersionConflict(errWith({ code: 409, data: {} }))).toBe(false)
    expect(isVersionConflict(errWith({ code: 'VERSION_CONFLICT' }))).toBe(false)
  })

  it('非响应错误 → 假', () => {
    expect(isVersionConflict(new Error('boom'))).toBe(false)
    expect(isVersionConflict(null)).toBe(false)
    expect(isVersionConflict(undefined)).toBe(false)
  })
})
