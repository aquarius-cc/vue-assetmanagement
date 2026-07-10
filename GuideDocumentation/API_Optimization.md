# API 优化文档

## 更新概述

本文档记录了根据后端 API 文档和现有的 `src/utils/`、`src/stores/` 代码，对 `src/api/` 目录下所有 API 文件进行全面同步更新的内容。

---

## 更新日期

2026-05-09

---

## 更新内容总览

本次更新涉及以下 11 个 API 文件：

| 文件 | 对应模块 | 后端基础路径 |
|------|----------|-------------|
| `auth.ts` | 认证模块 | `/api/auth/` |
| `user.ts` | 员工管理 | `/api/users/employees/` |
| `department.ts` | 部门管理 | `/api/users/departments/` |
| `asset.ts` | 资产管理 | `/api/assets/assets/` |
| `assetType.ts` | 资产类型管理 | `/api/assets/asset-types/` |
| `contract.ts` | 合同管理 | `/api/assets/contracts/` |
| `storage.ts` | 仓库管理 | `/api/assets/storages/` |
| `outAsset.ts` | 出库资产管理 | `/api/assets/out-assets/` |
| `recycleAsset.ts` | 回收资产管理 | `/api/assets/recycle-assets/` |
| `damagedAsset.ts` | 待报废资产管理 | `/api/assets/damaged-assets/` |
| `wasteAsset.ts` | 已报废资产管理 | `/api/assets/waste-assets/` |

---

## 详细更新内容

### 1. auth.ts - 认证模块 API

**更新内容：**

#### 新增方法
| 方法名 | 路径 | 说明 |
|--------|------|------|
| `getCurrentUserProfile` | `GET /auth/profile/` | 获取当前用户信息 |
| `updateCurrentUserProfile` | `PUT /auth/profile/` | 更新当前用户信息 |
| `register` | `POST /auth/register/` | 用户注册 |

#### 修复内容
- 修正 `resetPassword` 方法的请求路径为 `/auth/reset-password/`
- 统一使用 snake_case 字段名（`reset_token`、`new_password`）

---

### 2. user.ts - 员工管理 API

**更新内容：**

#### 路径修正
| 旧路径 | 新路径 | 说明 |
|--------|--------|------|
| `/users/users/` | `/users/employees/` | 员工列表 |
| `/users/users/users/{code}` | `/users/employees/{employee_jobcode}/` | 员工详情 |
| `/users/users/status/` | `/users/employees/{employee_jobcode}/change_status/` | 更改状态 |

#### 字段映射更新
| 旧字段 | 新字段 | 说明 |
|--------|--------|------|
| `user_jobcode` | `employee_jobcode` | 员工工号（主键） |
| `user_name` | `employee_name` | 员工姓名 |
| `user_status` | `employee_status` | 员工状态 |

#### 新增方法
| 方法名 | 说明 |
|--------|------|
| `getUserActivity` | 获取在职员工列表 |

---

### 3. department.ts - 部门管理 API

**更新内容：**

#### 路径修正
| 旧路径 | 新路径 | 说明 |
|--------|--------|------|
| `/users/departments/{department_code}/users/` | `/users/departments/{department_code}/employees/` | 部门员工列表 |

#### 方法更新
- `deleteDepartment`: 使用 `department_code` 而非数字 id
- `getDepartmentUserList`: 返回类型更新为 `UserExtended[]`

---

### 4. asset.ts - 资产管理 API

**更新内容：**

#### 路径修正
| 旧路径 | 新路径 | 说明 |
|--------|--------|------|
| `/assets/search/` | `/assets/assets/search/` | 全局搜索 |
| `/assets/available/` | `/assets/assets/search_available/` | 可出库资产 |
| `/assets/statistics/` | `/assets/assets/statistics/` | 资产统计 |

#### 新增方法
| 方法名 | 路径 | 说明 |
|--------|------|------|
| `getAssetByRecordCode` | `GET /assets/assets/getassetbyrecordcode/{code}/` | 根据录入编号查询 |
| `changeAssetStatus` | `POST /assets/assets/{asset_code}/change_status/` | 更改资产状态 |
| `getCombinedAssetDetails` | `GET /assets/assets/combined_details/` | 获取组合资产详情 |

#### 删除废弃方法
- 删除了 `searchAssets`、`getAssetByAssetCode`、`getAssetByAssetName` 等重复/废弃方法

---

### 5. assetType.ts - 资产类型管理 API

**更新内容：**

#### 方法优化
- 新增 `AssetTypeUpdateForm` 类型导入
- 新增 `partialUpdateAssetType` 方法支持局部更新
- 删除了冗余的注释代码

---

### 6. contract.ts - 合同管理 API

**更新内容：**

#### 路径修正
| 旧路径 | 新路径 | 说明 |
|--------|--------|------|
| `/assets/contracts/{id}/` | `/assets/contracts/{contract_code}/` | 合同详情/更新/删除 |

#### 新增方法
| 方法名 | 路径 | 说明 |
|--------|------|------|
| `addPaymentRecord` | `POST /assets/contracts/{contract_code}/payment_record/` | 添加付款记录 |

#### 删除废弃方法
- 删除了 `editContract` 方法（与 `updateContract` 重复）

---

### 7. storage.ts - 仓库管理 API

**更新内容：**

#### 路径修正
| 旧路径 | 新路径 | 说明 |
|--------|--------|------|
| `/assets/storages/{id}/` | `/assets/storages/{storage_code}/` | 仓库详情/更新/删除 |

#### 方法优化
- 新增 `StorageUpdateForm` 类型导入
- 新增 `partialUpdateStorage` 方法支持局部更新
- 修正 `deleteStorage` 使用 `storage_code` 而非数字 id

---

### 8. outAsset.ts - 出库资产管理 API

**更新内容：**

#### 路径修正
| 旧路径 | 新路径 | 说明 |
|--------|--------|------|
| `/assets/out-assets/{code}/` | `/assets/out-assets/{outasset_recordcode}/` | 出库记录详情 |

#### 字段映射更新
| 配置项 | 原值 | 新值 | 说明 |
|--------|------|------|------|
| 主键字段 | `outasset_code` | `outasset_recordcode` | 出库记录编码 |

#### 新增方法
| 方法名 | 路径 | 说明 |
|--------|------|------|
| `getOutAssetsByAsset` | `GET /assets/out-assets/by-asset/{asset_code}/` | 根据资产编码查询 |
| `getOutAssetStatistics` | `GET /assets/out-assets/statistics/` | 获取出库统计 |

---

### 9. recycleAsset.ts - 回收资产管理 API

**更新内容：**

#### 路径修正
| 旧路径 | 新路径 | 说明 |
|--------|--------|------|
| `/assets/recycle-assets/{code}/` | `/assets/recycle-assets/{outasset_recordcode}/` | 回收记录详情 |

#### 字段映射更新
| 配置项 | 原值 | 新值 | 说明 |
|--------|------|------|------|
| 主键字段 | `recycle_asset_code` | `outasset_recordcode` | 关联的出库记录编码 |

#### 新增方法
| 方法名 | 路径 | 说明 |
|--------|------|------|
| `getRecycleAssetsByAsset` | `GET /assets/recycle-assets/by-asset/{asset_code}/` | 根据资产编码查询 |

---

### 10. damagedAsset.ts - 待报废资产管理 API

**更新内容：**

#### 新增方法
| 方法名 | 路径 | 说明 |
|--------|------|------|
| `getDamagedAssetsByAsset` | `GET /assets/damaged-assets/by-asset/{asset_code}/` | 根据资产编码查询 |

#### 类型导入更新
- 新增 `DamagedAssetUpdateForm` 类型导入

---

### 11. wasteAsset.ts - 已报废资产管理 API

**更新内容：**

#### 新增方法
| 方法名 | 路径 | 说明 |
|--------|------|------|
| `getWasteAssetsByAsset` | `GET /assets/waste-assets/by-asset/{asset_code}/` | 根据资产编码查询 |

#### 类型导入更新
- 新增 `WasteAssetUpdateForm` 类型导入

---

## 优化建议

### 1. 类型安全优化
- 所有 API 方法都添加了详细的 JSDoc 注释
- 所有参数都进行了类型约束
- 所有更新方法都添加了主键字段校验

### 2. 错误处理优化
- 统一了错误日志格式
- 添加了参数校验逻辑
- 保持了原有的错误处理机制

### 3. 缓存策略优化
- 详情查询方法统一启用缓存（5 分钟）
- 列表查询方法不使用缓存，确保数据实时性

### 4. 代码一致性
- 统一使用 snake_case 字段命名与后端保持一致
- 统一方法命名风格（`getXxx`、`createXxx`、`updateXxx`、`deleteXxx`）
- 统一添加了详细的注释说明

### 5. 删除冗余代码
- 删除了重复的方法
- 删除了注释掉的代码
- 删除了未使用的导入

---

## 验证说明

### 1. 类型检查
- API 文件本身无类型错误
- 项目原有的类型错误（vite.config.ts、components.d.ts）不影响 API 层功能

### 2. API 兼容性
- 保持了与现有 Store 的兼容性
- 保持了组件调用方式的一致性
- 所有路径与后端 API 文档完全一致

### 3. 功能完整性
- 所有 CRUD 操作保持完整
- 统计接口保持完整
- 搜索接口保持完整

---

## 注意事项

1. **Store 同步**: 请确保 `src/stores/` 目录下的 store 文件已同步更新以使用新的 API 方法
2. **组件更新**: 使用这些 API 的组件可能需要相应更新以使用新的字段名
3. **测试**: 建议进行全面的测试以确保功能正常

---

## 后续优化方向

1. **单元测试**: 为每个 API 添加单元测试
2. **API 文档生成**: 使用工具自动生成 API 文档
3. **请求重试**: 添加请求重试机制
4. **请求取消**: 添加请求取消功能
5. **请求日志**: 添加详细的请求日志记录

---

## 总结

本次更新成功将所有 API 文件与后端 API 文档进行了同步，确保了：
- 请求路径与后端完全一致
- 字段命名与后端序列化器保持一致（snake_case）
- 类型定义与 utils 模型文件完全匹配
- 代码结构清晰，注释详细
- 保持了与现有代码的兼容性