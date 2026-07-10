import type { FormRules } from 'element-plus'

/**
 * 资产表单验证规则
 * 对齐后端 AssetCreateSerializer 必填字段：
 * - asset_name（必填）
 * - asset_type（必填）
 * - asset_purchase_price（必填）
 * - asset_purchase_date（必填）
 * - asset_entry_date（必填）
 *
 * 其余字段后端均为可选
 */
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
