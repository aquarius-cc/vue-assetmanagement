# 前端 API 接口文档

> 前端 `src/api/*.ts` 中的接口定义、请求参数、响应格式。与后端 `docs/API.md` 对应。

## 1. 基础设施

- `request.ts`：Axios 封装，含 Token 自动刷新（401 重试）、GET 缓存（MemoryCache）
- `unwrapResponse<T>()`：提取 `ApiResponse<T>.data`，统一错误处理
- `cache.ts`：通用内存缓存（Map-based, LRU, TTL 5min）

## 2. 资产管理 (`asset.ts`)

| 方法 | HTTP | URL | 说明 |
|------|------|-----|------|
| `getAssets` | GET | `/assets/assets/` | 资产列表（分页） |
| `createAsset` | POST | `/assets/assets/` | 创建资产（字段映射：6 个 FK） |
| `getAssetByCode` | GET | `/assets/assets/{asset_code}/` | 资产详情（缓存 5min） |
| `updateAsset` | PUT | `/assets/assets/{asset_code}/` | 更新资产（字段映射同 create） |
| `deleteAsset` | DELETE | `/assets/assets/{asset_code}/` | 删除资产（软删除） |
| `searchAssets` | GET | `/assets/assets/search/` | 搜索：`keyword`, `status`, `asset_type`, `storage_code`, `contract_code` |
| `combineSearch` | GET | `/assets/assets/combine_search/` | 联合搜索：`asset_name`, `asset_specification`, `asset_brand`, `asset_current_status`, `asset_type`, `asset_type_category`, `asset_storage`, `asset_contract` |
| `batchCreateAssets` | POST | `/assets/assets/batch-create/` | 批量创建 |
| `batchDeleteAssets` | POST | `/assets/assets/batch-delete/` | 批量删除 |
| `getAssetStatistics` | GET | `/assets/assets/statistics/` | 资产统计 |
| `getAssetHistory` | GET | `/assets/assets/{code}/history/` | 操作历史 |
| `getAssetTimeline` | GET | `/assets/assets/{code}/timeline/` | 状态时间线 |
| `searchAvailableAssets` | GET | `/assets/assets/search_available/` | 可用资产 |
| `getAssetByName` | GET | `/assets/assets/getassetbyname/{name}/` | 按名称查 |
| `getContractByAssetCode` | GET | `/assets/assets/contract_by_asset/{code}/` | 查关联合同 |
| `changeAssetStatus` | POST | `/assets/assets/{code}/change_status/` | 变更状态 |
| `getCombinedDetails` | GET | `/assets/assets/combined_details/` | 综合详情 |

**createAsset/updateAsset 字段映射**：

> 2026-06-28 重构：前端表单字段名已与后端 `AssetCreateSerializer` 对齐，API 层直接透传，无需额外映射。

| 前端字段 | 后端字段 | 后端 SlugRelatedField |
|----------|----------|----------------------|
| `asset_type` | `asset_type` | `slug_field='asset_type_code'` |
| `asset_contract` | `asset_contract` | `slug_field='contract_code'` |
| `asset_storage` | `asset_storage` | `slug_field='storage_code'` |
| `asset_entry_person` | `asset_entry_person` | `slug_field='employee_jobcode'` |
| `asset_applicant` | `asset_applicant` | `slug_field='employee_jobcode'` |
| `asset_manager` | `asset_manager` | `slug_field='employee_jobcode'` |

## 3. 出库管理 (`outAsset.ts`)

| 方法 | HTTP | URL | 说明 |
|------|------|-----|------|
| `getOutAssets` | GET | `/assets/out-assets/` | 出库列表 |
| `createOutAsset` | POST | `/assets/out-assets/` | 创建（映射：`outasset_code` → `outasset_asset`） |
| `getOutAssetByCode` | GET | `/assets/out-assets/{recordcode}/` | 详情 |
| `updateOutAsset` | PUT | `/assets/out-assets/{recordcode}/` | 更新（映射同 create） |
| `deleteOutAsset` | DELETE | `/assets/out-assets/{recordcode}/` | 删除 |
| `batchCreateOutAssets` | POST | `/assets/out-assets/batch-create/` | 批量创建 |
| `batchDeleteOutAssets` | POST | `/assets/out-assets/batch-delete/` | 批量删除 |
| `getRecyclableOutAssets` | GET | `/assets/out-assets/recyclable/` | 可回收列表 |
| `getOutAssetsByAsset` | GET | `/assets/out-assets/by-asset/{code}/` | 按资产查 |
| `getOutAssetsByApplicant` | GET | `/assets/out-assets/by-applicant/{code}/` | 按申请人查 |
| `getOutAssetStatistics` | GET | `/assets/out-assets/statistics/` | 统计 |

## 4. 回收管理 (`recycleAsset.ts`)

| 方法 | HTTP | URL | 说明 |
|------|------|-----|------|
| `getRecycleAssets` | GET | `/assets/recycle-assets/` | 回收列表 |
| `createRecycleAsset` | POST | `/assets/recycle-assets/` | 创建 |
| `getRecycleAssetByCode` | GET | `/assets/recycle-assets/{recordcode}/` | 详情 |
| `updateRecycleAsset` | PUT | `/assets/recycle-assets/{recordcode}/` | 更新 |
| `deleteRecycleAsset` | DELETE | `/assets/recycle-assets/{recordcode}/` | 删除 |
| `batchDeleteRecycleAssets` | POST | `/assets/recycle-assets/batch-delete/` | 批量删除 |
| `batchCreateRecycleAssets` | POST | `/assets/recycle-assets/batch-create/` | 批量创建（items + 共享字段 storage/person） |
| `getRecycleAssetsByAsset` | GET | `/assets/recycle-assets/by-asset/{code}/` | 按资产查 |
| `getRecycleAssetByOutAsset` | GET | `/assets/recycle-assets/by-outasset/{code}/` | 按出库查 |

## 5. 待报废管理 (`damagedAsset.ts`)

| 方法 | HTTP | URL | 说明 |
|------|------|-----|------|
| `getDamagedAssets` | GET | `/assets/damaged-assets/` | 列表 |
| `createDamagedAsset` | POST | `/assets/damaged-assets/` | 创建 |
| `getDamagedAsset` | GET | `/assets/damaged-assets/{damaged_asset}/` | 详情 |
| `updateDamagedAsset` | PUT | `/assets/damaged-assets/{damaged_asset}/` | 更新 |
| `deleteDamagedAsset` | DELETE | `/assets/damaged-assets/{damaged_asset}/` | 删除 |
| `batchDeleteDamagedAssets` | POST | `/assets/damaged-assets/batch-delete/` | 批量删除 |
| `getDamagedAssetsByAsset` | GET | `/assets/damaged-assets/by-asset/{code}/` | 按资产查 |

## 6. 已报废管理 (`wasteAsset.ts`)

| 方法 | HTTP | URL | 说明 |
|------|------|-----|------|
| `getWasteAssets` | GET | `/assets/waste-assets/` | 列表 |
| `getWasteAsset` | GET | `/assets/waste-assets/{asset_code}/` | 详情 |
| `deleteWasteAsset` | DELETE | `/assets/waste-assets/{asset_code}/` | 删除 |
| `batchDeleteWasteAssets` | POST | `/assets/waste-assets/batch-delete/` | 批量删除 |
| `getWasteAssetsByAsset` | GET | `/assets/waste-assets/by-asset/{code}/` | 按资产查 |
| `getWasteAssetStatistics` | GET | `/assets/waste-assets/statistics/` | 统计 |
| `getWasteAssetsByDateRange` | GET | `/assets/waste-assets/by-date-range/` | 按日期查 |

> 注意：WasteAsset 的 create/update 已被后端禁止（405），前端不提供对应方法。

## 7. 硬盘序列号管理 (`harddiskSn.ts`)

| 方法 | HTTP | URL | 说明 |
|------|------|-----|------|
| `getHardDiskSNs` | GET | `/assets/harddisk-sn/` | 列表 |
| `getHardDiskSN` | GET | `/assets/harddisk-sn/{harddisksn_asset}/` | 详情（lookup: 资产 recordcode） |
| `getHardDiskSNByCode` | POST | `/assets/harddisk-sn/search_by_serial_number/` | 按序列号查 |
| `createHardDiskSN` | POST | `/assets/harddisk-sn/` | 创建 |
| `updateHardDiskSN` | PUT | `/assets/harddisk-sn/{harddisksn_asset}/` | 更新 |
| `deleteHardDiskSN` | DELETE | `/assets/harddisk-sn/{harddisksn_asset}/` | 删除 |
| `saveHardDiskSNBatch` | POST | `/assets/harddisk-sn/batch/` | 批量保存（非 batch-create） |
| `getHardDiskSNsByAsset` | GET | `/assets/harddisk-sn/by-asset/{code}/` | 按资产查 |

## 8. 合同管理 (`contract.ts`)

| 方法 | HTTP | URL | 说明 |
|------|------|-----|------|
| `getContracts` | GET | `/assets/contracts/` | 合同列表 |
| `createContract` | POST | `/assets/contracts/` | 创建 |
| `getContractByCodeOrId` | GET | `/assets/contracts/{code}/` | 详情 |
| `updateContract` | PUT | `/assets/contracts/{code}/` | 更新 |
| `deleteContract` | DELETE | `/assets/contracts/{code}/` | 删除 |
| `batchCreateContracts` | POST | `/assets/contracts/batch-create/` | 批量创建 |
| `batchDeleteContracts` | POST | `/assets/contracts/batch-delete/` | 批量删除 |
| `getFuzzySearch` | GET | `/assets/contracts/search/` | 模糊搜索 |
| `getContractByName` | GET | `/assets/contracts/getcontractByname/{name}/` | 按名称查 |
| `getContractStatistics` | GET | `/assets/contracts/statistics/` | 统计 |
| `addPaymentRecord` | POST | `/assets/contracts/{code}/payment_record/` | 添加付款记录 |
| `updateSettlementStatus` | POST | `/assets/contracts/{code}/update_settlement_status/` | 更新结算状态 |

## 9. 仓库管理 (`storage.ts`)

| 方法 | HTTP | URL | 说明 |
|------|------|-----|------|
| `getStorages` | GET | `/assets/storages/` | 仓库列表 |
| `createStorage` | POST | `/assets/storages/` | 创建 |
| `getStorageByCode` | GET | `/assets/storages/{code}/` | 详情 |
| `updateStorage` | PUT | `/assets/storages/{code}/` | 更新 |
| `deleteStorage` | DELETE | `/assets/storages/{code}/` | 删除 |
| `batchCreateStorages` | POST | `/assets/storages/batch-create/` | 批量创建 |
| `batchDeleteStorages` | POST | `/assets/storages/batch-delete/` | 批量删除 |
| `getStorageStatistics` | GET | `/assets/storages/statistics/` | 统计 |

## 10. 资产类型管理 (`assetType.ts`)

| 方法 | HTTP | URL | 说明 |
|------|------|-----|------|
| `getAssetTypes` | GET | `/assets/asset-types/` | 类型列表 |
| `createAssetType` | POST | `/assets/asset-types/` | 创建 |
| `getAssetTypeByCode` | GET | `/assets/asset-types/{code}/` | 详情 |
| `updateAssetType` | PUT | `/assets/asset-types/{code}/` | 更新 |
| `deleteAssetType` | DELETE | `/assets/asset-types/{code}/` | 删除 |
| `batchCreateAssetTypes` | POST | `/assets/asset-types/batch-create/` | 批量创建 |
| `batchDeleteAssetTypes` | POST | `/assets/asset-types/batch-delete/` | 批量删除 |

## 11. 员工管理 (`user.ts`)

| 方法 | HTTP | URL | 说明 |
|------|------|-----|------|
| `getUserList` | GET | `/users/employees/` | 员工列表 |
| `createUser` | POST | `/users/employees/` | 创建 |
| `getUserByCode` | GET | `/users/employees/{code}/` | 详情 |
| `updateUser` | PUT | `/users/employees/{code}/` | 更新 |
| `deleteUser` | DELETE | `/users/employees/{code}/` | 删除 |
| `batchCreateUsers` | POST | `/users/employees/batch-create/` | 批量创建 |
| `batchDeleteUsers` | POST | `/users/employees/batch-delete/` | 批量删除 |
| `getFuzzySearch` | GET | `/users/employees/search/` | 模糊搜索 |
| `changeUserStatus` | POST | `/users/employees/{code}/change_status/` | 变更状态 |
| `batchUpdateSort` | PUT | `/users/employees/sort/` | 批量排序 |
| `getEmployeeDepartment` | GET | `/users/employees/{jobcode}/department/` | 根据工号查询所在部门（缓存 5min） |

## 12. 部门管理 (`department.ts`)

**DepartmentBrief 类型**（`getEmployeeDepartment`/`getParentDepartment` 返回值）：
`{ recordcode, department_code, department_name, level, parent_department_code, path }`

| 方法 | HTTP | URL | 说明 |
|------|------|-----|------|
| `getDepartmentList` | GET | `/users/departments/` | 部门列表 |
| `createDepartment` | POST | `/users/departments/` | 创建 |
| `getDepartment` | GET | `/users/departments/{code}/` | 详情 |
| `updateDepartment` | PUT | `/users/departments/{code}/` | 更新 |
| `deleteDepartment` | DELETE | `/users/departments/{code}/` | 删除 |
| `batchCreateDepartments` | POST | `/users/departments/batch-create/` | 批量创建 |
| `batchDeleteDepartments` | POST | `/users/departments/batch-delete/` | 批量删除 |
| `getDepartmentTree` | GET | `/users/departments/tree/` | 部门树 |
| `getDepartmentChildren` | GET | `/users/departments/{code}/children/` | 子部门 |
| `moveDepartment` | PUT | `/users/departments/{code}/move/` | 移动部门 |
| `sortDepartments` | PUT | `/users/departments/sort/` | 批量排序 |
| `getDepartmentEmployeeList` | GET | `/users/departments/{code}/employees/` | 部门员工 |
| `getParentDepartment` | GET | `/users/departments/{code}/parent/` | 获取父部门（缓存 5min） |

## 13. 仪表盘 (`dashboard.ts`)

| 方法 | HTTP | URL | 说明 |
|------|------|-----|------|
| `getDashboardOverview` | GET | `/dashboard/overview/` | 概览统计 |
| `getRecentOutAssets` | GET | `/dashboard/recent_out_assets/` | 最近出库 |
| `getRecentRecycleAssets` | GET | `/dashboard/recent_recycle_assets/` | 最近回收 |

> 后端暂未实现：`trend`, `department_distribution`, `type_distribution`, `expiring_assets`, `maintenance_reminders`（前端有 DEV 守卫）。

## 14. 操作日志 (`operationLog.ts`)

| 方法 | HTTP | URL | 说明 |
|------|------|-----|------|
| `getOperationLogs` | GET | `/assets/operation-logs/` | 日志列表 |
| `getOperationLogDetail` | GET | `/assets/operation-logs/{pk}/` | 日志详情 |
| `getOperationLogByLoggingId` | GET | `/assets/operation-logs/by-logging-id/{id}/` | 按 logging_id 查 |
| `getRecentOperationLogs` | GET | `/assets/operation-logs/recent/` | 最近日志 |
| `getUserOperationLogs` | GET | `/assets/operation-logs/user/{code}/` | 用户操作日志 |

**OperationType 枚举值**（2026-06-26 对齐后端）：`create`, `update`, `delete`, `out`, `recycle`, `damaged`, `waste`, `approve`, `transfer`, `state_change`

**OperationLog 类型字段**：`id`, `logging_id`, `asset_code`, `asset_name`, `asset_specification`, `after_data`, `before_data`, `operation_type`, `operator_jobcode`, `operator_name`, `operation_time`, `description`, `related_record_code`, `related_record_type`, `ip_address`

**后端 AuditLog（通用审计日志）**：模型已实现（`core_audit_log` 表），记录 department/employee/authuser 操作。后端已提供 API 端点，前端已对接。

| 方法 | HTTP | URL | 说明 |
|------|------|-----|------|
| `getAuditLogs` | GET | `/audit-logs/` | 列表查询（支持 app_label/operation_type/operator_jobcode/record_code/时间范围/分页） |
| `getAuditLogDetail` | GET | `/audit-logs/{pk}/` | 按主键查询详情 |
| `getAuditLogByLoggingId` | GET | `/audit-logs/by-logging-id/{id}/` | 按日志ID查询 |
| `getRecentAuditLogs` | GET | `/audit-logs/recent/?days=7` | 最近N天审计日志 |
| `getAuditLogsByApp` | GET | `/audit-logs/by-app/{app_label}/` | 按应用标识查询 |
| `getAuditLogsByOperator` | GET | `/audit-logs/by-operator/{jobcode}/` | 按操作人查询 |

## 15. 认证 (`auth.ts`)

| 方法 | HTTP | URL | 说明 |
|------|------|-----|------|
| `login` | POST | `/auth/login/` | 登录 |
| `logout` | POST | `/auth/logout/` | 退出（Token 黑名单） |
| `register` | POST | `/auth/register/` | 注册 |
| `verifyToken` | POST | `/auth/token/verify/` | 验证 Token |
| `getCurrentUserProfile` | GET | `/auth/profile/` | 获取个人信息 |
| `updateCurrentUserProfile` | PUT | `/auth/profile/` | 更新个人信息 |
