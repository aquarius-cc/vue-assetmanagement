/**
 * @file 资产表单验证规则，对齐后端 AssetCreateSerializer 必填字段
 * @module src/utils/assetFormRules
 * @exports
 *   - assetFormRules: 资产表单 Element Plus 验证规则集
 * @callers
 *   - components/componentsdetails/detils/AssetForm.vue
 * @dependsOn
 *   - element-plus (FormRules)
 */

import type { FormRules } from 'element-plus'

export const assetFormRules: FormRules = {
  asset_name: [
    { required: true, message: '请输入资产名称', trigger: 'blur' },
    { min: 2, max: 100, message: '长度 2-100 字符', trigger: 'blur' },
  ],
  asset_type: [{ required: true, message: '请选择资产类型', trigger: ['change', 'blur'] }],
  asset_purchase_price: [
    { required: true, message: '请输入单价', trigger: 'blur' },
    { type: 'number', min: 0, message: '单价不能为负数', trigger: 'blur' },
  ],
  asset_purchase_date: [{ required: true, message: '请选择采购日期', trigger: 'change' }],
  asset_entry_date: [{ required: true, message: '请选择录入日期', trigger: 'change' }],
}
