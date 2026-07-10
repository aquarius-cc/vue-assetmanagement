/**
 * info-card.ts
 * 通用信息卡片组件类型定义
 *
 * @module types/info-card
 * @description 定义 InfoCard 组件的配置接口，用于数据驱动的卡片渲染
 */

/**
 * 单个信息字段配置
 *
 * @description 用于 InfoCard 组件的二维字段数组中的单个字段定义
 * @example
 * ```ts
 * const field: InfoField = {
 *   label: '资产编码',
 *   value: 'ABC123',
 *   isPrice: false,
 *   formatter: (v) => String(v).toUpperCase()
 * }
 * ```
 */
export interface InfoField {
  /**
   * 字段标签
   * 显示在字段值左侧的描述文字
   */
  label: string

  /**
   * 字段值
   * 原始值，由 formatter 处理后显示
   * 支持任意类型，通过 formatter 转换为字符串
   */
  value: unknown

  /**
   * 默认值
   * 当 value 为 null、undefined 或空字符串时显示
   * @default '无'
   */
  defaultValue?: string

  /**
   * 自定义格式化函数
   * 用于将原始值转换为显示文本
   * @param value - 原始字段值
   * @returns 格式化后的显示文本
   * @example
   * ```ts
   * formatter: (v) => formatDate(v as string) ?? '无'
   * ```
   */
  formatter?: (value: unknown) => string

  /**
   * 是否为价格字段
   * 为 true 时应用特殊的价格样式（橙色、加粗）
   * @default false
   */
  isPrice?: boolean
}

/**
 * 信息卡片配置
 *
 * @description 传递给 InfoCard 组件的配置对象，定义卡片的标题、图标、字段等
 * @example
 * ```ts
 * const cardConfig: InfoCardConfig = {
 *   title: '基本信息',
 *   icon: 'Document',
 *   visible: true,
 *   layout: 'grid',
 *   fields: [
 *     [{ label: '编码', value: 'ABC123' }],
 *     [{ label: '名称', value: '测试资产' }]
 *   ]
 * }
 * ```
 */
export interface InfoCardConfig {
  /**
   * 卡片标题
   * 显示在卡片头部的标题文字
   */
  title: string

  /**
   * 卡片图标
   * Element Plus 图标组件名称
   * - Document: 文档图标，用于基本信息
   * - User: 用户图标，用于人员信息
   * - Location: 位置图标，用于存储位置
   * - InfoFilled: 信息图标，用于描述信息
   * - Tickets: 票据图标，用于合同信息
   * - Stamp: 印章图标，用于合同信息
   * - UserFilled: 填充用户图标，用于保管人信息
   * - Avatar: 头像图标，用于人员信息
   */
  icon: 'Document' | 'User' | 'Location' | 'InfoFilled' | 'Tickets' | 'Stamp' | 'UserFilled' | 'Avatar'

  /**
   * 字段配置
   * 二维数组，每个子数组代表一列
   * - fields[0]: 左列字段
   * - fields[1]: 右列字段
   * - 支持更多列，但通常使用两列布局
   */
  fields: InfoField[][]

  /**
   * 是否显示卡片
   * 用于条件渲染，如可选数据块
   * - true: 显示卡片
   * - false: 隐藏卡片
   * @default true
   */
  visible?: boolean

  /**
   * 卡片布局类型
   * - grid: 双列网格布局，适用于键值对信息
   * - description: 单列文本布局，适用于长文本描述
   * @default 'grid'
   */
  layout?: 'grid' | 'description'
}
