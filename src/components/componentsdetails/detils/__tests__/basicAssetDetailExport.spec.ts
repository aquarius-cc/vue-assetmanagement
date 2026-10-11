import { describe, it, expect } from 'vitest'
import type { AssetDetail } from '@/types/asset'
import { getAssetStatusText } from '@/utils/Format'
import { basicAssetDetailExportColumns } from '../basicAssetDetailExport'

const findCol = (title: string) => {
  const col = basicAssetDetailExportColumns.find((c) => c.title === title)
  expect(col, `列「${title}」不存在`).toBeTruthy()
  return col!
}

/** 对齐 AssetDetailSerializer 输出：仅嵌套关联对象，无平铺 _code/_jobcode 键 */
const nestedRow = {
  asset_code: 'ASSET-IT-AT001-20260101-0001',
  asset_name: '笔记本电脑',
  asset_purchase_price: '4999.00',
  asset_current_status: 'in_store',
  asset_type: { type_code: 'AT001', type_name: '笔记本' },
  asset_contract: { contract_code: 'CT001', contract_name: '采购合同A' },
  asset_storage: { storage_code: 'ST001', storage_name: '主仓库' },
  asset_entry_person: { employee_jobcode: 'J001', employee_name: '张某' },
  asset_applicant: { employee_jobcode: 'J002', employee_name: '李某' },
  asset_manager: { employee_jobcode: 'J003', employee_name: '王某' },
} as unknown as AssetDetail

const NESTED_TITLES = ['资产分类', '录入人工号', '合同编码', '申请人工号', '保管人工号', '仓库编码']

describe('basicAssetDetailExportColumns', () => {
  it('保持 19 列与既有列标题/顺序', () => {
    expect(basicAssetDetailExportColumns).toHaveLength(19)
    expect(basicAssetDetailExportColumns.map((c) => c.title)).toEqual([
      '资产编码',
      '资产名称',
      '品牌',
      '单位',
      '型号规格',
      '资产分类',
      '单价',
      '实物数量',
      '采购日期',
      '质保期',
      '录入日期',
      '当前使用状态',
      '录入人工号',
      '合同编码',
      '申请人工号',
      '保管人工号',
      '使用地点',
      '仓库编码',
      '资产描述',
    ])
  })

  it('【BF-081】6 个嵌套关联列必须提供 formatter（detail 行无平铺键，否则导出恒空）', () => {
    for (const title of NESTED_TITLES) {
      expect(findCol(title).formatter, `列「${title}」缺 formatter`).toBeTypeOf('function')
    }
  })

  it('【BF-081】嵌套行导出时 6 列取到关联对象中的值', () => {
    expect(findCol('资产分类').formatter!(undefined, nestedRow, [nestedRow])).toBe('AT001')
    expect(findCol('录入人工号').formatter!(undefined, nestedRow, [nestedRow])).toBe('J001')
    expect(findCol('合同编码').formatter!(undefined, nestedRow, [nestedRow])).toBe('CT001')
    expect(findCol('申请人工号').formatter!(undefined, nestedRow, [nestedRow])).toBe('J002')
    expect(findCol('保管人工号').formatter!(undefined, nestedRow, [nestedRow])).toBe('J003')
    expect(findCol('仓库编码').formatter!(undefined, nestedRow, [nestedRow])).toBe('ST001')
  })

  it('嵌套对象缺失时回退空串（不输出 undefined）', () => {
    const empty = {} as AssetDetail
    for (const title of NESTED_TITLES) {
      expect(findCol(title).formatter!(undefined, empty, [empty])).toBe('')
    }
  })

  it('数值/状态列 formatter 回归（既有行为不变）', () => {
    expect(findCol('单价').formatter!('4999.00', nestedRow, [nestedRow])).toBe('4999.00')
    expect(findCol('单价').formatter!(null, nestedRow, [nestedRow])).toBe('0')
    expect(findCol('当前使用状态').formatter!('in_store', nestedRow, [nestedRow])).toBe(
      getAssetStatusText('in_store'),
    )
    expect(findCol('资产编码').formatter).toBeUndefined()
  })
})
