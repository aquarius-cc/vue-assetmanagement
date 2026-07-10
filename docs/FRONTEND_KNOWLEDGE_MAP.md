# 前端知识图谱

## 1. 项目架构概览

```
vue-assetmanagement/
├── src/
│   ├── api/                    # API 调用层 (Axios 封装)
│   ├── stores/                 # Pinia 状态管理
│   ├── composables/            # Vue 3 组合式函数
│   ├── components/             # Vue 组件
│   │   ├── componentsdetails/  # 详情页面组件
│   │   │   └── detils/         # 子组件 (表单/详情/批量导入)
│   │   └── commoncomponents/   # 公共组件
│   ├── views/                  # 页面视图
│   ├── router/                 # 路由配置
│   ├── utils/                  # 工具函数/类型定义
│   └── types/                  # TypeScript 类型
```

## 2. 路由结构与页面映射

### 2.1 路由层级图

```
/ (根路径) ──→ /login (登录页面)
                 │
                 └──→ /main (主布局, 需要认证)
                       ├── / (默认) ──→ DashboardPage.vue (仪表板)
                       ├── /assetdetails ──→ AssetDetails.vue (资产管理)
                       │   └── /:asset_code? ──→ AssetContentDetails.vue
                       │       ├── /basicassetdetails ──→ BasicAssetDetails.vue
                       │       ├── /assetform ──→ AssetForm.vue
                       │       └── /assetbatchimport ──→ AssetBatchImport.vue
                       ├── /contractdetails ──→ ContractDetails.vue (合同管理)
                       │   ├── /contractofdetails ──→ ContractOfDetails.vue
                       │   ├── /contractform ──→ ContractForm.vue
                       │   └── /contractbatchimport ──→ ContractBatchImport.vue
                       ├── /assettypedetails ──→ AssetTypeDetails.vue (资产类型)
                       │   ├── /assettypeform ──→ AssetTypeForm.vue
                       │   └── /assettypebatchimport ──→ AssetTypeBatchImport.vue
                       ├── /storagedetails ──→ StorageDetails.vue (仓库管理)
                       │   ├── /storageform ──→ StorageForm.vue
                       │   └── /storagebatchimport ──→ StorageBatchImport.vue
                       ├── /userdetails ──→ UserDetails.vue (用户管理)
                       │   ├── /userform ──→ UserForm.vue
                       │   └── /userbatchimport ──→ UserBatchImport.vue
                       ├── /outassetdetails ──→ OutAssetDetails.vue (资产发放)
                       │   ├── /outassetform ──→ OutAssetForm.vue
                       │   ├── /outassetbasicdetails ──→ OutAssetBasicDetails.vue
                       │   └── /outassetbatchimport ──→ OutAssetBatchImport.vue
                       ├── /recycleassetdetails ──→ RecycleAssetDetails.vue (资产回收)
                       │   ├── /recycleassetform ──→ RecycleAssetForm.vue
                       │   └── /recycleassetbasicdetails ──→ RecycleAssetBasicDetails.vue
                       ├── /damagedassetdetails ──→ DamagedAssetDetails.vue (资产报废)
                       │   ├── /damagedassetform ──→ DamagedAssetForm.vue
                       │   ├── /damagedassetbasicdetails ──→ DamagedAssetBasicDetails.vue
                       │   └── /damagedassetbatchimport ──→ DamagedAssetBatchImport.vue
                       ├── /wasteassetdetails ──→ WasteAssetDetails.vue (已报废)
                       │   └── /wasteassetbasicdetails ──→ WasteAssetBasicDetails.vue
                       ├── /unregisteredassetdetails ──→ UnregisteredAssetDetails.vue (未登记)
                       │   ├── /unregisteredassetform ──→ UnregisteredAssetForm.vue
                       │   ├── /unregisteredassetbasicdetails ──→ UnregisteredAssetBasicDetails.vue
                       │   └── /unregisteredassetbatchimport ──→ UnregisteredAssetBatchImport.vue
                       ├── /operationlogdetails ──→ OperationLogDetails.vue (操作日志)
                       │   └── /operationlogdetail ──→ OperationLogDetail.vue
                       ├── /auditlogdetails ──→ AuditLogDetails.vue (审计日志)
                       │   └── /auditlogdetail ──→ AuditLogDetail.vue
                       ├── /harddisksndetails ──→ HardDiskSNDetails.vue (硬盘序列号)
                       │   ├── /harddisksnform ──→ HardDiskSNForm.vue
                       │   └── /harddisksnbasicdetails ──→ HardDiskSNBasicDetails.vue
                       ├── /departmentmanagement ──→ DepartmentManagement.vue (部门人员管理)
                       │   ├── /userform ──→ DeptUserForm
                       │   ├── /userbatchimport ──→ DeptUserBatchImport
                       │   └── /departmentbatchimport ──→ DeptDepartmentBatchImport
                       ├── /departmentdetails ──→ DepartmentDetails.vue (部门管理)
                       │   ├── /departmentform ──→ DepartmentForm.vue
                       │   └── /departmentbatchimport ──→ DepartmentBatchImport.vue
                       └── /assetform ──→ AssetFormDirect (资产录入入口)
```

### 2.2 路由名称唯一性说明

| 路由名称 | 路径 | 说明 |
|---------|------|------|
| `AssetForm` | `/main/assetdetails/:asset_code?/assetform` | 资产详情子路由 |
| `AssetFormDirect` | `/main/assetform` | 侧边栏直接入口 |
| `DeptUserForm` | `/main/departmentmanagement/userform` | 部门人员管理下的用户表单 |
| `DeptUserBatchImport` | `/main/departmentmanagement/userbatchimport` | 部门人员管理下的批量导入 |
| `DeptDepartmentBatchImport` | `/main/departmentmanagement/departmentbatchimport` | 部门人员管理下的部门导入 |

## 3. API 接口映射

### 3.1 API 模块与后端端点对照

| API 模块 | 文件 | 后端端点前缀 | 主要方法 |
|---------|------|------------|---------|
| `authAPI` | `auth.ts` | `/api/auth/` | login, logout, refreshToken |
| `userAPI` | `user.ts` | `/api/users/employees/` | getUserList, createUser, updateUser, batchDeleteUsers |
| `departmentAPI` | `department.ts` | `/api/users/departments/` | getDepartments, createDepartment |
| `assetAPI` | `asset.ts` | `/api/assets/assets/` | getAssets, createAsset, searchAssets, combineSearch, batchCreateAssets |
| `contractAPI` | `contract.ts` | `/api/assets/contracts/` | getContracts, createContract, batchCreateContracts |
| `storageAPI` | `storage.ts` | `/api/assets/storages/` | getStorages, createStorage, batchCreateStorages |
| `assetTypeAPI` | `assetType.ts` | `/api/assets/asset-types/` | getAssetTypes, createAssetType, batchCreateAssetTypes |
| `outAssetAPI` | `outAsset.ts` | `/api/assets/out-assets/` | getOutAssets, createOutAsset, batchCreateOutAssets |
| `recycleAssetAPI` | `recycleAsset.ts` | `/api/assets/recycle-assets/` | getRecycleAssets, createRecycleAsset, batchCreateRecycleAssets |
| `damagedAssetAPI` | `damagedAsset.ts` | `/api/assets/damaged-assets/` | getDamagedAssets, createDamagedAsset |
| `wasteAssetAPI` | `wasteAsset.ts` | `/api/assets/waste-assets/` | getWasteAssets |
| `unregisteredAssetAPI` | `unregisteredAsset.ts` | `/api/assets/unregistered-assets/` | getUnregisteredAssets, createUnregisteredAsset |
| `operationLogAPI` | `operationLog.ts` | `/api/assets/operation-logs/` | getOperationLogs |
| `harddiskSnAPI` | `harddiskSn.ts` | `/api/assets/harddisk-sns/` | getHardDiskSns, createHardDiskSn |
| `dashboardAPI` | `dashboard.ts` | `/api/dashboard/` | getDashboardOverview, getRecentOutAssets, getRecentRecycleAssets |
| `networkAPI` | `network.ts` | `/api/network/` | getNetworks |

### 3.2 资产 API 详细接口

```
assetAPI
├── getAssets(params)                    GET  /assets/assets/
├── createAsset(data)                    POST /assets/assets/
├── getAssetByCode(code)                 GET  /assets/assets/{code}/
├── updateAsset(data)                    PUT  /assets/assets/{code}/
├── deleteAsset(code)                    DELETE /assets/assets/{code}/
├── getAssetByName(name)                 GET  /assets/assets/getassetbyname/{name}/
├── searchAvailableAssets(params)        GET  /assets/assets/search_available/
├── searchAssets(params)                 GET  /assets/assets/search/
├── combineSearch(params)                GET  /assets/assets/combine_search/
├── getContractByAssetCode(code)         GET  /assets/assets/contract_by_asset/{code}/
├── changeAssetStatus(code, data)        POST /assets/assets/{code}/change_status/
├── getCombinedDetails(code)             GET  /assets/assets/combined_details/
├── getAssetStatistics()                 GET  /assets/assets/statistics/
├── getAssetHistory(code)                GET  /assets/assets/{code}/history/
├── getAssetTimeline(code)               GET  /assets/assets/{code}/timeline/
├── batchDeleteAssets(codes)             POST /assets/assets/batch-delete/
└── batchCreateAssets(items)             POST /assets/assets/batch-create/
```

### 3.3 出库 API 详细接口

```
outAssetAPI
├── getOutAssets(params)                 GET  /assets/out-assets/
├── getRecyclableOutAssets(params)       GET  /assets/out-assets/recyclable/
├── getOutAssetByCode(code)              GET  /assets/out-assets/{code}/
├── createOutAsset(data)                 POST /assets/out-assets/
├── updateOutAsset(data)                 PUT  /assets/out-assets/{code}/
├── deleteOutAsset(code)                 DELETE /assets/out-assets/{code}/
├── batchDeleteOutAssets(codes)          POST /assets/out-assets/batch-delete/
├── batchCreateOutAssets(items)          POST /assets/out-assets/batch-create/
├── getOutAssetsByAsset(assetCode)       GET  /assets/out-assets/by-asset/{code}/
├── getOutAssetStatistics()              GET  /assets/out-assets/statistics/
└── getOutAssetsByApplicant(jobcode)     GET  /assets/out-assets/by-applicant/{code}/
```

## 4. Store 状态管理

### 4.1 Store 层级结构

```
stores/
├── index.ts                    # 统一导出
├── createEntityStore.ts        # 通用实体 Store 工厂 (核心)
├── app.ts                      # 应用全局状态
├── auth.ts                     # 认证状态 (Token/用户信息)
├── dashboard.ts                # 仪表板数据
├── userStore.ts                # 员工管理
├── departmentStore.ts          # 部门管理
├── assetStore.ts               # 资产管理 (扩展 searchAssets/combineSearch)
├── contractStore.ts            # 合同管理
├── storageStore.ts             # 仓库管理
├── assetTypeStore.ts           # 资产类型
├── outAssetStore.ts            # 资产发放
├── recycleAssetStore.ts        # 资产回收
├── damagedAssetStore.ts        # 待报废资产
├── wasteAssetStore.ts          # 已报废资产
├── unregisteredAssetStore.ts   # 未登记资产
├── operationLogStore.ts        # 操作日志
└── harddiskSnStore.ts          # 硬盘序列号
```

### 4.2 createEntityStore 工厂模式

```typescript
// 核心功能：缓存 + 防重 + 防抖 + 分页
createEntityStore<T>(storeId, config)

// 配置项
{
  idKey: keyof T           // 主键字段名
  nameField?: keyof T      // 名称字段 (用于按名称查询)
  displayName?: string     // 中文显示名
  api: {
    getList?               // 获取列表
    getById?               // 按ID获取
    getByName?             // 按名称查询
    create                 // 创建
    update                 // 更新
    delete                 // 删除
    batchDelete?           // 批量删除
  }
  enableCache?: boolean    // 启用缓存 (默认 true)
  enablePagination?: boolean // 启用分页 (默认 true)
  defaultPageSize?: number   // 默认每页大小 (默认 20)
}

// 返回方法
{
  list                     // 列表数据 (computed)
  currentEntity            // 当前选中实体
  loading                  // 加载状态
  pagination               // 分页状态
  getList(params)          // 获取列表
  getById(id)              // 获取详情
  getNameByCode(code)      // 按编码获取名称
  getByName(name)          // 按名称查询
  create(data)             // 创建
  update(data)             // 更新
  remove(id)               // 删除
  removeBatch(ids)         // 批量删除
}
```

### 4.3 Store 与 API 映射

| Store | 使用的 API | 主键字段 |
|-------|-----------|---------|
| `useAssetStore` | `assetAPI` | `asset_code` |
| `useContractStore` | `contractAPI` | `contract_code` |
| `useStorageStore` | `storageAPI` | `storage_code` |
| `useAssetTypeStore` | `assetTypeAPI` | `asset_type_code` |
| `useOutAssetStore` | `outAssetAPI` | `outasset_recordcode` |
| `useRecycleAssetStore` | `recycleAssetAPI` | `outasset_recordcode` |
| `useDamagedAssetStore` | `damagedAssetAPI` | `outasset_recordcode` |
| `useWasteAssetStore` | `wasteAssetAPI` | `outasset_recordcode` |
| `useUnregisteredAssetStore` | `unregisteredAssetAPI` | `unregistered_asset_code` |
| `useUserStore` | `userAPI` | `employee_jobcode` |
| `useDepartmentStore` | `departmentAPI` | `department_code` |
| `useOperationLogStore` | `operationLogAPI` | `id` |
| `useHardDiskSnStore` | `harddiskSnAPI` | `id` |

## 5. Composables 组合式函数

### 5.1 函数列表与用途

| 函数名 | 文件 | 用途 |
|-------|------|------|
| `useAssetFormHelpers` | useAssetFormHelpers.ts | 资产表单辅助 (下拉选项/关联数据) |
| `useAssetInfoCards` | useAssetInfoCards.ts | 资产详情页信息卡片 |
| `useBatchImport` | useBatchImport.ts | 批量导入通用逻辑 |
| `useDepartmentCache` | useDepartmentCache.ts | 部门数据缓存 |
| `useEmployeeLinkage` | useEmployeeLinkage.ts | 员工关联 (部门-人员联动) |
| `useEmployeeSuggestionFetcher` | useEmployeeSuggestionFetcher.ts | 员工搜索建议 |
| `useExcelExport` | useExcelExport.ts | Excel 导出功能 |
| `useExportableAssets` | useExportableAssets.ts | 资产导出 |
| `useOutAssetDetailCards` | useOutAssetDetailCards.ts | 出库详情页信息卡片 |
| `usePaginationSearch` | usePaginationSearch.ts | 分页搜索通用逻辑 |
| `useRecyclableOutAssets` | useRecyclableOutAssets.ts | 可回收出库资产列表 |
| `useRecycleAssetDetailCards` | useRecycleAssetDetailCards.ts | 回收详情页信息卡片 |
| `useRecycleFormAssociations` | useRecycleFormAssociations.ts | 回收表单关联 |
| `useRecycleFormSubmit` | useRecycleFormSubmit.ts | 回收表单提交 |
| `useRecyclePersonLinkage` | useRecyclePersonLinkage.ts | 回收人员关联 |
| `useScrapableAssets` | useScrapableAssets.ts | 可报废资产列表 |
| `useSuggestionFetcher` | useSuggestionFetcher.ts | 搜索建议通用逻辑 |
| `useWastedAssets` | useWastedAssets.ts | 已报废资产列表 |

### 5.2 分页搜索组合式函数

```typescript
// usePaginationSearch 核心用法
const {
  searchParams,      // 搜索参数
  pagination,        // 分页状态
  handleSearch,      // 搜索方法
  handlePageChange,  // 页码变化
  handleSizeChange,  // 每页大小变化
  resetSearch,       // 重置搜索
} = usePaginationSearch({
  fetchFn: async (params) => {
    return await store.getList(params)
  },
  defaultPageSize: 20,
})
```

## 6. 页面调用流程

### 6.1 资产管理页面流程

```
用户访问 /main/assetdetails
    │
    ├──→ AssetDetails.vue (主页面)
    │       ├──→ 使用 useAssetStore() 获取资产列表
    │       ├──→ 调用 store.getList() 加载数据
    │       └──→ 展示 CommonList.vue (通用列表组件)
    │
    ├──→ 点击新建
    │       └──→ 路由跳转 /main/assetdetails/assetform
    │               └──→ AssetForm.vue
    │                       ├──→ 使用 useAssetFormHelpers() 获取下拉选项
    │                       ├──→ 调用 assetAPI.createAsset() 提交
    │                       └──→ 成功后返回列表页
    │
    ├──→ 点击详情
    │       └──→ 路由跳转 /main/assetdetails/{asset_code}
    │               └──→ AssetContentDetails.vue
    │                       ├──→ 调用 assetAPI.getAssetByCode() 获取详情
    │                       ├──→ 使用 useAssetInfoCards() 渲染卡片
    │                       └──→ 子路由渲染 BasicAssetDetails.vue
    │
    └──→ 点击批量导入
            └──→ 路由跳转 /main/assetdetails/assetbatchimport
                    └──→ AssetBatchImport.vue
                            ├──→ 使用 useBatchImport() 处理 Excel
                            └──→ 调用 assetAPI.batchCreateAssets() 提交
```

### 6.2 出库发放页面流程

```
用户访问 /main/outassetdetails
    │
    ├──→ OutAssetDetails.vue (主页面)
    │       ├──→ 使用 useOutAssetStore() 获取出库记录
    │       └──→ 展示出库列表
    │
    ├──→ 点击发放
    │       └──→ 路由跳转 /main/outassetdetails/outassetform
    │               └──→ OutAssetForm.vue
    │                       ├──→ 使用 useAssetFormHelpers() 获取可用资产
    │                       ├──→ 选择资产 (asset_code)
    │                       ├──→ 选择申请人/保管人 (employee_jobcode)
    │                       ├──→ 选择仓库 (storage_code)
    │                       └──→ 调用 outAssetAPI.createOutAsset() 提交
    │
    └──→ 点击详情
            └──→ 路由跳转 /main/outassetdetails/outassetbasicdetails?code={recordcode}
                    └──→ OutAssetBasicDetails.vue
                            ├──→ 调用 outAssetAPI.getOutAssetByCode() 获取详情
                            └──→ 使用 useOutAssetDetailCards() 渲染卡片
```

### 6.3 资产回收页面流程

```
用户访问 /main/recycleassetdetails
    │
    ├──→ RecycleAssetDetails.vue (主页面)
    │       ├──→ 使用 useRecycleAssetStore() 获取回收记录
    │       └──→ 展示回收列表
    │
    ├──→ 点击回收
    │       └──→ 路由跳转 /main/recycleassetdetails/recycleassetform
    │               └──→ RecycleAssetForm.vue
    │                       ├──→ 使用 useRecyclableOutAssets() 获取可回收出库记录
    │                       ├──→ 使用 useRecycleFormAssociations() 处理关联
    │                       ├──→ 使用 useRecyclePersonLinkage() 处理人员联动
    │                       └──→ 使用 useRecycleFormSubmit() 提交表单
    │
    └──→ 点击详情
            └──→ 路由跳转 /main/recycleassetdetails/recycleassetbasicdetails?code={recordcode}
                    └──→ RecycleAssetBasicDetails.vue
                            ├──→ 调用 recycleAssetAPI.getRecycleAssetByCode() 获取详情
                            └──→ 使用 useRecycleAssetDetailCards() 渲染卡片
```

## 7. 组件调用关系

### 7.1 公共组件

```
commoncomponents/
├── CommonList.vue          # 通用列表 (分页/搜索/批量操作)
├── SearchBar.vue           # 搜索栏组件
├── InfoCard.vue            # 信息卡片 (展示详情字段)
├── HardDiskSNCard.vue      # 硬盘序列号卡片
└── SmartListContainer.vue  # 智能列表容器
```

### 7.2 组件依赖关系

```
MainView.vue (主布局)
    ├──→ AsideMenu.vue (侧边菜单)
    │       └──→ router-link 跳转各页面
    └──→ <router-view> (渲染子路由)
            └──→ 各详情页面组件
                    ├──→ 使用对应 Store
                    ├──→ 使用对应 API
                    └──→ 使用对应 Composable
```

## 8. 数据流向

### 8.1 请求-响应流程

```
组件 (Vue)
    │
    ├──→ 调用 Store 方法
    │       └──→ createEntityStore.withRequestControl()
    │               ├──→ 检查缓存
    │               ├──→ 检查防重
    │               └──→ 调用 API 函数
    │
    ├──→ API 层 (axios)
    │       ├──→ request.get/post/put/delete
    │       ├──→ 请求拦截器 (添加 Token)
    │       └──→ 响应拦截器 (错误处理/Token 刷新)
    │
    └──→ 后端 API
            └──→ 返回数据
                    ├──→ unwrapResponse() 解包
                    └──→ 更新 Store 状态
                            └──→ 触发组件重新渲染
```

### 8.2 缓存策略

| 层级 | 缓存位置 | TTL | 说明 |
|------|---------|-----|------|
| API 层 | `request.ts` | 5分钟 | 按 URL 缓存 GET 请求 |
| Store 层 | `createEntityStore` | 5分钟 | 按 storeId + key 缓存 |
| 组件层 | `keep-alive` | 会话级 | 路由配置 `keepAlive: true` |

## 9. 后端 API 端点汇总

### 9.1 资产管理模块

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/assets/assets/` | GET/POST | 资产列表/创建 |
| `/api/assets/assets/{code}/` | GET/PUT/DELETE | 资产详情/更新/删除 |
| `/api/assets/assets/search/` | GET | 搜索资产 |
| `/api/assets/assets/combine_search/` | GET | 联合搜索 |
| `/api/assets/assets/search_available/` | GET | 可用资产 |
| `/api/assets/assets/statistics/` | GET | 资产统计 |
| `/api/assets/assets/batch-create/` | POST | 批量创建 |
| `/api/assets/assets/batch-delete/` | POST | 批量删除 |
| `/api/assets/assets/{code}/change_status/` | POST | 变更状态 |
| `/api/assets/assets/{code}/history/` | GET | 操作历史 |
| `/api/assets/assets/{code}/timeline/` | GET | 状态时间线 |

### 9.2 出库/回收模块

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/assets/out-assets/` | GET/POST | 出库记录列表/创建 |
| `/api/assets/out-assets/{code}/` | GET/PUT/DELETE | 出库详情/更新/删除 |
| `/api/assets/out-assets/recyclable/` | GET | 可回收出库记录 |
| `/api/assets/out-assets/batch-create/` | POST | 批量创建 |
| `/api/assets/out-assets/batch-delete/` | POST | 批量删除 |
| `/api/assets/recycle-assets/` | GET/POST | 回收记录列表/创建 |
| `/api/assets/recycle-assets/{code}/` | GET/PUT/DELETE | 回收详情/更新/删除 |
| `/api/assets/recycle-assets/batch-create/` | POST | 批量创建 |
| `/api/assets/recycle-assets/batch-delete/` | POST | 批量删除 |

### 9.3 基础数据模块

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/assets/contracts/` | GET/POST | 合同管理 |
| `/api/assets/storages/` | GET/POST | 仓库管理 |
| `/api/assets/asset-types/` | GET/POST | 资产类型管理 |
| `/api/users/employees/` | GET/POST | 员工管理 |
| `/api/users/departments/` | GET/POST | 部门管理 |
| `/api/assets/harddisk-sns/` | GET/POST | 硬盘序列号 |
| `/api/assets/operation-logs/` | GET | 操作日志 |

### 9.4 Dashboard 模块

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/dashboard/overview/` | GET | 概览数据 |
| `/api/dashboard/recent_out_assets/` | GET | 最近发放记录 |
| `/api/dashboard/recent_recycle_assets/` | GET | 最近回收记录 |

## 10. 类型定义

### 10.1 核心类型文件

| 文件 | 说明 |
|------|------|
| `utils/Asset.ts` | 资产相关类型 (Asset, AssetDetail, AssetCreateForm...) |
| `utils/Contract.ts` | 合同相关类型 |
| `utils/Storage.ts` | 仓库相关类型 |
| `utils/AssetType.ts` | 资产类型相关类型 |
| `utils/OutAsset.ts` | 出库相关类型 |
| `utils/RecycleAsset.ts` | 回收相关类型 |
| `utils/DamagedAsset.ts` | 待报废相关类型 |
| `utils/WasteAsset.ts` | 已报废相关类型 |
| `utils/UnregisteredAsset.ts` | 未登记相关类型 |
| `utils/User.ts` | 员工相关类型 |
| `utils/Department.ts` | 部门相关类型 |
| `types/common.ts` | 通用类型 |
| `types/info-card.ts` | 信息卡片类型 |

### 10.2 通用响应类型

```typescript
// API 响应
interface ApiResponse<T> {
  code: number
  message: string
  data: T
}

// 列表响应
interface ListResponse<T> {
  count: number
  results: T[]
}

// 批量删除结果
interface BatchDeleteResult {
  total: number
  success_count: number
  fail_count: number
  success_ids: string[]
  fail_items: Array<{ id: string; error_code?: string; error_message: string }>
}
```

## 11. 状态流转图

### 11.1 资产生命周期

```
未登记 (Unregistered)
    │
    ├──→ 录入登记
    │       └──→ 在库 (In Store)
    │
    └──→ 出库发放 (Out)
            │
            ├──→ 回收 (Recycle)
            │       └──→ 在库 (In Store)
            │
            └──→ 报废 (Damaged/Waste)
                    └──→ 已报废 (Wasted)
```

### 11.2 资产状态值

| 状态值 | 中文 | 说明 |
|-------|------|------|
| `in_store` | 在库 | 资产在仓库中 |
| `out` | 出库 | 资产已发放使用 |
| `recycled` | 已回收 | 资产已回收 |
| `damaged` | 待报废 | 资产待报废处理 |
| `wasted` | 已报废 | 资产已报废 |
| `unregistered` | 未登记 | 资产未正式登记 |
