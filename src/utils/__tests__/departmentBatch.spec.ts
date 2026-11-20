/** BF-207: buildBatchCreateItems 纯函数直测——缺省行省略 sort_order，显式值尊重 */
import { describe, expect, it } from 'vitest'

import { buildBatchCreateItems } from '../departmentBatch'

const PARENT = 'DEPT-PARENT'

describe('buildBatchCreateItems', () => {
  it('缺省行提交项无 sort_order 键（后端自动排组尾）', () => {
    const items = buildBatchCreateItems(
      [
        {
          department_code: 'D1',
          department_name: '一',
          department_information: '',
          sort_order: null,
        },
        {
          department_code: 'D2',
          department_name: '二',
          department_information: '',
          sort_order: null,
        },
      ],
      PARENT,
    )
    expect(items).toHaveLength(2)
    for (const item of items) {
      expect(item.sort_order).toBeUndefined()
    }
    for (const item of items) {
      expect(item.parent_department_code).toBe(PARENT)
    }
  })

  it('显式值（含 0）仍尊重', () => {
    const items = buildBatchCreateItems(
      [{ department_code: 'D3', department_name: '三', department_information: '', sort_order: 0 }],
      PARENT,
    )
    expect(items[0].sort_order).toBe(0)
  })

  it('字符串字段去首尾空白，空信息员回退 "-"', () => {
    const items = buildBatchCreateItems(
      [
        {
          department_code: '  D4  ',
          department_name: '  四  ',
          department_information: '  ',
          sort_order: 3,
        },
      ],
      PARENT,
    )
    expect(items[0].department_code).toBe('D4')
    expect(items[0].department_name).toBe('四')
    expect(items[0].department_information).toBe('-')
  })
})
