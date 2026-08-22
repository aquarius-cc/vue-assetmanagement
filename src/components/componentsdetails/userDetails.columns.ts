/**
 * 用户详情页表格列配置（自 UserDetails.vue 物理提取，零逻辑变更）
 */
import type { TableColumn } from '@/types/list'

/**
 * 表格列定义
 * 每一列的渲染方式、标题、宽度等属性
 */
export const userDetailsColumns: TableColumn[] = [
  { type: 'index', label: '序号', width: 80, align: 'center' },
  { prop: 'employee_name', label: '姓名', align: 'center' },
  { prop: 'employee_jobcode', label: '工号', align: 'center' },
  { prop: 'sort_order', label: '排序', align: 'center' },
  {
    type: 'custom',
    prop: 'employee_status',
    label: '状态',
    align: 'center',
    slotName: 'employee_status',
  },
  { prop: 'employee_phone', label: '电话', align: 'center' },
  { prop: 'employee_location', label: '位置', align: 'center' },
  {
    type: 'custom',
    prop: 'employee_department_name',
    label: '部门',
    align: 'center',
    slotName: 'employee_department_name',
  },
  { prop: 'employee_description', label: '描述', align: 'center' },
]
