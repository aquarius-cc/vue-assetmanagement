// 通用类型定义

// API响应基础接口（AGENTS.md §3 跨端契约：code=0 成功，message 字段名）
export interface ApiResponse<T = unknown> {
  code: number
  message: string
  data: T
}

// 分页响应接口（AGENTS.md §3 跨端契约：page/page_size 参数名）
export interface PaginatedResponse<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
  total_pages: number
  page: number
  page_size: number
}

// 分页查询参数
export interface PaginationParams {
  page?: number
  page_size?: number
}

// 搜索查询参数
export interface SearchParams {
  search?: string
  ordering?: string
}

// 日期范围查询参数
export interface DateRangeParams {
  start_date?: string
  end_date?: string
}

// 基础查询参数（组合上述所有参数）
export interface BaseQueryParams extends PaginationParams, SearchParams, DateRangeParams {}

// 表单验证规则接口
export interface FormRule {
  required?: boolean
  message: string
  trigger?: 'blur' | 'change'
  type?:
    | 'string'
    | 'number'
    | 'boolean'
    | 'method'
    | 'regexp'
    | 'integer'
    | 'float'
    | 'array'
    | 'object'
    | 'enum'
    | 'date'
    | 'url'
    | 'hex'
    | 'email'
  min?: number
  max?: number
  pattern?: RegExp
}

// 表格列配置接口
export interface TableColumn {
  prop?: string
  label: string
  width?: string | number
  minWidth?: string | number
  fixed?: boolean | 'left' | 'right'
  sortable?: boolean
  formatter?: (
    row: Record<string, unknown>,
    column: TableColumn,
    cellValue: unknown,
    index: number,
  ) => string
  type?: 'selection' | 'index' | 'expand'
}

// 菜单项接口
export interface MenuItem {
  id: string
  name: string
  path?: string
  icon?: string
  children?: MenuItem[]
  meta?: {
    requiresAuth?: boolean
    roles?: string[]
    title?: string
  }
}

// 文件上传响应接口
export interface FileUploadResponse {
  url: string
  filename: string
  size: number
  type: string
}

// 操作按钮接口
export interface ActionButton {
  label: string
  type?: 'primary' | 'success' | 'warning' | 'danger' | 'info'
  icon?: string
  disabled?: boolean
  loading?: boolean
  onClick: () => void | Promise<void>
}

// 状态选项接口
export interface StatusOption {
  value: string
  label: string
  color?: string
  disabled?: boolean
}

// 注意：资产状态枚举已统一在 types/asset.ts 的 AssetCurrentStatus 中定义
// 删除冗余的 AssetStatus 枚举（P0-7 修复：避免与 AssetCurrentStatus 矛盾）

// 用户状态枚举
export enum UserStatus {
  ACTIVE = '正常',
  INACTIVE = '禁用',
  PENDING = '待激活',
}

// 操作类型枚举
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  VIEW = 'view',
}

// 排序方向枚举
export enum SortDirection {
  ASC = 'asc',
  DESC = 'desc',
}

// 导出格式枚举
export enum ExportFormat {
  EXCEL = 'xlsx',
  CSV = 'csv',
  PDF = 'pdf',
}

// 通用选择器选项接口
export interface SelectOption {
  value: string | number
  label: string
  disabled?: boolean
  children?: SelectOption[]
}

// 面包屑导航接口
export interface BreadcrumbItem {
  name: string
  path?: string
}

// 统计卡片数据接口
export interface StatCard {
  title: string
  value: string | number
  icon?: string
  color?: string
  trend?: {
    value: number
    type: 'up' | 'down'
  }
}

// 图表数据接口
export interface ChartData {
  labels: string[]
  datasets: {
    label: string
    data: number[]
    backgroundColor?: string[]
    borderColor?: string[]
  }[]
}

// ===== SmartListContainer 组件类型定义 =====

import type { Ref } from 'vue'

/**
 * SmartListContainer 组件暴露的方法接口
 * 用于在父组件中通过 ref 获取组件实例并调用其方法
 */
export interface SmartListContainerExpose {
  /**
   * 刷新当前页数据
   * 根据当前是否有搜索词，决定是重新搜索还是重新加载列表
   */
  refresh: () => Promise<void>

  /**
   * 重置到第一页
   * 清空搜索词、搜索状态，回到初始状态
   */
  reset: () => Promise<void>

  /**
   * 执行搜索
   * @param keyword 搜索关键词
   */
  search: (keyword: string) => Promise<void>

  /**
   * 执行多参数搜索
   * @param params 搜索参数对象（key-value 对）
   */
  searchWithParams: (params: Record<string, string>) => Promise<void>

  /**
   * 当前页码（响应式）
   */
  currentPage: Ref<number>

  /**
   * 每页条数（响应式）
   */
  pageSize: Ref<number>

  /**
   * 表格数据（响应式）
   */
  data: Ref<unknown[]>

  /**
   * 清空表格多选状态
   * 批量删除成功后调用，重置选中行
   */
  clearSelection: () => void
}

// ===== SearchBar 组件类型定义 =====

/**
 * 搜索字段类型
 * - text: 文本输入框
 * - select: 下拉选择框
 * - date: 日期选择器
 * - dateRange: 日期范围选择器
 */
export type SearchFieldType = 'text' | 'select' | 'date' | 'dateRange'

/**
 * 搜索字段配置
 * 用于定义搜索栏中的单个输入字段
 */
export interface SearchFieldConfig {
  /** 字段 key（对应后端查询参数名） */
  key: string
  /** 显示标签 */
  label: string
  /** 字段类型 */
  type: SearchFieldType
  /** 占位文本 */
  placeholder?: string
  /** 下拉选项（仅 type='select' 时使用） */
  options?: Array<{ label: string; value: string }>
  /** 默认值 */
  defaultValue?: string
  /** 占据列数（基于 24 栅格，默认 6） */
  span?: number
}

/**
 * SearchBar 组件 Props
 */
export interface SearchBarProps {
  /** 字段配置数组 */
  fields: SearchFieldConfig[]
  /** 搜索按钮文本 */
  searchButtonText?: string
  /** 是否显示重置按钮 */
  showReset?: boolean
}

/**
 * SearchBar 组件 Emits
 */
export interface SearchBarEmits {
  /** 搜索事件，返回所有非空字段的 key-value */
  search: [params: Record<string, string>]
  /** 重置事件 */
  reset: []
}
