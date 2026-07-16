// utils/batchImport/types.ts 定义通用类型 批量导入配置
// export interface BatchImportConfig<TExcel, TApi> {
//   // Excel 列名到字段的映射（用于解析）
//   excelHeaderMap: Record<string, keyof TExcel>

//   // 必填字段（用于验证）
//   requiredFields: (keyof TExcel)[]

//   // 数据验证函数
//   validateItem: (item: TExcel) => { valid: boolean; errors: Record<string, string> }

//   // 转换：Excel 数据 → API 提交数据
//   transformToApiData: (item: TExcel) => TApi

//   // 创建函数
//   createFn: (data: TApi) => Promise<unknown>

//   // 实体名称（用于提示）
//   entityName: string

//   // ID 字段（用于错误日志）
//   idField?: keyof TExcel

//   // 并发数
//   concurrency?: number
// }
// 批量导入通用配置类型，确保类型安全
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
