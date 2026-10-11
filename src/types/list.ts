/**
 * 通用列表组件类型定义
 * 从 CommonList.vue 提取，供 CommonList / CommonListColumn / *Details 组件共用
 */

export interface TableColumn {
  type?: 'index' | 'custom' | 'default'
  prop?: string
  label: string
  width?: number | string
  /** 最小列宽：配合 el-table fit 铺满容器，剩余宽度按比例摊给各列（批次 E 列宽策略） */
  minWidth?: number
  align?: 'left' | 'center' | 'right'
  /** 固定列：左侧固定须为声明序前缀（EP 按 [left]+[非fixed]+[right] 重排），右侧固定无序约束 */
  fixed?: 'left' | 'right'
  slotName?: string
}
