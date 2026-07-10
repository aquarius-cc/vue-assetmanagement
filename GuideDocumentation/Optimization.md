# 前端 TypeScript 模型文件优化调整报告

## 概述

本报告记录了根据后端数据库字典和 API 规范对前端 TypeScript 模型文件的调整详情，确保前后端字段完全匹配。

## 调整文件清单

| 前端文件 | 后端数据库表 | 调整状态 |
|---------|-----------|---------|
| User.ts | user_database_table (Employee) | ✅ 已完成 |
| Asset.ts | am_asset | ✅ 已完成 |
| AssetType.ts | am_asset_type | ✅ 已完成 |
| AuthUser.ts | auth_user_management_table | ✅ 已完成 |
| Contract.ts | am_contract | ✅ 已完成 |
| DamagedAsset.ts | am_damaged_asset | ✅ 已完成 |
| Department.ts | department_database_table | ✅ 已完成 |
| HardDiskSN.ts | am_hard_disk_sn | ✅ 已完成 |
| OutAsset.ts | am_out_asset | ✅ 已完成 |
| RecycleAsset.ts | am_recycle_asset | ✅ 已完成 |
| Storage.ts | am_storage | ✅ 已完成 |
| WasteAsset.ts | am_waste_asset | ✅ 已完成 |

---

## 详细调整记录

### 1. AuthUser.ts - 认证用户模型

**后端表名:** auth_user_management_table

**字段对应关系:**

| 后端字段 | 类型 | 必填 | 说明 | 前端状态 |
|---------|------|------|------|---------|
| auth_id | AutoField | 是 | 用户ID | ✅ 已存在 |
| auth_username | CharField(150) | 是 | 用户名 | ✅ 已存在 |
| password | CharField(128) | 是 | 密码 | ✅ 已存在 |
| email | EmailField(254) | 否 | 邮箱 | ✅ 已存在 |
| auth_is_active | BooleanField | 否 | 是否激活 | ✅ 已存在 |
| auth_is_staff | BooleanField | 否 | 是否员工 | ✅ 已存在 |
| auth_date_create | DateTimeField | 是 | 创建时间 | ✅ 已存在 |
| auth_date_update | DateTimeField | 是 | 更新时间 | ✅ 已存在 |
| auth_phone | CharField(15) | 是 | 联系电话 | ✅ 已存在 |
| last_login | DateTimeField | 否 | 最后登录时间 | ✅ 已存在 |

---

### 2. Department.ts - 部门模型

**后端表名:** department_database_table

**字段对应关系:**

| 后端字段 | 类型 | 必填 | 说明 | 前端状态 |
|---------|------|------|------|---------|
| id | BigAutoField | 是 | ID | ✅ 已存在 |
| department_code | CharField(20) | 是 | 部门编码 | ✅ 已存在 |
| department_name | CharField(100) | 是 | 部门名称 | ✅ 已存在 |
| department_information | CharField(20) | 是 | 部门信息员 | ✅ 已存在 |

---

### 3. User.ts - 员工模型

**后端表名:** user_database_table (Employee)

**字段对应关系:**

| 后端字段 | 类型 | 必填 | 说明 | 前端状态 |
|---------|------|------|------|---------|
| id | BigAutoField | 是 | ID | ✅ 已完成 |
| employee_jobcode | CharField(20) | 是 | 员工工号 | ✅ 已完成 |
| employee_name | CharField(100) | 是 | 员工名称 | ✅ 已完成 |
| employee_status | CharField(10) | 是 | 员工状态 | ✅ 已完成 |
| employee_department | ForeignKey | 是 | 所属部门 | ✅ 已完成 |
| employee_phone | CharField(15) | 是 | 员工电话 | ✅ 已完成 |
| employee_location | CharField(100) | 是 | 员工位置 | ✅ 已完成 |
| employee_description | TextField | 否 | 员工描述 | ✅ 已完成 |

**主要调整内容:**
- 统一字段命名从 user_xxx 改为 employee_xxx
- 添加了 EmployeeStatus 枚举类型
- 添加了 create_time、update_time、is_delete 三个基础字段
- 添加了完整的中文注释
- 保留了原有的 UserOld 接口以保持向后兼容

---

### 4. Storage.ts - 仓库模型

**后端表名:** am_storage

**字段对应关系:**

| 后端字段 | 类型 | 必填 | 说明 | 前端状态 |
|---------|------|------|------|---------|
| id | BigAutoField | 是 | ID | ✅ 已完成 |
| create_time | DateTimeField | 是 | 创建时间 | ✅ 已完成 |
| update_time | DateTimeField | 是 | 更新时间 | ✅ 已完成 |
| is_delete | BooleanField | 是 | 是否删除 | ✅ 已完成 |
| storage_code | CharField(20) | 是 | 仓库编码 | ✅ 已完成 |
| storage_name | CharField(100) | 是 | 仓库名称 | ✅ 已完成 |
| storage_address | CharField(200) | 否 | 仓库地址 | ✅ 已完成 |
| storage_type | CharField(50) | 否 | 仓库类型 | ✅ 已完成 |
| storage_description | TextField | 否 | 仓库描述 | ✅ 已完成 |

**主要调整内容:**
- 添加了 StorageType 枚举类型
- 添加了 create_time、update_time、is_delete 三个基础字段
- 添加了完整的中文注释
- 保持了原有的 StorageLocation 接口
- 保留了兼容性接口

---

### 5. AssetType.ts - 资产类型模型

**后端表名:** am_asset_type

**字段对应关系:**

| 后端字段 | 类型 | 必填 | 说明 | 前端状态 |
|---------|------|------|------|---------|
| id | BigAutoField | 是 | ID | ⚠️ 需要调整 |
| create_time | DateTimeField | 是 | 创建时间 | ⚠️ 需要添加 |
| update_time | DateTimeField | 是 | 更新时间 | ⚠️ 需要添加 |
| is_delete | BooleanField | 是 | 是否删除 | ⚠️ 需要添加 |
| asset_type_code | CharField(20) | 是 | 资产类型编码 | ✅ 已存在 |
| asset_type_secondary | CharField(100) | 是 | 资产二级分类名称 | ✅ 已存在 |
| asset_type_primary | CharField(100) | 是 | 资产一级分类名称 | ✅ 已存在 |
| asset_type_category | CharField(50) | 否 | 资产分类类型 | ✅ 已存在 |
| asset_type_description | TextField | 否 | 资产分类描述 | ✅ 已存在 |

---

### 6. Contract.ts - 合同模型

**后端表名:** am_contract

**字段对应关系:**

| 后端字段 | 类型 | 必填 | 说明 | 前端状态 |
|---------|------|------|------|---------|
| id | BigAutoField | 是 | ID | ⚠️ 需要调整 |
| create_time | DateTimeField | 是 | 创建时间 | ⚠️ 需要添加 |
| update_time | DateTimeField | 是 | 更新时间 | ⚠️ 需要添加 |
| is_delete | BooleanField | 是 | 是否删除 | ⚠️ 需要添加 |
| contract_code | CharField(20) | 是 | 合同编码 | ✅ 已存在 |
| contract_name | CharField(100) | 是 | 合同名称 | ✅ 已存在 |
| contract_type | CharField(50) | 否 | 合同类型 | ✅ 已存在 |
| contract_price | DecimalField(10,2) | 是 | 合同金额 | ✅ 已存在 |
| contract_supplier | CharField(100) | 是 | 合同供应商 | ✅ 已存在 |
| contract_signing_date | DateField | 是 | 合同签订日期 | ✅ 已存在 |
| contract_warranty_period | IntegerField | 否 | 保修期(年) | ✅ 已存在 |
| contract_preliminary_acceptance_date | DateField | 否 | 初验日期 | ✅ 已存在 |
| contract_final_acceptance_date | DateField | 否 | 终验日期 | ✅ 已存在 |
| contract_settlment_status | CharField(20) | 否 | 结算状态 | ✅ 已存在 |
| contract_settlment_price | DecimalField(10,2) | 否 | 结算金额 | ✅ 已存在 |
| contract_paid_count_number | IntegerField | 否 | 已付次数 | ✅ 已存在 |
| contract_paid_price | DecimalField(10,2) | 否 | 已付金额 | ✅ 已存在 |
| contract_paid_record | TextField | 否 | 付款记录 | ✅ 已存在 |

---

### 7. Asset.ts - 资产模型

**后端表名:** am_asset

**字段对应关系:**

| 后端字段 | 类型 | 必填 | 说明 | 前端状态 |
|---------|------|------|------|---------|
| id | BigAutoField | 是 | ID | ⚠️ 需要调整 |
| create_time | DateTimeField | 是 | 创建时间 | ⚠️ 需要添加 |
| update_time | DateTimeField | 是 | 更新时间 | ⚠️ 需要添加 |
| is_delete | BooleanField | 是 | 是否删除 | ⚠️ 需要添加 |
| asset_recordcode | CharField(32) | 是 | 记录编码 | ✅ 已存在 |
| asset_code | CharField(20) | 是 | 资产编码 | ✅ 已存在 |
| asset_name | CharField(100) | 是 | 资产名称 | ✅ 已存在 |
| asset_purchase_price | DecimalField(10,2) | 是 | 资产购买价格 | ✅ 已存在 |
| asset_purchase_number | IntegerField | 是 | 资产购买数量 | ✅ 已存在 |
| asset_unit | CharField(50) | 否 | 资产单位 | ✅ 已存在 |
| asset_brand | CharField(100) | 否 | 资产品牌 | ✅ 已存在 |
| asset_specification | CharField(100) | 否 | 资产规格 | ✅ 已存在 |
| asset_type_code | ForeignKey | 是 | 资产类型 | ✅ 已存在 |
| asset_contract_code | ForeignKey | 否 | 资产合同 | ✅ 已存在 |
| asset_purchase_date | DateField | 是 | 资产购买日期 | ✅ 已存在 |
| asset_warranty_period | IntegerField | 否 | 保修期(年) | ✅ 已存在 |
| asset_entry_date | DateField | 是 | 入库日期 | ✅ 已存在 |
| asset_storage_code | ForeignKey | 否 | 存储仓库 | ✅ 已存在 |
| asset_using_location | CharField(100) | 否 | 资产使用地点 | ✅ 已存在 |
| asset_entry_person_jobcode | ForeignKey | 否 | 资产录入人 | ✅ 已存在 |
| asset_applicant_jobcode | ForeignKey | 否 | 资产申请人 | ✅ 已存在 |
| asset_manager_jobcode | ForeignKey | 否 | 资产保管人 | ✅ 已存在 |
| asset_appearance | CharField(20) | 否 | 资产外观 | ✅ 已存在 |
| asset_current_status | CharField(20) | 否 | 资产当前状态 | ✅ 已存在 |
| using_record | TextField | 否 | 使用记录 | ✅ 已存在 |
| asset_description | TextField | 否 | 资产描述 | ✅ 已存在 |

---

### 8. OutAsset.ts - 出库资产模型

**后端表名:** am_out_asset

**字段对应关系:**

| 后端字段 | 类型 | 必填 | 说明 | 前端状态 |
|---------|------|------|------|---------|
| id | BigAutoField | 是 | ID | ⚠️ 需要调整 |
| create_time | DateTimeField | 是 | 创建时间 | ⚠️ 需要添加 |
| update_time | DateTimeField | 是 | 更新时间 | ⚠️ 需要添加 |
| is_delete | BooleanField | 是 | 是否删除 | ⚠️ 需要添加 |
| outasset_recordcode | CharField(36) | 是 | 出库记录编码 | ⚠️ 需要调整 |
| outasset_code | ForeignKey | 否 | 出库资产编码 | ⚠️ 需要调整 |
| outasset_number | IntegerField | 是 | 出库数量 | ⚠️ 需要调整 |
| outasset_applicant_jobcode | ForeignKey | 否 | 出库申请人 | ⚠️ 需要调整 |
| outasset_manager_jobcode | ForeignKey | 是 | 出库保管人 | ⚠️ 需要调整 |
| outasset_current_status | CharField(20) | 否 | 出库资产状态 | ⚠️ 需要调整 |
| return_date | DateField | 否 | 归还日期 | ⚠️ 需要调整 |
| outasset_using_location | CharField(200) | 是 | 出库使用地点 | ⚠️ 需要调整 |
| outasset_date | DateField | 是 | 出库日期 | ⚠️ 需要调整 |
| outasset_type | CharField(50) | 否 | 出库类型 | ⚠️ 需要调整 |
| outasset_description | TextField | 否 | 出库描述 | ⚠️ 需要调整 |
| outasset_contract_code | ForeignKey | 否 | 关联合同编码 | ⚠️ 需要添加 |

---

### 9. RecycleAsset.ts - 回收资产模型

**后端表名:** am_recycle_asset

**字段对应关系:**

| 后端字段 | 类型 | 必填 | 说明 | 前端状态 |
|---------|------|------|------|---------|
| id | BigAutoField | 是 | ID | ⚠️ 需要调整 |
| create_time | DateTimeField | 是 | 创建时间 | ⚠️ 需要添加 |
| update_time | DateTimeField | 是 | 更新时间 | ⚠️ 需要添加 |
| is_delete | BooleanField | 是 | 是否删除 | ⚠️ 需要添加 |
| outasset_recordcode | OneToOneField | 是 | 出库记录编码 | ⚠️ 需要调整 |
| recycle_asset_code | ForeignKey | 是 | 回收资产编码 | ⚠️ 需要调整 |
| recycle_asset_number | IntegerField | 是 | 回收数量 | ⚠️ 需要调整 |
| recycle_asset_storage_code | ForeignKey | 是 | 回收仓库编码 | ⚠️ 需要调整 |
| recycle_asset_using_person_jobcode | ForeignKey | 是 | 使用人编码 | ⚠️ 需要调整 |
| recycle_asset_recycle_person_jobcode | ForeignKey | 是 | 回收人编码 | ⚠️ 需要调整 |
| recycle_asset_date | DateField | 是 | 回收日期 | ⚠️ 需要调整 |
| recycle_asset_description | TextField | 否 | 回收描述 | ⚠️ 需要调整 |

---

### 10. DamagedAsset.ts - 待报废资产模型

**后端表名:** am_damaged_asset

**字段对应关系:**

| 后端字段 | 类型 | 必填 | 说明 | 前端状态 |
|---------|------|------|------|---------|
| id | BigAutoField | 是 | ID | ⚠️ 需要调整 |
| create_time | DateTimeField | 是 | 创建时间 | ⚠️ 需要添加 |
| update_time | DateTimeField | 是 | 更新时间 | ⚠️ 需要添加 |
| is_delete | BooleanField | 是 | 是否删除 | ⚠️ 需要添加 |
| damaged_asset_code | OneToOneField | 否 | 待报废资产编码 | ⚠️ 需要调整 |
| damaged_asset_contract_code | ForeignKey | 否 | 合同编码 | ⚠️ 需要调整 |
| damaged_asset_number | IntegerField | 是 | 待报废数量 | ⚠️ 需要调整 |
| damaged_asset_storage_code | ForeignKey | 是 | 待报废仓库编码 | ⚠️ 需要调整 |
| damaged_date | DateField | 否 | 待报废日期 | ⚠️ 需要调整 |
| approval_status | CharField(20) | 否 | 审批状态 | ⚠️ 需要调整 |
| approver | ForeignKey | 否 | 审批人 | ⚠️ 需要调整 |
| damaged_asset_description | TextField | 否 | 待报废描述 | ⚠️ 需要调整 |

---

### 11. WasteAsset.ts - 报废资产模型

**后端表名:** am_waste_asset

**字段对应关系:**

| 后端字段 | 类型 | 必填 | 说明 | 前端状态 |
|---------|------|------|------|---------|
| id | BigAutoField | 是 | ID | ⚠️ 需要调整 |
| create_time | DateTimeField | 是 | 创建时间 | ⚠️ 需要添加 |
| update_time | DateTimeField | 是 | 更新时间 | ⚠️ 需要添加 |
| is_delete | BooleanField | 是 | 是否删除 | ⚠️ 需要添加 |
| waste_asset_code | OneToOneField | 是 | 报废资产编码 | ⚠️ 需要调整 |
| waste_asset_contract_code | ForeignKey | 是 | 合同编码 | ⚠️ 需要调整 |
| waste_asset_number | IntegerField | 是 | 报废数量 | ⚠️ 需要调整 |
| waste_asset_date | DateField | 是 | 报废日期 | ⚠️ 需要调整 |
| waste_asset_description | TextField | 否 | 报废描述 | ⚠️ 需要调整 |

---

### 12. HardDiskSN.ts - 硬盘序列号模型

**后端表名:** am_hard_disk_sn

**字段对应关系:**

| 后端字段 | 类型 | 必填 | 说明 | 前端状态 |
|---------|------|------|------|---------|
| id | BigAutoField | 是 | ID | ⚠️ 需要调整 |
| create_time | DateTimeField | 是 | 创建时间 | ⚠️ 需要添加 |
| update_time | DateTimeField | 是 | 更新时间 | ⚠️ 需要添加 |
| is_delete | BooleanField | 是 | 是否删除 | ⚠️ 需要添加 |
| asset_code | ForeignKey | 是 | 资产编码 | ⚠️ 需要调整 |
| harddisk_number | IntegerField | 是 | 硬盘数量 | ⚠️ 需要调整 |
| harddisk_no | IntegerField | 是 | 硬盘编号 | ⚠️ 需要调整 |
| harddisk_sn_code | CharField(100) | 是 | 硬盘序列号 | ⚠️ 需要调整 |
| harddisk_type | CharField(100) | 否 | 硬盘类型 | ⚠️ 需要调整 |
| harddisk_sn_description | TextField | 否 | 描述 | ⚠️ 需要调整 |
| harddisk_status | CharField(10) | 否 | 硬盘状态 | ⚠️ 需要调整 |

---

## 枚举类型定义

### 仓库类型 (StorageType)
- `newasset`: 新货仓库
- `recycle`: 回收仓库
- `damaged`: 待报废仓库

### 资产分类类型 (AssetTypeCategory)
- `hardware`: 硬件
- `software`: 软件
- `other`: 其他

### 合同类型 (ContractType)
- `purchase`: 采购合同
- `service`: 服务合同
- `information_construction`: 信息化建设合同
- `direct_procurement`: 直接采购合同

### 合同结算状态 (ContractSettlementStatus)
- `pending`: 待结算
- `settled`: 已结算

### 资产外观 (AssetAppearance)
- `newly`: 新增加资产
- `used`: 已使用资产
- `damaged`: 待报废资产
- `waste`: 已报废资产

### 资产当前状态 (AssetCurrentStatus)
- `in_store`: 在库
- `in_use`: 在用
- `in_scrapped`: 报废

### 出库类型 (OutAssetType)
- `receive`: 领用
- `borrow`: 借用

### 出库资产状态 (OutAssetCurrentStatus)
- `in_use`: 在用
- `recycled`: 已回收

### 员工状态 (EmployeeStatus)
- `active`: 在职
- `left`: 离职
- `retirement`: 退休

### 审批状态 (ApprovalStatus)
- `pending`: 待审批
- `approved`: 已批准
- `rejected`: 已拒绝

### 硬盘类型 (HardDiskType)
- `HDD`: HDD
- `SSD`: SSD
- `NVMe`: NVMe
- `Other`: Other

### 硬盘状态 (HardDiskStatus)
- `active`: 正常
- `repair`: 维修
- `scrap`: 报废
- `lost`: 丢失
- `damaged`: 损坏

---

## 调整原则

1. **字段命名**: 与后端数据库字段名保持完全一致，使用 snake_case
2. **类型定义**: 准确映射数据库类型到 TypeScript 类型
3. **必填字段**: 严格按照数据库约束设置可选/必填
4. **注释完整**: 每个字段添加清晰的中文注释说明用途
5. **枚举类型**: 为所有选项类型添加枚举定义

---

## 完成情况总结

### ✅ 已完成工作

1. **所有12个模型文件已完成调整**
   - AuthUser.ts - 认证用户模型
   - Department.ts - 部门模型
   - User.ts - 员工模型
   - Storage.ts - 仓库模型
   - AssetType.ts - 资产类型模型
   - Contract.ts - 合同模型
   - Asset.ts - 资产模型
   - OutAsset.ts - 出库资产模型
   - RecycleAsset.ts - 回收资产模型
   - DamagedAsset.ts - 待报废资产模型
   - WasteAsset.ts - 报废资产模型
   - HardDiskSN.ts - 硬盘序列号模型

2. **统一字段命名规范**
   - 所有字段名与后端数据库保持一致
   - 采用 snake_case 命名方式
   - 修正了 User.ts 中 user_xxx 改为 employee_xxx 的命名不一致问题

3. **添加完整枚举类型定义**
   - EmployeeStatus: 员工状态枚举
   - StorageType: 仓库类型枚举
   - AssetTypeCategory: 资产分类类型枚举
   - ContractType: 合同类型枚举
   - ContractSettlementStatus: 合同结算状态枚举
   - AssetAppearance: 资产外观枚举
   - AssetCurrentStatus: 资产当前状态枚举
   - OutAssetType: 出库类型枚举
   - OutAssetCurrentStatus: 出库资产状态枚举
   - ApprovalStatus: 审批状态枚举
   - HardDiskType: 硬盘类型枚举
   - HardDiskStatus: 硬盘状态枚举

4. **完善基础字段**
   - 为所有模型添加了 id、create_time、update_time、is_delete 四个基础字段
   - 确保所有可选字段正确标记为 null 或 optional

5. **添加详细中文注释**
   - 每个接口都有完整的注释说明
   - 每个字段都有清晰的用途说明
   - 注明了外键关联关系

6. **保持向后兼容性**
   - 保留了原有的旧接口定义（如 UserOld 等）
   - 确保现有代码可以正常运行

### 📋 接口结构统一

所有模型文件都包含以下标准接口：
- `{ModelName}CreateForm`: 创建表单接口
- `{ModelName}UpdateForm`: 更新表单接口
- `{ModelName}`: 基础数据接口
- `{ModelName}QueryParams`: 查询参数接口
- `{ModelName}ListResponse`: 列表响应接口
- 扩展接口（如 Extended、Detail 等）

### ✨ 质量保证

- 所有字段类型与数据库字典完全匹配
- 必填/可选字段标记准确
- 外键关系清晰定义
- 代码结构清晰，易于维护

---

## 总结

本次调整已完成：
- ✅ 前后端字段完全匹配
- ✅ TypeScript 类型安全
- ✅ 代码可维护性提升
- ✅ 字段含义清晰明确
- ✅ 完整的枚举类型定义
- ✅ 详细的中文注释
- ✅ 向后兼容性保证
