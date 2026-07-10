# Dashboard 页面字段文档

## 页面布局概述

Dashboard 页面采用四象限卡片布局，包含以下四个区域：

| 位置 | 卡片名称 | 说明 |
|------|----------|------|
| 左上 | 资产发放信息 | 展示发放统计数字和最近发放记录 |
| 右上 | 用户信息 | 展示当前用户信息、登录时长和实时时间 |
| 左下 | 资产回收信息 | 展示回收统计数字和最近回收记录 |
| 右下 | 其他资产信息 | 展示报废统计数字 |

---

## 字段详细说明

### 1. 资产发放信息（左上卡片）

#### 统计数字

| 字段名 | 显示标签 | 数据类型 | 数据来源 | API 字段 |
|--------|----------|----------|----------|----------|
| monthlyDistributed | 本月发放 | number | `/dashboard/overview/` | `monthly_distributed` |
| totalDistributed | 总发放数 | number | `/dashboard/overview/` | `total_distributed` |
| totalAssets | 总资产数 | number | `/dashboard/overview/` | `total_assets` |

#### 最近发放记录列表

| 字段名 | 显示标签 | 数据类型 | 数据来源 | API 字段 |
|--------|----------|----------|----------|----------|
| asset_name | 资产名 | string | `/dashboard/recent_out_assets/` | `asset_name` |
| recipient_name | 领用人 | string | `/dashboard/recent_out_assets/` | `recipient_name` |
| distribute_time | 发放时间 | string | `/dashboard/recent_out_assets/` | `distribute_time` |

---

### 2. 用户信息（右上卡片）

#### 用户资料

| 字段名 | 显示标签 | 数据类型 | 数据来源 | 说明 |
|--------|----------|----------|----------|------|
| real_name | 当前账号 | string | AuthStore (localStorage) | 当前登录用户的用户名 |
| auth_name | 账号 | string | AuthStore (localStorage) | 当前登录用户的认证用户名 |

#### 登录时长

| 字段名 | 显示标签 | 数据类型 | 数据来源 | 说明 |
|--------|----------|----------|----------|------|
| loginDuration | 本次登录时长 | string (HH:MM:SS) | 前端计时器 | 组件挂载时开始计时，每秒更新 |

#### 当前时间

| 字段名 | 显示标签 | 数据类型 | 数据来源 | 说明 |
|--------|----------|----------|----------|------|
| currentTime | 当前时间 | string | 前端 Date 对象 | 实时显示，每秒更新 |
| currentDate | 当前日期 | string | 前端 Date 对象 | 实时显示，每秒更新 |

---

### 3. 资产回收信息（左下卡片）

#### 统计数字

| 字段名 | 显示标签 | 数据类型 | 数据来源 | API 字段 |
|--------|----------|----------|----------|----------|
| monthlyRecycled | 本月回收 | number | `/dashboard/overview/` | `monthly_recycled` |
| totalRecycled | 总回收数 | number | `/dashboard/overview/` | `total_recycled` |
| inStockAssets | 在库资产 | number | `/dashboard/overview/` | `in_stock_assets` |

#### 最近回收记录列表

| 字段名 | 显示标签 | 数据类型 | 数据来源 | API 字段 |
|--------|----------|----------|----------|----------|
| asset_name | 资产名 | string | `/dashboard/recent_recycle_assets/` | `asset_name` |
| returner_name | 归还人 | string | `/dashboard/recent_recycle_assets/` | `returner_name` |
| recycle_time | 回收时间 | string | `/dashboard/recent_recycle_assets/` | `recycle_time` |

---

### 4. 其他资产信息（右下卡片）

#### 报废统计

| 字段名 | 显示标签 | 数据类型 | 数据来源 | API 字段 |
|--------|----------|----------|----------|----------|
| pendingWaste | 待报废 | number | `/dashboard/overview/` | `pending_waste` |
| wastedAssets | 已报废 | number | `/dashboard/overview/` | `wasted_assets` |

#### 报废合计

| 字段名 | 显示标签 | 数据类型 | 数据来源 | 说明 |
|--------|----------|----------|----------|------|
| 报废合计 | 报废合计 | number | 前端计算 | `pendingWaste + wastedAssets` |

---

## API 接口说明

### 1. 概览数据接口

**接口地址**: `GET /dashboard/overview/`

**响应结构**:
```json
{
  "total_assets": 1268,
  "active_assets": 856,
  "in_stock_assets": 289,
  "monthly_distributed": 45,
  "monthly_recycled": 12,
  "pending_waste": 56,
  "wasted_assets": 100,
  "total_recycled": 320,
  "total_distributed": 980,
  "timestamp": "2024-03-15T10:30:00Z"
}
```

### 2. 最近发放记录接口

**接口地址**: `GET /dashboard/recent_out_assets/?limit=5`

**响应结构**:
```json
[
  {
    "id": 1,
    "asset_name": "ThinkPad笔记本",
    "asset_code": "AST-2024-001",
    "distribute_time": "2024-03-15T09:30:00Z",
    "recipient_name": "张三",
    "department_name": "技术部"
  }
]
```

### 3. 最近回收记录接口

**接口地址**: `GET /dashboard/recent_recycle_assets/?limit=5`

**响应结构**:
```json
[
  {
    "id": 1,
    "asset_name": "旧台式机",
    "asset_code": "AST-2023-123",
    "recycle_time": "2024-03-15T10:00:00Z",
    "returner_name": "李四",
    "department_name": "财务部"
  }
]
```

---

## 数据流向图

```
┌─────────────────────────────────────────────────────────────────┐
│                        Dashboard.vue                            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │
│  │ 发放信息卡片 │  │ 用户信息卡片 │  │ 回收信息卡片 │  │ 其他信息卡片 │ │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘ │
└─────────┼────────────────┼────────────────┼────────────────┼─────────┘
          │                │                │                │
          ▼                ▼                ▼                ▼
┌─────────────────────────────────────────────────────────────────┐
│                     DashboardStore                              │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ distributeStats │ recycleStats │ wasteStats              │   │
│  │ recentOutAssets │ recentRecycleAssets                     │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
          ┌───────────────────┼───────────────────┐
          ▼                   ▼                   ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│ /dashboard/     │ │ /dashboard/     │ │ /dashboard/     │
│ overview/       │ │ recent_out_     │ │ recent_recycle_ │
│                 │ │ assets/         │ │ assets/         │
└─────────────────┘ └─────────────────┘ └─────────────────┘
```

---

## 组件状态管理

### Store 状态字段

| 状态字段 | 类型 | 说明 |
|----------|------|------|
| overview | DashboardOverview \| null | 概览数据 |
| recentOutAssets | OutAssetRecord[] | 最近发放记录 |
| recentRecycleAssets | RecycleAssetRecord[] | 最近回收记录 |
| overviewLoading | boolean | 概览数据加载状态 |
| outAssetsLoading | boolean | 发放记录加载状态 |
| recycleAssetsLoading | boolean | 回收记录加载状态 |

### Store 计算属性

| 计算属性 | 类型 | 说明 |
|----------|------|------|
| distributeStats | { monthlyDistributed, totalDistributed, totalAssets } | 发放统计 |
| recycleStats | { monthlyRecycled, totalRecycled, inStockAssets } | 回收统计 |
| wasteStats | { pendingWaste, wastedAssets } | 报废统计 |

### Store 方法

| 方法名 | 参数 | 返回值 | 说明 |
|--------|------|--------|------|
| fetchDashboardOverview | forceRefresh?: boolean | Promise\<DashboardOverview\> | 获取概览数据 |
| fetchRecentOutAssets | limit?: number | Promise\<OutAssetRecord[]\> | 获取发放记录 |
| fetchRecentRecycleAssets | limit?: number | Promise\<RecycleAssetRecord[]\> | 获取回收记录 |
| initDashboardData | 无 | Promise\<void\> | 初始化所有数据 |
| refreshStats | 无 | Promise\<void\> | 刷新所有数据 |

---

## 时间更新机制

### 实时时间

- **更新频率**: 每秒更新一次
- **实现方式**: `setInterval(updateTime, 1000)`
- **显示格式**:
  - 时间: `HH:MM:SS` (24小时制)
  - 日期: `YYYY年MM月DD日 星期X`

### 登录时长

- **计时起点**: 组件挂载时 (`onMounted`)
- **更新频率**: 每秒更新一次
- **显示格式**: `HH:MM:SS`

---

## 前端计算字段

| 字段名 | 计算公式 | 说明 |
|--------|----------|------|
| 报废合计 | `pendingWaste + wastedAssets` | 待报废与已报废数量之和 |
| loginDuration | `当前时间 - 登录时间` | 格式化显示为 HH:MM:SS |

---

## 注意事项

1. **API 依赖**: 页面依赖以下新接口，需后端配合实现：
   - `GET /dashboard/overview/`
   - `GET /dashboard/recent_out_assets/`
   - `GET /dashboard/recent_recycle_assets/`

2. **缓存策略**: 数据缓存 5 分钟，可通过 `forceRefresh=true` 强制刷新

3. **降级处理**: 当 API 不可用时，显示默认值 `0` 和空列表提示

4. **用户信息**: 用户信息来源于 AuthStore，需确保用户已登录