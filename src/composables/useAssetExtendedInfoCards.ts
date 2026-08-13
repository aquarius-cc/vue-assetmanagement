/**
 * @file 资产详情扩展卡片配置（申请人/保管人/仓库/描述）
 * @module composables/useAssetExtendedInfoCards
 * @exports
 *   - useAssetExtendedInfoCards: 生成资产详情扩展卡片配置
 * @callers
 *   - composables/useAssetInfoCards: 作为基础卡片的扩展组合
 * @dependsOn
 *   - types/asset: 资产详情类型
 *   - types/info-card: 卡片配置类型
 *   - utils/Format: 状态显示、仓库类型映射
 */
import { computed } from 'vue'
import type { Ref } from 'vue'
import type { AssetDetail } from '@/types/asset'
import type { InfoCardConfig } from '@/types/info-card'
import { getStatusDisplay, storageMapping } from '@/utils/Format'

/**
 * 生成资产详情页面的扩展卡片配置
 * @param assetDetail 资产详情响应式引用
 */
export function useAssetExtendedInfoCards(assetDetail: Ref<AssetDetail | null>) {
  const applicantCard = computed<InfoCardConfig>(() => {
    const applicant = assetDetail.value?.asset_applicant
    return {
      title: '资产申请人信息',
      icon: 'User',
      visible: !!applicant,
      fields: [
        [
          { label: '申请人部门', value: applicant?.employee_department_name },
          { label: '申请人工号', value: applicant?.employee_jobcode },
          { label: '申请人姓名', value: applicant?.employee_name },
        ],
        [
          {
            label: '申请人状态',
            value: applicant?.employee_status,
            formatter: (v: unknown) => getStatusDisplay(v as string | undefined),
          },
          { label: '申请人手机号', value: applicant?.employee_phone },
          { label: '使用人办公点', value: applicant?.employee_location },
        ],
      ],
    }
  })

  const managerCard = computed<InfoCardConfig>(() => {
    const manager = assetDetail.value?.asset_manager
    return {
      title: '资产保管人信息',
      icon: 'User',
      visible: !!manager,
      fields: [
        [
          { label: '保管人部门', value: manager?.employee_department_name },
          { label: '保管员工号', value: manager?.employee_jobcode },
          { label: '保管人姓名', value: manager?.employee_name },
        ],
        [
          {
            label: '保管人状态',
            value: manager?.employee_status,
            formatter: (v: unknown) => getStatusDisplay(v as string | undefined),
          },
          { label: '保管人手机号', value: manager?.employee_phone },
          { label: '保管人办公点', value: manager?.employee_location },
        ],
      ],
    }
  })

  const storageCard = computed<InfoCardConfig>(() => {
    const storage = assetDetail.value?.asset_storage
    return {
      title: '存储位置',
      icon: 'Location',
      visible: !!storage,
      fields: [
        [
          { label: '仓库编码', value: storage?.storage_code },
          { label: '仓库名称', value: storage?.storage_name },
          {
            label: '仓库类型',
            value: storage?.storage_type,
            formatter: (v) => storageMapping[v as string] ?? '未知类型',
          },
        ],
        [
          { label: '仓库地址', value: storage?.storage_address },
          { label: '仓库描述', value: storage?.storage_description },
        ],
      ],
    }
  })

  const descriptionCard = computed<InfoCardConfig>(() => {
    const desc = assetDetail.value?.asset_description
    return {
      title: '资产描述',
      icon: 'InfoFilled',
      visible: !!desc?.trim(),
      layout: 'description',
      fields: [[{ label: '', value: desc }]],
    }
  })

  return { applicantCard, managerCard, storageCard, descriptionCard }
}
