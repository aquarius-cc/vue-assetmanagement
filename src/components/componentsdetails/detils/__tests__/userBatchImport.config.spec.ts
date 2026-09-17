import { describe, it, expect } from 'vitest'
import type { ExcelEmployeeData } from '@/types/user'
import {
  createUserBatchConfig,
  userHeaderExamples,
  userExampleColumns,
  userExampleRows,
  userTemplateData,
} from '../userBatchImport.config'

function makeUserRow(overrides: Record<string, unknown> = {}): ExcelEmployeeData {
  return {
    姓名: '张三',
    工号: 'A12345',
    电话: '13812345678',
    位置: '铁机路B栋14楼',
    状态: 'active',
    部门: '信息管理中心',
    部门代码: '',
    排序: 100,
    描述: '测试员工',
    ...overrides,
  } as unknown as ExcelEmployeeData
}

const exactMapping = () => ({ 信息管理中心: 'XXGLZX' })

describe('createUserBatchConfig', () => {
  it('返回基础配置字段', () => {
    const config = createUserBatchConfig(exactMapping)
    expect(config.entityName).toBe('员工')
    expect(config.idField).toBe('employee_jobcode')
    expect(config.requiredFields).toContain('姓名')
    expect(config.excelHeaderMap).toHaveProperty('部门代码')
  })

  describe('validateItem', () => {
    const config = createUserBatchConfig(exactMapping)

    it('完全合法数据通过校验', () => {
      const result = config.validateItem(makeUserRow())
      expect(result.valid).toBe(true)
      expect(result.errors).toEqual({})
    })

    it('姓名为空时失败', () => {
      const result = config.validateItem(makeUserRow({ 姓名: '   ' }))
      expect(result.valid).toBe(false)
      expect(result.errors.姓名).toBe('姓名为必填项')
    })

    it('工号为空时失败', () => {
      const result = config.validateItem(makeUserRow({ 工号: '' }))
      expect(result.errors.工号).toBe('工号为必填项')
    })

    it('工号格式不正确时失败', () => {
      const result = config.validateItem(makeUserRow({ 工号: 'a12345' }))
      expect(result.valid).toBe(false)
      expect(result.errors.工号).toBe('工号格式不正确（如 A12345）')
    })

    it('电话为空时失败', () => {
      const result = config.validateItem(makeUserRow({ 电话: '' }))
      expect(result.valid).toBe(false)
      expect(result.errors.电话).toBe('电话为必填项')
    })

    it('电话格式不正确时失败', () => {
      const result = config.validateItem(makeUserRow({ 电话: '1381234567' }))
      expect(result.valid).toBe(false)
      expect(result.errors.电话).toBe('电话格式不正确')
    })

    it('位置为空时失败', () => {
      const result = config.validateItem(makeUserRow({ 位置: '' }))
      expect(result.valid).toBe(false)
      expect(result.errors.位置).toBe('位置为必填项')
    })

    it('部门名称为空时失败', () => {
      const result = config.validateItem(makeUserRow({ 部门: '' }))
      expect(result.valid).toBe(false)
      expect(result.errors.部门).toBe('部门名称为必填项')
    })

    it('部门名称精确匹配时通过', () => {
      const result = config.validateItem(makeUserRow({ 部门: '信息管理中心' }))
      expect(result.valid).toBe(true)
    })

    it('部门名称 trim 后可匹配时通过', () => {
      const configTrim = createUserBatchConfig(() => ({ ' 信息管理中心 ': 'XXGLZX' }))
      const result = configTrim.validateItem(makeUserRow({ 部门: '信息管理中心' }))
      expect(result.valid).toBe(true)
    })

    it('部门名称模糊匹配时通过', () => {
      const configFuzzy = createUserBatchConfig(() => ({ 信息管理中心办公室: 'XXGLZX' }))
      const result = configFuzzy.validateItem(makeUserRow({ 部门: '信息管理中心' }))
      expect(result.valid).toBe(true)
    })

    it('部门无匹配但部门代码列有值时通过', () => {
      const configEmpty = createUserBatchConfig(() => ({}))
      const result = configEmpty.validateItem(
        makeUserRow({ 部门: '不存在的部门', 部门代码: 'CODE99' }),
      )
      expect(result.valid).toBe(true)
    })

    it('部门无匹配且部门代码列为空时失败', () => {
      const configEmpty = createUserBatchConfig(() => ({}))
      const result = configEmpty.validateItem(makeUserRow({ 部门: '不存在的部门' }))
      expect(result.valid).toBe(false)
      expect(result.errors.部门).toBe('部门名称在系统中不存在，且「部门代码」列也为空')
    })

    it('部门无匹配且部门代码列缺失时失败', () => {
      const configEmpty = createUserBatchConfig(() => ({}))
      const result = configEmpty.validateItem(
        makeUserRow({ 部门: '不存在的部门', 部门代码: undefined }),
      )
      expect(result.valid).toBe(false)
      expect(result.errors.部门).toBe('部门名称在系统中不存在，且「部门代码」列也为空')
    })

    it('排序为非数字时失败', () => {
      const result = config.validateItem(makeUserRow({ 排序: 'abc' }))
      expect(result.valid).toBe(false)
      expect(result.errors.排序).toBe('排序必须是数字')
    })

    it('排序为负数时失败', () => {
      const result = config.validateItem(makeUserRow({ 排序: -1 }))
      expect(result.valid).toBe(false)
      expect(result.errors.排序).toBe('排序不能小于 0')
    })

    it('排序超上限时失败', () => {
      const result = config.validateItem(makeUserRow({ 排序: 1000001 }))
      expect(result.valid).toBe(false)
      expect(result.errors.排序).toBe('排序不能大于 1000000')
    })

    it('状态值非法时失败', () => {
      const result = config.validateItem(makeUserRow({ 状态: 'unknown' }))
      expect(result.valid).toBe(false)
      expect(result.errors.状态).toContain('状态值无效')
    })

    it('状态值空白时不做校验', () => {
      const result = config.validateItem(makeUserRow({ 状态: '  ' }))
      expect(result.errors.状态).toBeUndefined()
      expect(result.valid).toBe(true)
    })

    it('状态值前后空格被清洗后通过', () => {
      const result = config.validateItem(makeUserRow({ 状态: ' active ' }))
      expect(result.valid).toBe(true)
    })

    it('多字段错误同时返回', () => {
      const result = config.validateItem(
        makeUserRow({ 姓名: '', 工号: '', 电话: '', 位置: '', 部门: '', 排序: 'abc', 状态: 'bad' }),
      )
      expect(result.valid).toBe(false)
      expect(result.errors).toMatchObject({
        姓名: '姓名为必填项',
        工号: '工号为必填项',
        电话: '电话为必填项',
        位置: '位置为必填项',
        部门: '部门名称为必填项',
        排序: '排序必须是数字',
      })
    })

    it('字段缺失时按空值处理且不产生排序错误', () => {
      const result = config.validateItem(
        makeUserRow({
          姓名: undefined,
          工号: undefined,
          电话: undefined,
          位置: undefined,
          状态: undefined,
          部门: undefined,
          部门代码: undefined,
          描述: undefined,
          排序: undefined,
        }),
      )
      expect(result.valid).toBe(false)
      expect(result.errors.姓名).toBeDefined()
      expect(result.errors.工号).toBe('工号为必填项')
      expect(result.errors.电话).toBe('电话为必填项')
      expect(result.errors.位置).toBe('位置为必填项')
      expect(result.errors.部门).toBe('部门名称为必填项')
      expect(result.errors.排序).toBeUndefined()
    })

    it('部门名称被系统部门名包含时模糊匹配通过', () => {
      const configReverse = createUserBatchConfig(() => ({ 信息管理中心: 'XXGLZX' }))
      const result = configReverse.validateItem(makeUserRow({ 部门: '信息管理中心办公室' }))
      expect(result.valid).toBe(true)
    })
  })

  describe('transformToApiData', () => {
    it('精确匹配部门并转换状态', () => {
      const config = createUserBatchConfig(exactMapping)
      const data = config.transformToApiData(makeUserRow({ 状态: 'left' }))
      expect(data.employee_jobcode).toBe('A12345')
      expect(data.employee_name).toBe('张三')
      expect(data.employee_phone).toBe('13812345678')
      expect(data.employee_location).toBe('铁机路B栋14楼')
      expect(data.employee_status).toBe('left')
      expect(data.employee_department_code).toBe('XXGLZX')
      expect(data.employee_description).toBe('测试员工')
      expect(data.sort_order).toBe(100)
    })

    it('状态为空时回退为 active', () => {
      const config = createUserBatchConfig(exactMapping)
      const data = config.transformToApiData(makeUserRow({ 状态: '' }))
      expect(data.employee_status).toBe('active')
    })

    it('状态非法时回退为 active', () => {
      const config = createUserBatchConfig(exactMapping)
      const data = config.transformToApiData(makeUserRow({ 状态: 'bogus' }))
      expect(data.employee_status).toBe('active')
    })

    it('部门名称 trim 匹配解析部门代码', () => {
      const config = createUserBatchConfig(() => ({ ' 信息管理中心 ': 'XXGLZX' }))
      const data = config.transformToApiData(makeUserRow({ 部门: '信息管理中心' }))
      expect(data.employee_department_code).toBe('XXGLZX')
    })

    it('部门名称模糊匹配解析部门代码', () => {
      const config = createUserBatchConfig(() => ({ 信息管理中心办公室: 'XXGLZX' }))
      const data = config.transformToApiData(makeUserRow({ 部门: '信息管理中心' }))
      expect(data.employee_department_code).toBe('XXGLZX')
    })

    it('部门无匹配时回退到部门代码列', () => {
      const config = createUserBatchConfig(() => ({}))
      const data = config.transformToApiData(
        makeUserRow({ 部门: '不存在的部门', 部门代码: '  ZZ99  ' }),
      )
      expect(data.employee_department_code).toBe('ZZ99')
    })

    it('部门名为空时回退到部门代码列', () => {
      const config = createUserBatchConfig(() => ({}))
      const data = config.transformToApiData(makeUserRow({ 部门: undefined, 部门代码: 'RLZYB' }))
      expect(data.employee_department_code).toBe('RLZYB')
    })

    it('部门名仅空格且无部门代码时返回空编码', () => {
      const config = createUserBatchConfig(() => ({}))
      const data = config.transformToApiData(makeUserRow({ 部门: '   ', 部门代码: '' }))
      expect(data.employee_department_code).toBe('')
    })

    it('描述为空时返回 null', () => {
      const config = createUserBatchConfig(exactMapping)
      expect(
        config.transformToApiData(makeUserRow({ 描述: undefined })).employee_description,
      ).toBeNull()
      expect(
        config.transformToApiData(makeUserRow({ 描述: '   ' })).employee_description,
      ).toBeNull()
    })

    it('排序为空时默认 0', () => {
      const config = createUserBatchConfig(exactMapping)
      const data = config.transformToApiData(makeUserRow({ 排序: undefined }))
      expect(data.sort_order).toBe(0)
    })

    it('状态字段缺失时回退为 active', () => {
      const config = createUserBatchConfig(exactMapping)
      const data = config.transformToApiData(makeUserRow({ 状态: undefined }))
      expect(data.employee_status).toBe('active')
    })

    it('部门代码缺失且无部门匹配时返回空编码', () => {
      const config = createUserBatchConfig(() => ({}))
      const data = config.transformToApiData(makeUserRow({ 部门: undefined, 部门代码: undefined }))
      expect(data.employee_department_code).toBe('')
    })

    it('员工基础字段缺失时返回空字符串', () => {
      const config = createUserBatchConfig(exactMapping)
      const data = config.transformToApiData(
        makeUserRow({ 姓名: undefined, 工号: undefined, 电话: undefined, 位置: undefined }),
      )
      expect(data.employee_jobcode).toBe('')
      expect(data.employee_name).toBe('')
      expect(data.employee_phone).toBe('')
      expect(data.employee_location).toBe('')
    })

    it('部门名被系统部门名包含时模糊匹配到代码', () => {
      const config = createUserBatchConfig(() => ({ 信息管理中心: 'XXGLZX' }))
      const data = config.transformToApiData(makeUserRow({ 部门: '信息管理中心办公室' }))
      expect(data.employee_department_code).toBe('XXGLZX')
    })

    it('createFn 返回空对象', async () => {
      const config = createUserBatchConfig(exactMapping)
      await expect(config.createFn()).resolves.toEqual({})
    })
  })
})

describe('userBatchImport 静态导出', () => {
  it('userHeaderExamples 定义完整', () => {
    expect(userHeaderExamples).toHaveLength(9)
    expect(userHeaderExamples[0]).toMatchObject({
      headerName: '姓名',
      field: 'employee_name',
      required: true,
    })
  })

  it('userExampleColumns 与表头对应', () => {
    expect(userExampleColumns).toHaveLength(userHeaderExamples.length)
    expect(userExampleColumns[0]).toEqual({ prop: 'employee_name', label: '姓名' })
  })

  it('userExampleRows 包含示例记录', () => {
    expect(userExampleRows).toHaveLength(2)
    expect(userExampleRows[0].employee_name).toBe('张三')
    expect(userExampleRows[1].employee_status).toBe('active')
  })

  it('userTemplateData 含中文表头模板行', () => {
    expect(userTemplateData).toHaveLength(1)
    expect(userTemplateData[0].姓名).toBe('张三')
    expect(userTemplateData[0].工号).toBe('A12345')
  })
})
