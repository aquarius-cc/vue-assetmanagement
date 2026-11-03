/**
 * useAssetExtendedInfoCards 单元 spec（OP-07，FR-6 榜单 89 行件）
 *
 * 锚定面（消费方 useAssetInfoCards 组合基础卡片，此处锚单元语义）：
 *   1. 无申请人/保管人/仓库 → visible=false（空资料不渲染空卡）
 *   2. 有资料 → 标题/图标/字段标签逐项在位
 *   3. 申请人/保管人状态列 formatter → getStatusDisplay 单源派生
 *   4. 仓库类型 formatter → storageMapping 派生，未知类型回落「未知类型」
 *   5. description：null / 空白串不可见，有内容可见且 layout=description
 */
import { ref } from 'vue'
import { describe, it, expect } from 'vitest'

import { useAssetExtendedInfoCards } from '@/composables/useAssetExtendedInfoCards'
import { getStatusDisplay, storageMapping } from '@/utils/Format'
import type { AssetDetail } from '@/types/asset'

function detail(partial: Partial<AssetDetail>): Ref<AssetDetail | null> {
  return ref({ ...(partial as object) } as AssetDetail)
}

describe('useAssetExtendedInfoCards', () => {
  it('无申请人/保管人/仓库 → 三卡 visible=false', () => {
    const { applicantCard, managerCard, storageCard, descriptionCard } = useAssetExtendedInfoCards(
      detail({}),
    )
    expect(applicantCard.value.visible).toBe(false)
    expect(managerCard.value.visible).toBe(false)
    expect(storageCard.value.visible).toBe(false)
    expect(descriptionCard.value.visible).toBe(false)
  })

  it('申请人卡：标题/图标/字段在位，状态列经 getStatusDisplay 派生', () => {
    const { applicantCard, managerCard } = useAssetExtendedInfoCards(
      detail({
        asset_applicant: {
          employee_jobcode: 'JC-A',
          employee_name: '张申请人',
          employee_department_name: '研发部',
          employee_status: 'active',
          employee_phone: '13800000001',
          employee_location: '楼A',
        },
        asset_manager: {
          employee_jobcode: 'JC-M',
          employee_name: '李保管',
          employee_department_name: '研发部',
          employee_status: 'active',
          employee_phone: '13800000002',
          employee_location: '楼B',
        },
      }),
    )
    expect(applicantCard.value.title).toBe('资产申请人信息')
    expect(applicantCard.value.icon).toBe('User')
    expect(applicantCard.value.visible).toBe(true)
    const flatA = applicantCard.value.fields.flat().map((f) => f.label)
    expect(flatA).toContain('申请人部门')
    expect(flatA).toContain('申请人工号')
    expect(flatA).toContain('申请人状态')
    const statusA = applicantCard.value.fields.flat().find((f) => f.label === '申请人状态')
    expect(statusA?.formatter?.('active')).toBe(getStatusDisplay('active'))
    expect(managerCard.value.title).toBe('资产保管人信息')
    const statusM = managerCard.value.fields.flat().find((f) => f.label === '保管人状态')
    expect(statusM?.formatter?.('left')).toBe(getStatusDisplay('left'))
  })

  it('仓库卡：类型列经 storageMapping 派生，未知类型回落文案', () => {
    const { storageCard } = useAssetExtendedInfoCards(
      detail({
        asset_storage: {
          storage_code: 'WH01',
          storage_name: '一号仓',
          storage_type: 'unknown_type_x',
          storage_address: '地址x',
          storage_description: '描述x',
        },
      }),
    )
    expect(storageCard.value.title).toBe('存储位置')
    expect(storageCard.value.icon).toBe('Location')
    expect(storageCard.value.visible).toBe(true)
    const typeField = storageCard.value.fields.flat().find((f) => f.label === '仓库类型')
    expect(typeField?.formatter?.(Object.keys(storageMapping)[0])).toBe(
      storageMapping[Object.keys(storageMapping)[0]] ?? '未知类型',
    )
    expect(typeField?.formatter?.('not_a_type')).toBe('未知类型')
  })

  it('描述卡：null / 纯空白不可见；有内容 visible + layout=description', () => {
    const cardsNull = useAssetExtendedInfoCards(detail({ asset_description: null as never }))
    expect(cardsNull.descriptionCard.value.visible).toBe(false)
    const cardsBlank = useAssetExtendedInfoCards(detail({ asset_description: '   ' as never }))
    expect(cardsBlank.descriptionCard.value.visible).toBe(false)
    const { descriptionCard } = useAssetExtendedInfoCards(
      detail({ asset_description: '使用说明' as never }),
    )
    expect(descriptionCard.value.visible).toBe(true)
    expect(descriptionCard.value.layout).toBe('description')
    expect(descriptionCard.value.fields[0][0].value).toBe('使用说明')
  })
})
