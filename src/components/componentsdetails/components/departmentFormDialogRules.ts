/**
 * 部门表单静态验证规则（自 DepartmentFormDialog.vue 物理提取，零逻辑变更）
 *
 * 仅包含与组件状态无关的纯规则；上级部门的自定义校验器
 * （依赖部门树与编辑态）保留在组件内。
 */
import type { FormRules } from 'element-plus'

/** 部门编码/名称/信息员/排序的静态验证规则 */
export const departmentFormStaticRules: FormRules = {
  department_code: [
    { required: true, message: '请输入部门编码', trigger: 'blur' },
    { min: 2, max: 20, message: '长度在 2 到 20 个字符', trigger: 'blur' },
    {
      pattern: /^[a-zA-Z0-9_-]+$/,
      message: '只能包含字母、数字、下划线和横线',
      trigger: 'blur',
    },
  ],
  department_name: [
    { required: true, message: '请输入部门名称', trigger: 'blur' },
    { min: 2, max: 50, message: '长度在 2 到 50 个字符', trigger: 'blur' },
  ],
  department_information: [
    { required: true, message: '请输入部门信息员', trigger: 'blur' },
    { max: 50, message: '最多 50 个字符', trigger: 'blur' },
  ],
  sort_order: [
    { required: true, message: '请输入排序顺序', trigger: 'blur' },
    { type: 'number', min: 0, max: 9999, message: '范围 0-9999', trigger: 'blur' },
  ],
}
