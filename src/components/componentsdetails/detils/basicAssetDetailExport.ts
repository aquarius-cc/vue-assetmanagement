/**
 * @file 资产详情导出列配置（自 BasicAssetDetails.vue 提取，便于单测覆盖）
 * @module components/componentsdetails/detils/basicAssetDetailExport
 * @exports
 *   - basicAssetDetailExportColumns: 详情页 Excel 导出列配置
 * @callers
 *   - components/componentsdetails/detils/BasicAssetDetails.vue
 * @dependsOn
 *   - utils/excelExporter (ColumnConfig)
 *   - utils/Format (formatDate / getAssetStatusText)
 *   - types/asset (AssetDetail)
 */
import type { AssetDetail } from '@/types/asset'
import type { ColumnConfig } from '@/utils/excelExporter'
import { formatDate, getAssetStatusText } from '@/utils/Format'

/**
 * 资产详情导出列
 * 【BF-081】detail 路由行由 AssetDetailSerializer 输出：仅嵌套关联对象
 * （asset_type/asset_contract/asset_storage/asset_*_person），无平铺 _code/_jobcode 键。
 * 分类/合同/仓库/人员 6 列必须经 formatter 从嵌套对象取值，否则 Excel 对应单元格恒为空。
 */
export const basicAssetDetailExportColumns: ColumnConfig<AssetDetail>[] = [
  { title: '资产编码', key: 'asset_code', default: '' },
  { title: '资产名称', key: 'asset_name', default: '' },
  { title: '品牌', key: 'asset_brand', default: '' },
  { title: '单位', key: 'asset_unit', default: '' },
  { title: '型号规格', key: 'asset_specification', default: '' },
  {
    title: '资产分类',
    key: 'asset_type_code',
    default: '',
    formatter: (_v, row) => row?.asset_type?.type_code ?? '',
  },
  {
    title: '单价',
    key: 'asset_purchase_price',
    default: '0',
    formatter: (v) => String(v ?? '0'),
  },
  {
    title: '实物数量',
    key: 'asset_purchase_number',
    default: '0',
    formatter: (v) => String(v ?? '0'),
  },
  {
    title: '采购日期',
    key: 'asset_purchase_date',
    default: '',
    formatter: (v) => formatDate(v as string) || '',
  },
  {
    title: '质保期',
    key: 'asset_warranty_period',
    default: '0',
    formatter: (v) => String(v ?? '0'),
  },
  {
    title: '录入日期',
    key: 'asset_entry_date',
    default: '',
    formatter: (v) => formatDate(v as string) || '',
  },
  {
    title: '当前使用状态',
    key: 'asset_current_status',
    default: '',
    formatter: (v) => getAssetStatusText(v as string),
  },
  {
    title: '录入人工号',
    key: 'asset_entry_person_jobcode',
    default: '',
    formatter: (_v, row) => row?.asset_entry_person?.employee_jobcode ?? '',
  },
  {
    title: '合同编码',
    key: 'asset_contract_code',
    default: '',
    formatter: (_v, row) => row?.asset_contract?.contract_code ?? '',
  },
  {
    title: '申请人工号',
    key: 'asset_applicant_jobcode',
    default: '',
    formatter: (_v, row) => row?.asset_applicant?.employee_jobcode ?? '',
  },
  {
    title: '保管人工号',
    key: 'asset_manager_jobcode',
    default: '',
    formatter: (_v, row) => row?.asset_manager?.employee_jobcode ?? '',
  },
  { title: '使用地点', key: 'asset_using_location', default: '' },
  {
    title: '仓库编码',
    key: 'asset_storage_code',
    default: '',
    formatter: (_v, row) => row?.asset_storage?.storage_code ?? '',
  },
  { title: '资产描述', key: 'asset_description', default: '' },
]
