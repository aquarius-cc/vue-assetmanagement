# 前端架构文档

> Store 结构、状态管理、数据流分层说明。

## 1. 分层架构

```
Vue 组件 → Composables → Stores → API 层 → 后端
```

- **组件层**：UI 渲染 + 用户交互，不含业务逻辑
- **Composables 层**：跨组件复用逻辑（分页搜索、导出等）
- **Store 层**：Pinia 状态管理，统一数据访问入口
- **API 层**：HTTP 请求封装，字段映射（前端 ↔ 后端）

## 2. Store 设计规范

### 2.1 createEntityStore 工厂函数

所有实体 Store 统一通过 `createEntityStore<T, Q>()` 创建，内置：
- 分页管理（`pagination` ref）
- 请求防重（`withRequestControl`）
- 缓存策略（`MemoryCache`，可选）
- 批量删除（`removeBatch`）

```ts
// ✅ Store 创建示例
export const useAssetStore = createEntityStore<AssetDetail, PaginationQuery>('asset', {
  idKey: 'asset_code',          // 必须与后端 lookup_field 一致
  nameField: 'asset_name',
  displayName: '资产',
  api: { getList, getById, create, update, delete, batchDelete },
})
```

### 2.2 idKey 选取规则

`idKey` 决定了 Store 如何从列表项中提取唯一标识，直接影响 `getById`/`remove`/`removeBatch`/`update` 的参数传递。

| 规则 | 说明 |
|------|------|
| 必须与后端 `lookup_field` 一致 | 后端 URL 路径参数来自此字段 |
| FK 穿透时取最终字段 | 如 `waste_asset__asset_code` → `idKey: 'asset_code'` |
| 必须在 TypeScript 类型中存在 | `idKey: keyof T`，否则编译报错 |

**各实体 idKey 参考**（2026-06-26 审计固化）：

| 实体 | idKey | 后端 lookup_field |
|------|-------|-------------------|
| Asset | `asset_code` | `asset_code` |
| OutAsset | `recordcode` | `recordcode` |
| RecycleAsset | `recordcode` | `recordcode` |
| DamagedAsset | `damaged_asset` | `damaged_asset` |
| WasteAsset | `asset_code` | `waste_asset__asset_code` |
| HardDiskSN | `harddisksn_asset` | `harddisksn_asset` |
| Storage | `storage_code` | `storage_code` |
| AssetType | `asset_type_code` | `asset_type_code` |
| Contract | `contract_code` | `contract_code` |
| Department | `department_code` | `department_code` |
| Employee | `employee_jobcode` | `employee_jobcode` |

### 2.3 动态方法注入模式

部分 Store（如 `assetStore`）在工厂创建后动态注入自定义方法（`searchAssets`、`combineSearch`），通过 `if (!('methodName' in store))` 防止重复注入。

```ts
export const useAssetStore = (): AssetStore => {
  const store = baseAssetStoreDef()
  if (!('searchAssets' in store)) {
    const extended = store as unknown as AssetStore
    extended.searchAssets = async (params) => { ... }
    return extended
  }
  return store as unknown as AssetStore
}
```

## 3. API 层字段映射

前端表单字段名可与后端序列化器字段名不同，但必须在 API 层做显式映射：

```ts
// ✅ 字段映射示例（asset.ts）
createAsset: (data: AssetCreateForm) => {
  const { asset_type_code, asset_contract_code, ...rest } = data
  const backendData = {
    ...rest,
    ...(asset_type_code !== undefined && { asset_type: asset_type_code }),
    ...(asset_contract_code !== undefined && { asset_contract: asset_contract_code }),
  }
  return request.post('/assets/assets/', backendData)
}
```

## 4. Composables

### usePaginationSearch
通用分页搜索 composable，提供：
- `performSearch(keyword)` — 单关键词搜索
- `performSearchWithParams(params)` — 多参数联合搜索
- `tableData` — 计算属性，自动区分搜索结果和全量数据
- `refreshFlag` 监听 — 子页面操作后自动刷新列表

## 5. 目录结构

```
src/
├── api/           # HTTP 请求封装 + 字段映射
├── stores/        # Pinia Store（createEntityStore 工厂）
├── composables/   # 组合函数（usePaginationSearch 等）
├── utils/         # 类型定义 + 工具函数
├── types/         # 全局类型（SearchFieldConfig 等）
├── components/
│   ├── commoncomponents/   # 通用组件（SmartListContainer, CommonList, SearchBar）
│   └── componentsdetails/  # 业务页面
│       ├── *.vue           # 列表/详情页
│       ├── components/     # 子组件（DepartmentInfoCard 等）
│       └── detils/         # 表单/详情子页面
├── services/      # 业务逻辑服务层
└── router/        # 路由配置 + 守卫
```

## 6. 前后端对齐规范（2026-06-26 审计后固化）

> 所有后续开发必须遵守以下规范。

- **API 层字段映射**：前端表单字段名可与后端不同，但必须在 `src/api/*.ts` 中做显式映射
- **Store idKey**：必须与后端 `lookup_field` 一致
- **OperationType 枚举**：必须与后端 `OPERATION_TYPE_CHOICES` 对齐（create/update/delete/out/recycle/damaged/waste/approve/transfer/state_change）
- **后端 AuditLog**：`core_audit_log` 模型已实现，API 端点已提供（`/api/audit-logs/`），前端已对接（`AuditLogDetails.vue`）
