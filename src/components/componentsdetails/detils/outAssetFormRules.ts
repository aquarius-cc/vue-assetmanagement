/**
 * 出库资产表单验证规则（自 OutAssetForm.vue 物理提取，零逻辑变更）
 *
 * 归还日期的 validator 依赖表单的 outasset_type 字段，
 * 因此以工厂函数形式创建规则，调用方传入 reactive 表单对象。
 */
import type { OutAssetCreateExtended } from '@/types/outasset'

/** 创建出库资产表单验证规则 */
export function createOutAssetRules(form: OutAssetCreateExtended) {
  return {
    outasset_code: [
      { required: true, message: '请输入出库资产编码', trigger: 'blur' },
      { min: 1, max: 50, message: '编码长度 1-50 字符', trigger: 'blur' },
    ],
    outasset_number: [
      { required: true, message: '请输入出库数量', trigger: 'blur' },
      { type: 'number', min: 1, message: '数量必须大于0', trigger: 'blur' },
    ],
    outasset_applicant_name: [{ required: true, message: '请选择申请人', trigger: 'change' }],
    outasset_manager_name: [{ required: true, message: '请选择保管人', trigger: 'change' }],
    outasset_using_location: [
      { required: true, message: '请输入使用地点', trigger: 'blur' },
      { min: 1, max: 200, message: '使用地点长度 1-200 字符', trigger: 'blur' },
    ],
    outasset_type: [{ required: true, message: '请选择出库类型', trigger: 'change' }],
    outasset_date: [{ required: true, message: '请选择出库日期', trigger: 'change' }],
    return_date: [
      {
        validator: (_rule: unknown, value: string, callback: (error?: Error | string) => void) => {
          if (form.outasset_type === 'borrow' && !value) {
            callback(new Error('借用类型必须填写归还日期'))
          } else {
            callback()
          }
        },
        trigger: 'change',
      },
    ],
  }
}
