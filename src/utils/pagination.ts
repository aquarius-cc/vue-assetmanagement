/**
 * @file 分页配置常量
 * @module utils/pagination
 * @description
 *   分页下拉可选条目数（page-sizes）的唯一来源。
 *   各列表页若需要相同分档，必须引用此处常量，禁止在组件内重复声明字面量（DR-1）。
 */
// [M-23] 收敛为 [20, 50, 100]：后端 MAX_PAGE_SIZE=100（core/constants.py:12）对
// 超限 page_size 静默夹取，200/500 选项产生「选了没生效」错觉，故删除；
// 原档位中 10 与后端上限语义无冲突但与主流档位不齐，一并收敛。
// 更大批量走独立导出接口（P2-04 已迁服务端流式导出）。
export const PAGE_SIZE_OPTIONS = [20, 50, 100] as const

/** 后端单页上限镜像（唯一真值在 backend core/constants.py MAX_PAGE_SIZE），供一致性断言 */
export const MAX_PAGE_SIZE = 100
