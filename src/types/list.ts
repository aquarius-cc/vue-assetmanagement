/**
 * 通用列表组件类型定义
 * 从 CommonList.vue 提取，供 CommonList / CommonListColumn / *Details 组件共用
 */

export interface TableColumn {
  type?: 'index' | 'custom' | 'default'
  prop?: string
  label: string
  width?: number | string
  align?: 'left' | 'center' | 'right'
  slotName?: string
}
