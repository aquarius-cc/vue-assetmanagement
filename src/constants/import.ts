/**
 * 批量导入闸门常量（A3/MA-03）
 *
 * @module constants/import
 * @callers
 *   - utils/readExcelFile（fail-fast 闸门）
 *   - composables/useBatchImport → 各导入 config（maxRows 注入）
 *
 * 口径（拍板 2026-11-16）：
 * - IMPORT_MAX_BATCH_ROWS = 100：与后端 MAX_BATCH_SIZE 一致
 *   （asset_management_backend/core/constants.py:19，asset_batch_serializers.py 超限整单 400）。
 *   前端 fail-fast 先于后端整单拒绝，避免用户填完 10000 行才收到 400。
 * - IMPORT_MAX_FILE_BYTES = 10MB：内存保护闸（readExcelFile 全量入内存），
 *   与 nginx client_max_body_size 10m 独立（后者为单请求 JSON 体积上限）。
 * - 资产导入为单请求批量提交；逐行导入路径（DamagedAsset 等）受后端 100/min 限流约束，
 *   不注入 maxRows。万行导入需客户端分片，属独立改动（[待确认] 后端同限立项与否）。
 */

/** 批量导入行数上限：与后端 MAX_BATCH_SIZE 对齐（拍板值 100） */
export const IMPORT_MAX_BATCH_ROWS = 100

/** 导入文件大小上限：10MB（内存保护闸，SC-5 前端镜像） */
export const IMPORT_MAX_FILE_BYTES = 10 * 1024 * 1024
