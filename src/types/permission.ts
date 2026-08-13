/**
 * @file 权限与数据范围类型定义（对齐后端 RBAC 结构）
 * @module types/permission
 * @exports
 *   - Permission: 权限点对象（对应后端 Permission 模型 + PermissionSerializer）
 *   - DataScope: 数据范围联合类型（对应后端 PermissionService._merge_data_scopes 输出）
 * @dependsOn
 *   - 无外部依赖
 */

/**
 * 权限点对象
 * 对齐后端 PermissionSerializer.Meta.fields
 * (apps/usermanagement/serializers.py:569-575)
 */
export interface Permission {
  /** 主键 ID */
  id: number
  /** 权限码，格式 module:action，如 "asset:create" */
  permission_code: string
  /** 所属模块，如 asset、outasset */
  module: string
  /** 操作类型，如 read、create、update、delete */
  action: string
  /** 权限描述（可为空字符串） */
  description: string
}

/**
 * 数据范围（联合类型）
 * 对齐后端 PermissionService._merge_data_scopes 输出
 * (apps/usermanagement/services/permission_service.py:103-143)
 *
 * 合并后仅两种形态：
 * - all: 全部数据（superuser 或任一角色含 all）
 * - departments: 限定部门（单角色 department 输入会归一为 departments）
 */
export type DataScope =
  | { scope_type: 'all' }
  | {
      scope_type: 'departments'
      /** 部门编码列表（无权限时为空数组） */
      department_codes: string[]
      /** 是否包含子部门 */
      include_children: boolean
    }
