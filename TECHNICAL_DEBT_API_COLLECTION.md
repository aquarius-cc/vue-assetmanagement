# 前端 API 收口技术债务清单

> 创建日期：2026-07-16
> 来源：V9 审核报告 P1-4
> 规则：AGENTS.md §1.2「禁止组件内直接使用 axios」

## 违规统计

- **Views 直接调用 API**：11 处
- **Components 直接调用 API**：20 处
- **总计**：31 处

## Views 层违规（11 处）

| 文件                 | 直接调用的 API            | 已有 Store                    | 优先级 |
| :------------------- | :------------------------ | :---------------------------- | :----: |
| ContactsView.vue     | userAPI, departmentAPI    | userStore, departmentStore    |   P1   |
| AssetLogsView.vue    | assetAPI                  | assetStore                    |   P2   |
| ScanAssetView.vue    | request (get)             | —                             |   P2   |
| FoundAssetView.vue   | assetAPI, lostAssetAPI    | assetStore, lostAssetStore    |   P1   |
| LostAssetView.vue    | assetAPI, lostAssetAPI    | assetStore, lostAssetStore    |   P1   |
| RepairFailedView.vue | assetAPI, repairAssetAPI  | assetStore, repairAssetStore  |   P1   |
| RepairDoneView.vue   | assetAPI, repairAssetAPI  | assetStore, repairAssetStore  |   P1   |
| RepairAssetView.vue  | assetAPI, repairAssetAPI  | assetStore, repairAssetStore  |   P1   |
| ScrapAssetView.vue   | assetAPI                  | assetStore                    |   P2   |
| RecycleAssetView.vue | assetAPI, recycleAssetAPI | assetStore, recycleAssetStore |   P1   |
| LogIn.vue            | networkAPI                | — (需创建 networkStore)       |   P2   |

## Components 层违规（20 处）

| 文件                              | 直接调用的 API       | 已有 Store             | 优先级 |
| :-------------------------------- | :------------------- | :--------------------- | :----: |
| AuditLogDetail.vue                | auditLogAPI          | auditLogStore          |   P2   |
| AssetBatchImport.vue              | request              | —                      |   P2   |
| UserBatchImport.vue               | userAPI              | userStore              |   P2   |
| UnregisteredAssetBasicDetails.vue | unregisteredAssetAPI | unregisteredAssetStore |   P2   |
| DepartmentBatchImport.vue         | departmentAPI        | departmentStore        |   P2   |
| HardDiskSNForm.vue                | harddiskSnAPI        | harddiskSnStore        |   P2   |
| DepartmentManagement.vue          | departmentAPI        | departmentStore        |   P1   |
| DepartmentFormDialog.vue          | departmentAPI        | departmentStore        |   P2   |
| UserDetails.vue                   | userAPI              | userStore              |   P1   |
| StorageBatchImport.vue            | storageAPI           | storageStore           |   P2   |
| RecycleAssetBasicDetails.vue      | assetAPI             | assetStore             |   P2   |
| OutAssetBatchImport.vue           | outAssetAPI          | outAssetStore          |   P2   |
| ContractBatchImport.vue           | contractAPI          | contractStore          |   P2   |
| BasicAssetDetails.vue             | assetAPI             | assetStore             |   P1   |
| AssetTypeBatchImport.vue          | assetTypeAPI         | assetTypeStore         |   P2   |
| AssetForm.vue                     | assetAPI             | assetStore             |   P1   |
| DepartmentEmployeeList.vue        | userAPI              | userStore              |   P2   |
| DepartmentBatchAddDialog.vue      | departmentAPI        | departmentStore        |   P2   |
| AssetTypeDetails.vue              | assetTypeAPI         | assetTypeStore         |   P2   |

## 修复策略

### Phase 1（已完成）

- AuditLogDetails.vue → auditLogStore ✅

### Phase 2（推荐下次迭代）

- 修复 6 个 P1 级 Views：ContactsView, FoundAssetView, LostAssetView, RepairFailedView, RepairDoneView, RepairAssetView, RecycleAssetView
- 修复 3 个 P1 级 Components：DepartmentManagement, UserDetails, BasicAssetDetails, AssetForm

### Phase 3（中期规划）

- 修复剩余 22 处 P2 级违规
- 创建 networkStore（LogIn.vue 需要）
