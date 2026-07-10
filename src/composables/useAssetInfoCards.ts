/**
 * useAssetInfoCards.ts
 * 资产详情页面卡片配置 composable
 *
 * @module composables/useAssetInfoCards
 * @description
 * 根据资产详情数据生成 InfoCard 组件所需的配置对象�? * 支持响应式更新，�?assetDetail 变化时自动重新计算卡片配置�? *
 * @features
 * - 响应式：基于 computed 实现，数据变化自动更�? * - 条件可见：自动处理可选字段的 visible 状�? * - 格式化集成：内置日期、价格、枚举映射等格式化逻辑
 * - 类型安全：完整的 TypeScript 类型支持
 *
 * @usage
 * ```ts
 * const assetDetail = ref<AssetDetail | null>(null)
 * const { basicInfoCard, contractCard, ... } = useAssetInfoCards(assetDetail)
 * ```
 *
 * @author System
 * @date 2025-06-02
 */

import { computed } from 'vue'
import type { Ref } from 'vue'
import type { AssetDetail } from '@/types/asset'
import type { InfoCardConfig } from '@/types/info-card'
import {
  formatDate,
  formatNumber,
  getStatusDisplay,
  contractTypeMapping,
  contractSettlementStatusMapping,
  assetTypeMapping,
  storageMapping,
} from '@/utils/Format'

/**
 * 资产详情卡片配置 composable
 *
 * @param assetDetail - 资产详情响应式引�? * @returns 各卡片的配置对象（响应式�? *
 * @example
 * ```vue
 * <script setup>
 * import { useAssetInfoCards } from '@/composables/useAssetInfoCards'
 *
 * const assetDetail = ref<AssetDetail | null>(null)
 * const { basicInfoCard, contractCard } = useAssetInfoCards(assetDetail)
 * </script>
 *
 * <template>
 *   <InfoCard :config="basicInfoCard" />
 *   <InfoCard :config="contractCard" />
 * </template>
 * ```
 */
export function useAssetInfoCards(assetDetail: Ref<AssetDetail | null>) {
  // ===== 基本信息卡片 =====
  /**
   * 基本信息卡片配置
   * 包含资产编码、名称、品牌、价格等核心字段
   */
  const basicInfoCard = computed<InfoCardConfig>(() => {
    const asset = assetDetail.value
    return {
      title: '基本信息',
      icon: 'Document',
      fields: [
        // 左列字段
        [
          { label: '编码', value: asset?.asset_code },
          { label: '名称', value: asset?.asset_name },
          { label: '品牌', value: asset?.asset_brand },
          { label: '单位', value: asset?.asset_unit },
          { label: '型号规格', value: asset?.asset_specification },
          { label: '资产分类�?, value: asset?.asset_type?.asset_type_code || '�? },
          { label: '资产使用地点', value: asset?.asset_using_location || '�? },
        ],
        // 右列字段
        [
          {
            label: '单价',
            value: asset?.asset_purchase_price,
            isPrice: true,
            formatter: (v: unknown) => `¥${formatNumber(v as string | number)}`,
          },
          {
            label: '采购数量',
            value: asset?.asset_purchase_number,
            formatter: (v) => String(v ?? 0),
          },
          {
            label: '采购日期',
            value: asset?.asset_purchase_date,
            formatter: (v) => formatDate(v as string) ?? '�?,
          },
          {
            label: '质保�?,
            value: asset?.asset_warranty_period,
            formatter: (v) => `${v ?? 0} 个月`,
          },
          {
            label: '录入日期',
            value: asset?.asset_entry_date,
            formatter: (v) => formatDate(v as string) ?? '�?,
          },
          {
            label: '录入人工�?,
            value: asset?.asset_entry_person_jobcode,
          },
        ],
      ],
    }
  })

  // ===== 资产分类信息卡片 =====
  /**
   * 资产分类信息卡片配置
   * 展示资产的一级分类、二级分类等信息
   * 仅当 asset_type 存在时显�?   */
  const assetTypeCard = computed<InfoCardConfig>(() => {
    const asset = assetDetail.value
    const type = asset?.asset_type
    return {
      title: '资产分类信息',
      icon: 'Document',
      visible: !!type,
      fields: [
        [
          { label: '资产分类�?, value: type?.asset_type_code || '�? },
          {
            label: '资产类别',
            value: type?.asset_type_category || '�?,
            formatter: (v) => assetTypeMapping[v as string] ?? String(v ?? '�?),
          },
        ],
        [
          { label: '一级分�?, value: type?.asset_type_primary },
          { label: '二级分类', value: type?.asset_type_secondary },
          { label: '分类描述', value: type?.asset_type_description },
        ],
      ],
    }
  })

  // ===== 合同信息卡片 =====
  /**
   * 合同信息卡片配置
   * 展示关联合同的详细信�?   * 仅当 asset_contract 存在时显�?   */
  const contractCard = computed<InfoCardConfig>(() => {
    const contract = assetDetail.value?.asset_contract
    return {
      title: '合同信息',
      icon: 'Document',
      visible: !!contract,
      fields: [
        [
          { label: '合同编码', value: contract?.contract_code },
          { label: '合同名称', value: contract?.contract_name },
          {
            label: '合同类型',
            value: contract?.contract_type,
            formatter: (v) => contractTypeMapping[v as string] ?? String(v ?? '�?),
          },
          { label: '供应�?, value: contract?.contract_supplier },
        ],
        [
          {
            label: '合同金额',
            value: contract?.contract_price,
            isPrice: true,
            formatter: (v: unknown) => `¥${formatNumber(v as string | number)}`,
          },
          {
            label: '签订日期',
            value: contract?.contract_signing_date,
            formatter: (v) => formatDate(v as string) ?? '�?,
          },
          {
            label: '结算状�?,
            value: contract?.contract_settledment_status,
            formatter: (v) => contractSettlementStatusMapping[v as string] ?? String(v ?? '�?),
          },
        ],
      ],
    }
  })

  // ===== 录入人信息卡�?=====
  /**
   * 录入人信息卡片配�?   * 展示资产录入人员的工号和姓名
   * 仅当 asset_entry_person 存在时显�?   */
  const entryPersonCard = computed<InfoCardConfig>(() => {
    const person = assetDetail.value?.asset_entry_person
    return {
      title: '录入人信�?,
      icon: 'User',
      visible: !!person,
      fields: [
        [{ label: '录入人工�?, value: person?.employee_jobcode }],
        [{ label: '录入人姓�?, value: person?.employee_name }],
      ],
    }
  })

  // ===== 申请人信息卡�?=====
  /**
   * 资产申请人信息卡片配�?   * 展示申请人的部门、工号、姓名、状态等信息
   * 仅当 asset_applicant 存在时显�?   */
  const applicantCard = computed<InfoCardConfig>(() => {
    const applicant = assetDetail.value?.asset_applicant
    return {
      title: '资产申请人信�?,
      icon: 'User',
      visible: !!applicant,
      fields: [
        [
          {
            label: '申请人部�?,
            value: applicant?.employee_department_name,
          },
          { label: '申请人工�?, value: applicant?.employee_jobcode },
          { label: '申请人姓�?, value: applicant?.employee_name },
        ],
        [
          {
            label: '申请人状�?,
            value: applicant?.employee_status,
            formatter: (v: unknown) => getStatusDisplay(v as string | undefined),
          },
          { label: '申请人手机号', value: applicant?.employee_phone },
          { label: '使用人办公点', value: applicant?.employee_location },
        ],
      ],
    }
  })

  // ===== 保管人信息卡�?=====
  /**
   * 资产保管人信息卡片配�?   * 展示保管人的部门、工号、姓名、状态等信息
   * 仅当 asset_manager 存在时显�?   */
  const managerCard = computed<InfoCardConfig>(() => {
    const manager = assetDetail.value?.asset_manager
    return {
      title: '资产保管人信�?,
      icon: 'User',
      visible: !!manager,
      fields: [
        [
          {
            label: '保管人部�?,
            value: manager?.employee_department_name,
          },
          { label: '保管员工�?, value: manager?.employee_jobcode },
          { label: '保管人姓�?, value: manager?.employee_name },
        ],
        [
          {
            label: '保管人状�?,
            value: manager?.employee_status,
            formatter: (v: unknown) => getStatusDisplay(v as string | undefined),
          },
          { label: '保管人手机号', value: manager?.employee_phone },
          { label: '保管人办公点', value: manager?.employee_location },
        ],
      ],
    }
  })

  // ===== 存储位置卡片 =====
  /**
   * 存储位置卡片配置
   * 展示仓库编码、名称、类型、地址等信�?   * 仅当 asset_storage 存在时显�?   */
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

  // ===== 资产描述卡片 =====
  /**
   * 资产描述卡片配置
   * 使用单列文本布局展示长文本描�?   * 仅当 asset_description 存在且非空时显示
   */
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

  return {
    basicInfoCard,
    assetTypeCard,
    contractCard,
    entryPersonCard,
    applicantCard,
    managerCard,
    storageCard,
    descriptionCard,
  }
}
