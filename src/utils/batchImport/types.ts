/**
 * @file 批量导入通用配置类型定义，确保类型安全
 * @module src/utils/batchImport/types
 * @exports
 *   - BatchImportConfig: 批量导入配置泛型接口（含 Excel 映射、验证、转换、提交等配置）
 * @callers
 *   - composables/useBatchImport
 * @dependsOn
 *   - 无外部依赖
 */

export interface BatchImportConfig<TExcel extends object, TApi extends object> {
  /** 实体名称，用于日志提示 */
  entityName: string // 实体名称（用于提示）
  /** Excel 表头到数据字段的映射，如 { "编码": "asset_type_code" } */
  requiredFields: (keyof TExcel)[] // 必填字段（用于验证）
  excelHeaderMap: Record<string, keyof TExcel> // Excel 列名 -> TExcel 字段 列名到字段的映射（用于解析）
  /** 单条数据验证，返回是否通过和错误详情 */
  validateItem: (item: TExcel) => {
    valid: boolean
    errors: Record<string, string> // ← 注意：不是 Partial，必须是 string -> string
  } // 数据验证函数
  /** 转换：Excel 数据 → API 提交数据 */
  transformToApiData: (item: TExcel) => TApi // 转换：Excel 数据 → API 提交数据
  /** 创建实体的 API 方法，返回 Promise */
  createFn: (data: TApi) => Promise<unknown> // 创建函数
  /** 主键字段名，用于错误日志中标识记录 */
  idField?: keyof TApi // ID 字段（用于错误日志）
  /** 并发数量，默认 5 */
  concurrency?: number // 并发数
}
