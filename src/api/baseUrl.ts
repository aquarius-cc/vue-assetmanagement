/**
 * @file API 基础路径单一来源（DR-4），api/config 与 frontendLogSink 共用
 */

export const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1'
