/**
 * @file 分页配置常量
 * @module utils/pagination
 * @description
 *   分页下拉可选条目数（page-sizes）的唯一来源。
 *   各列表页若需要相同分档，必须引用此处常量，禁止在组件内重复声明字面量（DR-1）。
 */
export const PAGE_SIZE_OPTIONS = [10, 20, 50] as const
