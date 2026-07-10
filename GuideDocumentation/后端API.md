# 资产管理系统后端 API 文档

> 适用版本：Django 6.0.5 + Django REST Framework 3.15+  
> 更新日期：2026 年 05 月 08 日

---

## 目录

1. [统一响应格式说明](#1-统一响应格式说明)
2. [认证方式说明](#2-认证方式说明)
3. [基础路径说明](#3-基础路径说明)
4. [认证模块 API（/api/auth/）](#4-认证模块-apiapiauth)
5. [用户管理模块 API（/api/users/）](#5-用户管理模块-apiapiusers)
6. [资产管理模块 API（/api/assets/）](#6-资产管理模块-apiapiassets)

---

## 1. 统一响应格式说明

### 成功响应格式

```json
{
  "code": 0,
  "msg": "success",
  "data": {
    // 业务数据
  }
}
```

### 错误响应格式

```json
{
  "code": 1,
  "msg": "错误信息描述",
  "errors": {
    // 详细的字段错误信息（可选）
  }
}
```

### 分页响应格式

```json
{
  "code": 0,
  "msg": "success",
  "data": {
    "count": 100,
    "next": "http://example.com/api/assets/assets/?page=2",
    "previous": null,
    "results": [
      // 数据列表
    ]
  }
}
```

---

## 2. 认证方式说明

### JWT Token 获取

**接口地址**：`POST /api/auth/login/`

**请求示例**：

```json
{
  "auth_username": "admin",
  "password": "password123"
}
```

**响应示例**：

```json
{
  "code": 0,
  "msg": "success",
  "data": {
    "user": {
      "auth_id": 1,
      "auth_username": "admin",
      "auth_email": "admin@example.com",
      "auth_is_staff": true
    },
    "refresh": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
    "access": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..."
  }
}
```

### Token 使用方式

在请求 Header 中添加 Authorization 字段，格式如下：

```http
Authorization: Bearer {access_token}
```

### Token 刷新

**接口地址**：`POST /api/auth/token/refresh/`

```json
{
  "refresh": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..."
}
```

---

## 3. 基础路径说明

| 模块 | 基础路径 | 说明 |
|------|----------|------|
| 认证模块 | `/api/auth/` | 用户认证、注册、登录、用户信息 |
| 用户管理模块 | `/api/users/` | 部门管理、员工管理 |
| 资产管理模块 | `/api/assets/` | 仓库、资产类型、合同、资产、出库、回收、报废等 |

---

## 4. 认证模块 API（/api/auth/）

### 4.1 用户登录 / User Login

**接口路径**：`POST /api/auth/login/`

**认证方式**：无需认证

**请求参数**：

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| auth_username | string | 是 | 用户名 |
| password | string | 是 | 密码 |

**请求示例**：

```json
{
  "auth_username": "admin",
  "password": "password123"
}
```

**响应参数**：

| 参数名 | 类型 | 说明 |
|--------|------|------|
| code | integer | 状态码，0 表示成功 |
| msg | string | 响应消息 |
| data.user.auth_id | integer | 用户 ID |
| data.user.auth_username | string | 用户名 |
| data.user.auth_email | string | 用户邮箱 |
| data.user.auth_is_staff | boolean | 是否为管理员 |
| data.refresh | string | 刷新 Token |
| data.access | string | 访问 Token |

**响应示例**：

```json
{
  "code": 0,
  "msg": "success",
  "data": {
    "user": {
      "auth_id": 1,
      "auth_username": "admin",
      "auth_email": "admin@example.com",
      "auth_is_staff": true
    },
    "refresh": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
    "access": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..."
  }
}
```

**错误码说明**：

| 错误码 | 说明 |
|--------|------|
| 400 | 请求参数错误 |
| 401 | 用户名或密码错误 |

---

### 4.2 用户注册 / User Registration

**接口路径**：`POST /api/auth/register/`

**认证方式**：无需认证

**请求参数**：

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| auth_username | string | 是 | 用户名（3-150 个字符） |
| auth_email | string | 是 | 邮箱地址 |
| password | string | 是 | 密码（至少 8 个字符） |
| auth_nickname | string | 否 | 昵称 |
| auth_phone | string | 否 | 手机号 |

**请求示例**：

```json
{
  "auth_username": "newuser",
  "auth_email": "newuser@example.com",
  "password": "password123",
  "auth_nickname": "新用户",
  "auth_phone": "13800138000"
}
```

**响应参数**：

| 参数名 | 类型 | 说明 |
|--------|------|------|
| code | integer | 状态码，0 表示成功 |
| msg | string | 响应消息 |
| data.user | object | 用户信息对象 |
| data.refresh | string | 刷新 Token |
| data.access | string | 访问 Token |

**响应示例**：

```json
{
  "code": 0,
  "msg": "success",
  "data": {
    "user": {
      "auth_id": 2,
      "auth_username": "newuser",
      "auth_email": "newuser@example.com",
      "auth_nickname": "新用户",
      "auth_phone": "13800138000",
      "auth_is_active": true
    },
    "refresh": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
    "access": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..."
  }
}
```

**错误码说明**：

| 错误码 | 说明 |
|--------|------|
| 400 | 注册失败，参数验证错误 |

---

### 4.3 获取当前用户信息 / Get Current User Profile

**接口路径**：`GET /api/auth/profile/`

**认证方式**：JWT Bearer Token（必填）

**请求参数**：无

**响应参数**：

| 参数名 | 类型 | 说明 |
|--------|------|------|
| code | integer | 状态码，0 表示成功 |
| msg | string | 响应消息 |
| data.auth_id | integer | 用户 ID |
| data.auth_username | string | 用户名 |
| data.auth_email | string | 邮箱 |
| data.auth_nickname | string | 昵称 |
| data.auth_phone | string | 手机号 |
| data.auth_is_active | boolean | 是否激活 |
| data.auth_is_staff | boolean | 是否管理员 |
| data.auth_create_time | datetime | 创建时间 |

**响应示例**：

```json
{
  "code": 0,
  "msg": "success",
  "data": {
    "auth_id": 1,
    "auth_username": "admin",
    "auth_email": "admin@example.com",
    "auth_nickname": "管理员",
    "auth_phone": "13800138000",
    "auth_is_active": true,
    "auth_is_staff": true,
    "auth_create_time": "2026-01-01T00:00:00Z"
  }
}
```

**错误码说明**：

| 错误码 | 说明 |
|--------|------|
| 401 | 未授权，Token 无效或已过期 |

---

### 4.4 更新当前用户信息 / Update Current User Profile

**接口路径**：`PUT /api/auth/profile/`

**认证方式**：JWT Bearer Token（必填）

**请求参数**：

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| auth_email | string | 否 | 邮箱地址 |
| auth_nickname | string | 否 | 昵称 |
| auth_phone | string | 否 | 手机号 |
| password | string | 否 | 新密码（至少 8 个字符） |

**请求示例**：

```json
{
  "auth_email": "newemail@example.com",
  "auth_nickname": "新昵称",
  "auth_phone": "13900139000"
}
```

**响应参数**：

| 参数名 | 类型 | 说明 |
|--------|------|------|
| code | integer | 状态码，0 表示成功 |
| msg | string | 响应消息 |
| data | object | 更新后的用户信息 |

**响应示例**：

```json
{
  "code": 0,
  "msg": "success",
  "data": {
    "auth_id": 1,
    "auth_username": "admin",
    "auth_email": "newemail@example.com",
    "auth_nickname": "新昵称",
    "auth_phone": "13900139000",
    "auth_is_active": true,
    "auth_is_staff": true
  }
}
```

**错误码说明**：

| 错误码 | 说明 |
|--------|------|
| 400 | 更新失败，参数验证错误 |
| 401 | 未授权，Token 无效或已过期 |

---

### 4.5 用户管理（列表/详情/更新/删除）/ User Management

**接口路径**：

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/auth/users/ | 获取用户列表 |
| POST | /api/auth/users/ | 创建新用户 |
| GET | /api/auth/users/{auth_id}/ | 获取用户详情 |
| PUT | /api/auth/users/{auth_id}/ | 更新用户信息 |
| PATCH | /api/auth/users/{auth_id}/ | 部分更新用户信息 |
| DELETE | /api/auth/users/{auth_id}/ | 删除用户 |

**认证方式**：JWT Bearer Token

- 列表和详情：仅管理员可访问（IsAdminUser）
- 创建：任何人可注册（AllowAny）
- 更新和删除：仅管理员或本人可操作

**列表请求参数**：

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| page | integer | 否 | 页码，默认 1 |
| page_size | integer | 否 | 每页数量，默认 20 |
| keyword | string | 否 | 搜索关键词 |

**列表响应参数**：

| 参数名 | 类型 | 说明 |
|--------|------|------|
| code | integer | 状态码 |
| msg | string | 响应消息 |
| data.count | integer | 总记录数 |
| data.next | string | 下一页链接 |
| data.previous | string | 上一页链接 |
| data.results | array | 用户列表 |

**创建请求参数**：

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| auth_username | string | 是 | 用户名 |
| auth_email | string | 是 | 邮箱 |
| password | string | 是 | 密码 |
| auth_nickname | string | 否 | 昵称 |
| auth_phone | string | 否 | 手机号 |

**响应示例**：

```json
{
  "code": 0,
  "msg": "success",
  "data": {
    "user": {
      "auth_id": 2,
      "auth_username": "newuser",
      "auth_email": "newuser@example.com"
    },
    "refresh": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
    "access": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..."
  }
}
```

---

## 5. 用户管理模块 API（/api/users/）

### 5.1 部门管理 / Department Management

#### 5.1.1 获取部门列表 / Get Department List

**接口路径**：`GET /api/users/departments/`

**认证方式**：JWT Bearer Token

**请求参数**：

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| page | integer | 否 | 页码，默认 1 |
| page_size | integer | 否 | 每页数量，默认 20 |
| search | string | 否 | 搜索关键词（部门名称、部门编码） |
| ordering | string | 否 | 排序字段（department_code、department_name） |

**响应参数**：

| 参数名 | 类型 | 说明 |
|--------|------|------|
| code | integer | 状态码 |
| msg | string | 响应消息 |
| data.count | integer | 总记录数 |
| data.results | array | 部门列表 |

**响应示例**：

```json
{
  "code": 0,
  "msg": "success",
  "data": {
    "count": 5,
    "next": null,
    "previous": null,
    "results": [
      {
        "department_code": "DEPT001",
        "department_name": "技术部",
        "department_description": "负责技术研发",
        "department_create_time": "2026-01-01T00:00:00Z"
      }
    ]
  }
}
```

---

#### 5.1.2 创建部门 / Create Department

**接口路径**：`POST /api/users/departments/`

**认证方式**：JWT Bearer Token（管理员）

**请求参数**：

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| department_code | string | 是 | 部门编码（唯一） |
| department_name | string | 是 | 部门名称 |
| department_description | string | 否 | 部门描述 |

**请求示例**：

```json
{
  "department_code": "DEPT002",
  "department_name": "市场部",
  "department_description": "负责市场营销"
}
```

**响应示例**：

```json
{
  "code": 0,
  "msg": "success",
  "data": {
    "department_code": "DEPT002",
    "department_name": "市场部",
    "department_description": "负责市场营销",
    "department_create_time": "2026-01-15T10:30:00Z"
  }
}
```

---

#### 5.1.3 获取部门详情 / Get Department Detail

**接口路径**：`GET /api/users/departments/{department_code}/`

**认证方式**：JWT Bearer Token

**响应示例**：

```json
{
  "code": 0,
  "msg": "success",
  "data": {
    "department_code": "DEPT001",
    "department_name": "技术部",
    "department_description": "负责技术研发",
    "department_create_time": "2026-01-01T00:00:00Z"
  }
}
```

---

#### 5.1.4 更新部门 / Update Department

**接口路径**：`PUT /api/users/departments/{department_code}/`

**认证方式**：JWT Bearer Token（管理员）

**请求参数**：

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| department_name | string | 否 | 部门名称 |
| department_description | string | 否 | 部门描述 |

---

#### 5.1.5 删除部门 / Delete Department

**接口路径**：`DELETE /api/users/departments/{department_code}/`

**认证方式**：JWT Bearer Token（管理员）

**响应示例**：

```json
{
  "code": 0,
  "msg": "success",
  "data": null
}
```

---

#### 5.1.6 获取部门员工列表 / Get Department Employees

**接口路径**：`GET /api/users/departments/{department_code}/employees/`

**认证方式**：JWT Bearer Token

**响应参数**：

| 参数名 | 类型 | 说明 |
|--------|------|------|
| department | object | 部门信息 |
| employees_count | integer | 员工数量 |
| employees | array | 员工列表 |

**响应示例**：

```json
{
  "code": 0,
  "msg": "success",
  "data": {
    "department": {
      "department_code": "DEPT001",
      "department_name": "技术部"
    },
    "employees_count": 10,
    "employees": [
      {
        "employee_jobcode": "EMP001",
        "employee_name": "张三",
        "employee_phone": "13800138000"
      }
    ]
  }
}
```

---

### 5.2 员工管理 / Employee Management

#### 5.2.1 获取员工列表 / Get Employee List

**接口路径**：`GET /api/users/employees/`

**认证方式**：JWT Bearer Token

**请求参数**：

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| page | integer | 否 | 页码，默认 1 |
| page_size | integer | 否 | 每页数量，默认 20 |
| employee_status | string | 否 | 员工状态过滤 |
| employee_department__department_code | string | 否 | 部门编码过滤 |
| search | string | 否 | 搜索关键词（姓名、工号、手机号） |
| ordering | string | 否 | 排序字段 |

**响应参数**：

| 参数名 | 类型 | 说明 |
|--------|------|------|
| code | integer | 状态码 |
| msg | string | 响应消息 |
| data.count | integer | 总记录数 |
| data.results | array | 员工列表 |

---

#### 5.2.2 创建员工 / Create Employee

**接口路径**：`POST /api/users/employees/`

**认证方式**：JWT Bearer Token（管理员）

**请求参数**：

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| employee_jobcode | string | 是 | 员工工号（唯一） |
| employee_name | string | 是 | 员工姓名 |
| employee_gender | string | 否 | 性别（male/female） |
| employee_phone | string | 否 | 手机号 |
| employee_email | string | 否 | 邮箱 |
| employee_department | string | 是 | 部门编码 |
| employee_position | string | 否 | 职位 |
| employee_status | string | 否 | 状态（active/left/retirement/dismissed/other） |
| employee_description | string | 否 | 备注 |

**请求示例**：

```json
{
  "employee_jobcode": "EMP001",
  "employee_name": "张三",
  "employee_gender": "male",
  "employee_phone": "13800138000",
  "employee_email": "zhangsan@example.com",
  "employee_department": "DEPT001",
  "employee_position": "工程师",
  "employee_status": "active"
}
```

**响应示例**：

```json
{
  "code": 0,
  "msg": "success",
  "data": {
    "employee_jobcode": "EMP001",
    "employee_name": "张三",
    "employee_gender": "male",
    "employee_phone": "13800138000",
    "employee_email": "zhangsan@example.com",
    "employee_department": {
      "department_code": "DEPT001",
      "department_name": "技术部"
    },
    "employee_position": "工程师",
    "employee_status": "active",
    "employee_description": ""
  }
}
```

---

#### 5.2.3 获取员工详情 / Get Employee Detail

**接口路径**：`GET /api/users/employees/{employee_jobcode}/`

**认证方式**：JWT Bearer Token

**响应示例**：

```json
{
  "code": 0,
  "msg": "success",
  "data": {
    "employee_jobcode": "EMP001",
    "employee_name": "张三",
    "employee_gender": "male",
    "employee_phone": "13800138000",
    "employee_email": "zhangsan@example.com",
    "employee_department": {
      "department_code": "DEPT001",
      "department_name": "技术部"
    },
    "employee_position": "工程师",
    "employee_status": "active",
    "employee_description": "",
    "employee_create_time": "2026-01-01T00:00:00Z"
  }
}
```

---

#### 5.2.4 更新员工信息 / Update Employee

**接口路径**：`PUT /api/users/employees/{employee_jobcode}/`

**认证方式**：JWT Bearer Token（管理员）

**请求参数**：

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| employee_name | string | 否 | 员工姓名 |
| employee_gender | string | 否 | 性别 |
| employee_phone | string | 否 | 手机号 |
| employee_email | string | 否 | 邮箱 |
| employee_department | string | 否 | 部门编码 |
| employee_position | string | 否 | 职位 |
| employee_status | string | 否 | 状态 |
| employee_description | string | 否 | 备注 |

---

#### 5.2.5 删除员工 / Delete Employee

**接口路径**：`DELETE /api/users/employees/{employee_jobcode}/`

**认证方式**：JWT Bearer Token（管理员）

**响应示例**：

```json
{
  "code": 0,
  "msg": "success",
  "data": null
}
```

---

#### 5.2.6 根据工号获取员工 / Get Employee By Jobcode

**接口路径**：`GET /api/users/employees/employees/{employee_jobcode}/`

**认证方式**：JWT Bearer Token

**响应示例**：

```json
{
  "code": 0,
  "msg": "success",
  "data": {
    "employee_jobcode": "EMP001",
    "employee_name": "张三",
    "employee_phone": "13800138000"
  }
}
```

---

#### 5.2.7 根据姓名搜索员工 / Search Employees By Name

**接口路径**：`GET /api/users/employees/search_by_name/{name}/`

**认证方式**：JWT Bearer Token

**请求参数**：

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| page | integer | 否 | 页码 |
| page_size | integer | 否 | 每页数量（最大 100） |

**响应参数**：

| 参数名 | 类型 | 说明 |
|--------|------|------|
| code | integer | 状态码 |
| msg | string | 响应消息 |
| data.count | integer | 匹配总数 |
| data.results | array | 员工列表 |

---

#### 5.2.8 全局搜索员工 / Global Search Employees

**接口路径**：`GET /api/users/employees/search/`

**认证方式**：JWT Bearer Token

**请求参数**：

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| keyword | string | 是 | 搜索关键词（至少 2 个字符） |
| page | integer | 否 | 页码（默认 1） |
| page_size | integer | 否 | 每页数量（最大 500） |

**搜索字段**：
- 员工姓名（employee_name）
- 员工工号（employee_jobcode）
- 手机号（employee_phone）
- 部门名称（employee_department__department_name）
- 员工状态（employee_status）

**响应示例**：

```json
{
  "code": 0,
  "msg": "success",
  "data": {
    "count": 5,
    "next": null,
    "previous": null,
    "results": [
      {
        "employee_jobcode": "EMP001",
        "employee_name": "张三",
        "employee_phone": "13800138000",
        "employee_department": {
          "department_name": "技术部"
        }
      }
    ]
  }
}
```

---

#### 5.2.9 获取员工统计 / Get Employee Statistics

**接口路径**：`GET /api/users/employees/statistics/`

**认证方式**：JWT Bearer Token

**响应参数**：

| 参数名 | 类型 | 说明 |
|--------|------|------|
| total_employees | integer | 员工总数 |
| active_employees | integer | 在职员工数 |
| by_status | object | 按状态统计 |
| by_department | object | 按部门统计 |

**响应示例**：

```json
{
  "code": 0,
  "msg": "success",
  "data": {
    "total_employees": 100,
    "active_employees": 85,
    "by_status": {
      "active": {"name": "在职", "count": 85},
      "left": {"name": "离职", "count": 10},
      "retirement": {"name": "退休", "count": 3},
      "dismissed": {"name": "辞退", "count": 1},
      "other": {"name": "其他", "count": 1}
    },
    "by_department": {
      "技术部": 30,
      "市场部": 25,
      "财务部": 15
    }
  }
}
```

---

#### 5.2.10 获取所有在职员工 / Get Active Employees

**接口路径**：`GET /api/users/employees/active_employees/`

**认证方式**：JWT Bearer Token

**响应示例**：

```json
{
  "code": 0,
  "msg": "success",
  "data": {
    "count": 85,
    "results": [
      {
        "employee_jobcode": "EMP001",
        "employee_name": "张三",
        "employee_status": "active"
      }
    ]
  }
}
```

---

#### 5.2.11 更改员工状态 / Change Employee Status

**接口路径**：`POST /api/users/employees/{employee_jobcode}/change_status/`

**认证方式**：JWT Bearer Token（管理员）

**请求参数**：

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| status | string | 是 | 新状态（active/left/retirement/dismissed/other） |

**请求示例**：

```json
{
  "status": "left"
}
```

**响应示例**：

```json
{
  "code": 0,
  "msg": "success",
  "data": {
    "message": "员工状态已更改为: 离职",
    "employee": {
      "employee_jobcode": "EMP001",
      "employee_name": "张三",
      "employee_status": "left"
    }
  }
}
```

---

## 6. 资产管理模块 API（/api/assets/）

### 6.1 仓库管理 / Storage Management

#### 6.1.1 获取仓库列表 / Get Storage List

**接口路径**：`GET /api/assets/storages/`

**认证方式**：JWT Bearer Token

**请求参数**：

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| page | integer | 否 | 页码，默认 1 |
| page_size | integer | 否 | 每页数量，默认 20 |
| keyword | string | 否 | 搜索关键词（仓库编码、名称、地址） |
| storage_type | string | 否 | 仓库类型（newasset/recycle/damaged） |
| ordering | string | 否 | 排序字段 |

**响应参数**：

| 参数名 | 类型 | 说明 |
|--------|------|------|
| code | integer | 状态码 |
| msg | string | 响应消息 |
| data.count | integer | 总记录数 |
| data.results | array | 仓库列表 |

**响应示例**：

```json
{
  "code": 0,
  "msg": "success",
  "data": {
    "count": 10,
    "next": null,
    "previous": null,
    "results": [
      {
        "storage_code": "STO001",
        "storage_name": "主仓库",
        "storage_type": "newasset",
        "storage_address": "北京市朝阳区",
        "storage_capacity": 1000,
        "storage_description": "用于存放新资产"
      }
    ]
  }
}
```

---

#### 6.1.2 创建仓库 / Create Storage

**接口路径**：`POST /api/assets/storages/`

**认证方式**：JWT Bearer Token（管理员）

**请求参数**：

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| storage_code | string | 是 | 仓库编码（唯一） |
| storage_name | string | 是 | 仓库名称 |
| storage_type | string | 是 | 仓库类型（newasset/recycle/damaged） |
| storage_address | string | 否 | 仓库地址 |
| storage_capacity | integer | 否 | 仓库容量 |
| storage_description | string | 否 | 仓库描述 |

**请求示例**：

```json
{
  "storage_code": "STO001",
  "storage_name": "主仓库",
  "storage_type": "newasset",
  "storage_address": "北京市朝阳区某街道 1 号",
  "storage_capacity": 1000,
  "storage_description": "用于存放新采购的资产"
}
```

---

#### 6.1.3 获取仓库详情 / Get Storage Detail

**接口路径**：`GET /api/assets/storages/{storage_code}/`

**认证方式**：JWT Bearer Token

---

#### 6.1.4 更新仓库 / Update Storage

**接口路径**：`PUT /api/assets/storages/{storage_code}/`

**认证方式**：JWT Bearer Token（管理员）

**请求参数**：

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| storage_name | string | 否 | 仓库名称 |
| storage_type | string | 否 | 仓库类型 |
| storage_address | string | 否 | 仓库地址 |
| storage_capacity | integer | 否 | 仓库容量 |
| storage_description | string | 否 | 仓库描述 |

---

#### 6.1.5 部分更新仓库 / Partial Update Storage

**接口路径**：`PATCH /api/assets/storages/{storage_code}/`

**认证方式**：JWT Bearer Token（管理员）

---

#### 6.1.6 删除仓库 / Delete Storage

**接口路径**：`DELETE /api/assets/storages/{storage_code}/`

**认证方式**：JWT Bearer Token（管理员）

> 说明：删除为软删除，仅标记 is_delete 为 True

---

#### 6.1.7 获取仓库统计 / Get Storage Statistics

**接口路径**：`GET /api/assets/storages/statistics/`

**认证方式**：JWT Bearer Token

**响应参数**：

| 参数名 | 类型 | 说明 |
|--------|------|------|
| total_storages | integer | 仓库总数 |
| by_type | object | 各类型仓库统计 |

**响应示例**：

```json
{
  "code": 0,
  "msg": "success",
  "data": {
    "total_storages": 10,
    "by_type": {
      "newasset": {"name": "新资产仓", "count": 5},
      "recycle": {"name": "回收仓", "count": 3},
      "damaged": {"name": "待报废仓", "count": 2}
    }
  }
}
```

---

### 6.2 资产类型管理 / Asset Type Management

#### 6.2.1 获取资产类型列表 / Get Asset Type List

**接口路径**：`GET /api/assets/asset-types/`

**认证方式**：JWT Bearer Token

**请求参数**：

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| page | integer | 否 | 页码 |
| page_size | integer | 否 | 每页数量 |
| asset_type_category | string | 否 | 资产类别过滤 |
| search | string | 否 | 搜索关键词 |
| ordering | string | 否 | 排序字段 |

**响应参数**：

| 参数名 | 类型 | 说明 |
|--------|------|------|
| code | integer | 状态码 |
| msg | string | 响应消息 |
| data.results | array | 资产类型列表 |

---

#### 6.2.2 创建资产类型 / Create Asset Type

**接口路径**：`POST /api/assets/asset-types/`

**认证方式**：JWT Bearer Token（管理员）

**请求参数**：

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| asset_type_code | string | 是 | 资产类型编码（唯一） |
| asset_type_primary | string | 是 | 一级分类 |
| asset_type_secondary | string | 否 | 二级分类 |
| asset_type_category | string | 否 | 资产类别 |
| asset_type_description | string | 否 | 类型描述 |

---

#### 6.2.3 获取资产类型详情 / Get Asset Type Detail

**接口路径**：`GET /api/assets/asset-types/{asset_type_code}/`

**认证方式**：JWT Bearer Token

---

#### 6.2.4 更新资产类型 / Update Asset Type

**接口路径**：`PUT /api/assets/asset-types/{asset_type_code}/`

**认证方式**：JWT Bearer Token（管理员）

---

#### 6.2.5 部分更新资产类型 / Partial Update Asset Type

**接口路径**：`PATCH /api/assets/asset-types/{asset_type_code}/`

**认证方式**：JWT Bearer Token（管理员）

---

#### 6.2.6 删除资产类型 / Delete Asset Type

**接口路径**：`DELETE /api/assets/asset-types/{asset_type_code}/`

**认证方式**：JWT Bearer Token（管理员）

---

### 6.3 合同管理 / Contract Management

#### 6.3.1 获取合同列表 / Get Contract List

**接口路径**：`GET /api/assets/contracts/`

**认证方式**：JWT Bearer Token

**请求参数**：

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| page | integer | 否 | 页码 |
| page_size | integer | 否 | 每页数量 |
| contract_type | string | 否 | 合同类型过滤 |
| contract_settlment_status | string | 否 | 结算状态过滤 |
| ordering | string | 否 | 排序字段 |
| keyword | string | 否 | 搜索关键词 |

**响应参数**：

| 参数名 | 类型 | 说明 |
|--------|------|------|
| code | integer | 状态码 |
| msg | string | 响应消息 |
| data.count | integer | 总记录数 |
| data.results | array | 合同列表 |

---

#### 6.3.2 创建合同 / Create Contract

**接口路径**：`POST /api/assets/contracts/`

**认证方式**：JWT Bearer Token

**请求参数**：

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| contract_code | string | 是 | 合同编码（唯一） |
| contract_name | string | 是 | 合同名称 |
| contract_type | string | 是 | 合同类型 |
| contract_supplier | string | 否 | 供应商 |
| contract_signing_date | date | 否 | 签约日期 |
| contract_start_date | date | 否 | 开始日期 |
| contract_end_date | date | 否 | 结束日期 |
| contract_price | decimal | 否 | 合同金额 |
| contract_settlment_status | string | 否 | 结算状态 |
| contract_description | string | 否 | 合同描述 |

**请求示例**：

```json
{
  "contract_code": "CON2026001",
  "contract_name": "办公设备采购合同",
  "contract_type": "tender_procurement",
  "contract_supplier": "某科技有限公司",
  "contract_signing_date": "2026-01-15",
  "contract_start_date": "2026-01-15",
  "contract_end_date": "2027-01-14",
  "contract_price": 100000.00,
  "contract_settlment_status": "pending"
}
```

---

#### 6.3.3 获取合同详情 / Get Contract Detail

**接口路径**：`GET /api/assets/contracts/{contract_code}/`

**认证方式**：JWT Bearer Token

**响应示例**：

```json
{
  "code": 0,
  "msg": "success",
  "data": {
    "contract_code": "CON2026001",
    "contract_name": "办公设备采购合同",
    "contract_type": "tender_procurement",
    "contract_supplier": "某科技有限公司",
    "contract_signing_date": "2026-01-15",
    "contract_start_date": "2026-01-15",
    "contract_end_date": "2027-01-14",
    "contract_price": "100000.00",
    "contract_settlment_status": "pending",
    "contract_description": "",
    "payment_records": []
  }
}
```

---

#### 6.3.4 更新合同 / Update Contract

**接口路径**：`PUT /api/assets/contracts/{contract_code}/`

**认证方式**：JWT Bearer Token

**请求参数**：

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| contract_name | string | 否 | 合同名称 |
| contract_type | string | 否 | 合同类型 |
| contract_supplier | string | 否 | 供应商 |
| contract_signing_date | date | 否 | 签约日期 |
| contract_start_date | date | 否 | 开始日期 |
| contract_end_date | date | 否 | 结束日期 |
| contract_price | decimal | 否 | 合同金额 |
| contract_settlment_status | string | 否 | 结算状态 |
| contract_description | string | 否 | 合同描述 |

---

#### 6.3.5 部分更新合同 / Partial Update Contract

**接口路径**：`PATCH /api/assets/contracts/{contract_code}/`

**认证方式**：JWT Bearer Token

---

#### 6.3.6 删除合同 / Delete Contract

**接口路径**：`DELETE /api/assets/contracts/{contract_code}/`

**认证方式**：JWT Bearer Token

> 说明：删除合同时会同时删除关联的资产记录

---

#### 6.3.7 获取合同统计 / Get Contract Statistics

**接口路径**：`GET /api/assets/contracts/statistics/`

**认证方式**：JWT Bearer Token

**响应参数**：

| 参数名 | 类型 | 说明 |
|--------|------|------|
| total_contracts | integer | 合同总数 |
| total_amount | decimal | 合同总金额 |
| average_amount | decimal | 平均金额 |
| by_type | object | 按类型统计 |
| by_status | object | 按状态统计 |

**响应示例**：

```json
{
  "code": 0,
  "msg": "success",
  "data": {
    "total_contracts": 50,
    "total_amount": "5000000.00",
    "average_amount": "100000.00",
    "by_type": {
      "采购": {"count": 30, "amount": "3000000.00"},
      "租赁": {"count": 15, "amount": "1500000.00"},
      "服务": {"count": 5, "amount": "500000.00"}
    },
    "by_status": {
      "pending": {"name": "待结算", "count": 20},
      "settled": {"name": "已结算", "count": 25},
      "cancelled": {"name": "已取消", "count": 5}
    }
  }
}
```

---

#### 6.3.8 添加付款记录 / Add Payment Record

**接口路径**：`POST /api/assets/contracts/{contract_code}/payment_record/`

**认证方式**：JWT Bearer Token

**请求参数**：

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| amount | decimal | 是 | 付款金额 |
| description | string | 否 | 付款描述 |

**请求示例**：

```json
{
  "amount": 50000.00,
  "description": "首付款 50%"
}
```

**响应示例**：

```json
{
  "code": 0,
  "msg": "success",
  "data": {
    "contract": {
      "contract_code": "CON2026001",
      "contract_name": "办公设备采购合同",
      "payment_records": [
        {
          "amount": "50000.00",
          "description": "首付款 50%",
          "payment_date": "2026-01-20T10:00:00Z"
        }
      ]
    }
  }
}
```

---

#### 6.3.9 全局模糊搜索合同 / Global Search Contracts

**接口路径**：`GET /api/assets/contracts/search/`

**认证方式**：JWT Bearer Token

**请求参数**：

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| keyword | string | 是 | 搜索关键词 |
| page | integer | 否 | 页码 |
| page_size | integer | 否 | 每页数量（默认 20） |

**搜索字段**：
- 合同编号
- 合同名称
- 供应商
- 合同类型
- 结算状态

---

#### 6.3.10 根据名称搜索合同 / Search Contracts By Name

**接口路径**：`GET /api/assets/contracts/getcontractByname/{name}/`

**认证方式**：JWT Bearer Token

**请求参数**：

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| name | string | 是 | 合同名称（路径参数） |

---

### 6.4 资产管理 / Asset Management

#### 6.4.1 获取资产列表 / Get Asset List

**接口路径**：`GET /api/assets/assets/`

**认证方式**：JWT Bearer Token

**请求参数**：

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| page | integer | 否 | 页码 |
| page_size | integer | 否 | 每页数量 |
| asset_current_status | string | 否 | 资产状态过滤（in_store/in_use/in_scrapped） |
| asset_type_code | string | 否 | 资产类型编码 |
| asset_storage_code | string | 否 | 仓库编码 |
| keyword | string | 否 | 搜索关键词 |
| ordering | string | 否 | 排序字段 |

**响应参数**：

| 参数名 | 类型 | 说明 |
|--------|------|------|
| code | integer | 状态码 |
| msg | string | 响应消息 |
| data.count | integer | 总记录数 |
| data.results | array | 资产列表 |

**响应示例**：

```json
{
  "code": 0,
  "msg": "success",
  "data": {
    "count": 100,
    "next": "http://example.com/api/assets/assets/?page=2",
    "previous": null,
    "results": [
      {
        "asset_code": "AST20260001",
        "asset_name": "联想笔记本",
        "asset_type_code": {
          "asset_type_code": "TYPE001",
          "asset_type_primary": "电子设备"
        },
        "asset_brand": "联想",
        "asset_specification": "ThinkPad X1",
        "asset_purchase_price": 8000.00,
        "asset_current_status": "in_store",
        "asset_entry_date": "2026-01-15"
      }
    ]
  }
}
```

---

#### 6.4.2 创建资产 / Create Asset

**接口路径**：`POST /api/assets/assets/`

**认证方式**：JWT Bearer Token

**请求参数**：

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| asset_code | string | 是 | 资产编码（唯一） |
| asset_name | string | 是 | 资产名称 |
| asset_type_code | string | 是 | 资产类型编码 |
| asset_brand | string | 否 | 品牌 |
| asset_specification | string | 否 | 规格型号 |
| asset_purchase_price | decimal | 否 | 采购价格 |
| asset_purchase_date | date | 否 | 采购日期 |
| asset_storage_code | string | 否 | 仓库编码 |
| asset_contract_code | string | 否 | 合同编码 |
| asset_recordcode | string | 否 | 资产录入编号 |
| asset_description | string | 否 | 资产描述 |

**请求示例**：

```json
{
  "asset_code": "AST20260001",
  "asset_name": "联想笔记本",
  "asset_type_code": "TYPE001",
  "asset_brand": "联想",
  "asset_specification": "ThinkPad X1",
  "asset_purchase_price": 8000.00,
  "asset_purchase_date": "2026-01-15",
  "asset_storage_code": "STO001",
  "asset_contract_code": "CON2026001",
  "asset_recordcode": "REC2026001"
}
```

---

#### 6.4.3 获取资产详情 / Get Asset Detail

**接口路径**：`GET /api/assets/assets/{asset_code}/`

**认证方式**：JWT Bearer Token

---

#### 6.4.4 更新资产 / Update Asset

**接口路径**：`PUT /api/assets/assets/{asset_code}/`

**认证方式**：JWT Bearer Token

---

#### 6.4.5 部分更新资产 / Partial Update Asset

**接口路径**：`PATCH /api/assets/assets/{asset_code}/`

**认证方式**：JWT Bearer Token

---

#### 6.4.6 删除资产 / Delete Asset

**接口路径**：`DELETE /api/assets/assets/{asset_code}/`

**认证方式**：JWT Bearer Token

> 说明：删除为软删除

---

#### 6.4.7 获取资产统计 / Get Asset Statistics

**接口路径**：`GET /api/assets/assets/statistics/`

**认证方式**：JWT Bearer Token

**响应参数**：

| 参数名 | 类型 | 说明 |
|--------|------|------|
| total_assets | integer | 资产总数 |
| total_value | decimal | 资产总价值 |
| in_store | integer | 在库数量 |
| in_use | integer | 在用数量 |
| in_scrapped | integer | 已报废数量 |
| by_status | object | 按状态统计 |
| by_type | object | 按类型统计 |

**响应示例**：

```json
{
  "code": 0,
  "msg": "success",
  "data": {
    "total_assets": 500,
    "total_value": "5000000.00",
    "in_store": 200,
    "in_use": 280,
    "in_scrapped": 20,
    "by_status": {
      "in_store": {"name": "在库", "count": 200},
      "in_use": {"name": "在用", "count": 280},
      "in_scrapped": {"name": "已报废", "count": 20}
    },
    "by_type": {
      "电子设备": {"count": 200, "value": "2000000.00"},
      "办公家具": {"count": 150, "value": "750000.00"}
    }
  }
}
```

---

#### 6.4.8 搜索资产 / Search Assets

**接口路径**：`GET /api/assets/assets/search/`

**认证方式**：JWT Bearer Token

**请求参数**：

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| keyword | string | 否 | 搜索关键词 |
| asset_current_status | string | 否 | 资产状态 |
| asset_type_code | string | 否 | 资产类型 |
| page | integer | 否 | 页码 |
| page_size | integer | 否 | 每页数量 |

---

#### 6.4.9 搜索可出库资产 / Search Available Assets

**接口路径**：`GET /api/assets/assets/search_available/`

**认证方式**：JWT Bearer Token

> 说明：返回状态为 in_store 的资产列表

**响应示例**：

```json
{
  "code": 0,
  "msg": "success",
  "data": {
    "count": 50,
    "results": [
      {
        "asset_code": "AST20260001",
        "asset_name": "联想笔记本",
        "asset_current_status": "in_store"
      }
    ]
  }
}
```

---

#### 6.4.10 更改资产状态 / Change Asset Status

**接口路径**：`POST /api/assets/assets/{asset_code}/change_status/`

**认证方式**：JWT Bearer Token

**请求参数**：

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| status | string | 是 | 新状态（in_store/in_use/in_scrapped） |
| description | string | 否 | 变更描述 |

**请求示例**：

```json
{
  "status": "in_use",
  "description": "分配给张三使用"
}
```

**响应示例**：

```json
{
  "code": 0,
  "msg": "success",
  "data": {
    "asset": {
      "asset_code": "AST20260001",
      "asset_name": "联想笔记本",
      "asset_current_status": "in_use"
    }
  }
}
```

---

#### 6.4.11 获取组合资产详情 / Get Combined Asset Details

**接口路径**：`GET /api/assets/assets/combined_details/`

**认证方式**：JWT Bearer Token

**请求参数**：

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| asset_code | string | 是 | 资产编码（Query参数） |

---

#### 6.4.12 根据资产名称搜索 / Search Assets By Name

**接口路径**：`GET /api/assets/assets/getassetbyname/{name}/`

**认证方式**：JWT Bearer Token

---

#### 6.4.13 根据录入编号查询 / Get Asset By Record Code

**接口路径**：`GET /api/assets/assets/getassetbyrecordcode/{assetrecordcode}/`

**认证方式**：JWT Bearer Token

---

### 6.5 出库资产管理 / Out Asset Management

#### 6.5.1 获取出库记录列表 / Get Out Asset List

**接口路径**：`GET /api/assets/out-assets/`

**认证方式**：JWT Bearer Token

**请求参数**：

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| page | integer | 否 | 页码 |
| page_size | integer | 否 | 每页数量 |
| outasset_type | string | 否 | 出库类型过滤 |
| outasset_applicant_jobcode | string | 否 | 申请人工号 |
| outasset_manager_jobcode | string | 否 | 管理员工号 |
| keyword | string | 否 | 搜索关键词 |
| searchType | string | 否 | 搜索类型（asset/user/all） |
| outasset_current_status | string | 否 | 状态过滤 |
| ordering | string | 否 | 排序字段 |

**响应参数**：

| 参数名 | 类型 | 说明 |
|--------|------|------|
| code | integer | 状态码 |
| msg | string | 响应消息 |
| data.count | integer | 总记录数 |
| data.results | array | 出库记录列表 |

---

#### 6.5.2 创建出库记录 / Create Out Asset Record

**接口路径**：`POST /api/assets/out-assets/`

**认证方式**：JWT Bearer Token

**请求参数**：

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| outasset_code | string | 是 | 资产编码 |
| outasset_type | string | 是 | 出库类型 |
| outasset_applicant_jobcode | string | 是 | 申请人工号 |
| outasset_manager_jobcode | string | 否 | 管理员工号 |
| outasset_date | date | 否 | 出库日期 |
| outasset_quantity | integer | 否 | 出库数量 |
| outasset_description | string | 否 | 出库描述 |

> 注意：只有状态为 in_store 的资产才能创建出库记录

**请求示例**：

```json
{
  "outasset_code": "AST20260001",
  "outasset_type": "领用",
  "outasset_applicant_jobcode": "EMP001",
  "outasset_manager_jobcode": "EMP002",
  "outasset_date": "2026-02-01",
  "outasset_quantity": 1,
  "outasset_description": "用于研发部日常办公"
}
```

---

#### 6.5.3 获取出库记录详情 / Get Out Asset Detail

**接口路径**：`GET /api/assets/out-assets/{outasset_recordcode}/`

**认证方式**：JWT Bearer Token

---

#### 6.5.4 更新出库记录 / Update Out Asset

**接口路径**：`PUT /api/assets/out-assets/{outasset_recordcode}/`

**认证方式**：JWT Bearer Token

---

#### 6.5.5 删除出库记录 / Delete Out Asset

**接口路径**：`DELETE /api/assets/out-assets/{outasset_recordcode}/`

**认证方式**：JWT Bearer Token

---

#### 6.5.6 获取资产的出库记录 / Get Out Assets By Asset

**接口路径**：`GET /api/assets/out-assets/by-asset/{asset_code}/`

**认证方式**：JWT Bearer Token

---

#### 6.5.7 获取出库统计 / Get Out Asset Statistics

**接口路径**：`GET /api/assets/out-assets/statistics/`

**认证方式**：JWT Bearer Token

**响应参数**：

| 参数名 | 类型 | 说明 |
|--------|------|------|
| total_out_assets | integer | 出库记录总数 |
| by_type | object | 按类型统计 |

**响应示例**：

```json
{
  "code": 0,
  "msg": "success",
  "data": {
    "total_out_assets": 200,
    "by_type": {
      "领用": {"name": "领用", "count": 150},
      "借用": {"name": "借用", "count": 30},
      "归还": {"name": "归还", "count": 20}
    }
  }
}
```

---

### 6.6 回收资产管理 / Recycle Asset Management

#### 6.6.1 获取回收记录列表 / Get Recycle Asset List

**接口路径**：`GET /api/assets/recycle-assets/`

**认证方式**：JWT Bearer Token

**请求参数**：

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| page | integer | 否 | 页码 |
| page_size | integer | 否 | 每页数量 |
| recycle_asset_storage_code | string | 否 | 仓库编码 |
| recycle_asset_code | string | 否 | 资产编码 |
| recycle_asset_recycle_person_jobcode | string | 否 | 回收人工号 |
| recycle_date_from | date | 否 | 回收日期起始 |
| recycle_date_to | date | 否 | 回收日期结束 |
| search | string | 否 | 搜索关键词 |
| ordering | string | 否 | 排序字段 |

---

#### 6.6.2 创建回收记录 / Create Recycle Asset Record

**接口路径**：`POST /api/assets/recycle-assets/`

**认证方式**：JWT Bearer Token

**请求参数**：

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| outasset_recordcode | string | 是 | 出库记录编码 |
| recycle_asset_code | string | 是 | 资产编码 |
| recycle_asset_storage_code | string | 是 | 回收仓库编码 |
| recycle_asset_recycle_person_jobcode | string | 否 | 回收人工号 |
| recycle_asset_date | date | 否 | 回收日期 |
| recycle_asset_description | string | 否 | 回收描述 |

> 注意：只有状态为 in_use 的出库记录才能创建回收记录

**请求示例**：

```json
{
  "outasset_recordcode": "OUT20260001",
  "recycle_asset_code": "AST20260001",
  "recycle_asset_storage_code": "STO002",
  "recycle_asset_recycle_person_jobcode": "EMP003",
  "recycle_asset_date": "2026-03-01",
  "recycle_asset_description": "资产回收"
}
```

---

#### 6.6.3 获取回收记录详情 / Get Recycle Asset Detail

**接口路径**：`GET /api/assets/recycle-assets/{outasset_recordcode}/`

**认证方式**：JWT Bearer Token

---

#### 6.6.4 更新回收记录 / Update Recycle Asset

**接口路径**：`PUT /api/assets/recycle-assets/{outasset_recordcode}/`

**认证方式**：JWT Bearer Token

---

#### 6.6.5 删除回收记录 / Delete Recycle Asset

**接口路径**：`DELETE /api/assets/recycle-assets/{outasset_recordcode}/`

**认证方式**：JWT Bearer Token

---

#### 6.6.6 获取资产的回收记录 / Get Recycle Assets By Asset

**接口路径**：`GET /api/assets/recycle-assets/by-asset/{asset_code}/`

**认证方式**：JWT Bearer Token

---

### 6.7 待报废资产管理 / Damaged Asset Management

#### 6.7.1 获取待报废记录列表 / Get Damaged Asset List

**接口路径**：`GET /api/assets/damaged-assets/`

**认证方式**：JWT Bearer Token

**请求参数**：

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| page | integer | 否 | 页码 |
| page_size | integer | 否 | 每页数量 |
| damaged_asset_storage_code | string | 否 | 仓库编码 |
| search | string | 否 | 搜索关键词 |
| ordering | string | 否 | 排序字段 |

---

#### 6.7.2 创建待报废记录 / Create Damaged Asset Record

**接口路径**：`POST /api/assets/damaged-assets/`

**认证方式**：JWT Bearer Token

**请求参数**：

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| damaged_asset_code | string | 是 | 资产编码 |
| damaged_asset_storage_code | string | 是 | 仓库编码 |
| damaged_asset_reason | string | 否 | 报废原因 |
| damaged_asset_date | date | 否 | 申请日期 |
| damaged_asset_description | string | 否 | 描述 |

---

#### 6.7.3 获取待报废记录详情 / Get Damaged Asset Detail

**接口路径**：`GET /api/assets/damaged-assets/{damaged_asset_code}/`

**认证方式**：JWT Bearer Token

---

#### 6.7.4 更新待报废记录 / Update Damaged Asset

**接口路径**：`PUT /api/assets/damaged-assets/{damaged_asset_code}/`

**认证方式**：JWT Bearer Token

---

#### 6.7.5 删除待报废记录 / Delete Damaged Asset

**接口路径**：`DELETE /api/assets/damaged-assets/{damaged_asset_code}/`

**认证方式**：JWT Bearer Token

---

#### 6.7.6 获取资产的待报废记录 / Get Damaged Assets By Asset

**接口路径**：`GET /api/assets/damaged-assets/by-asset/{asset_code}/`

**认证方式**：JWT Bearer Token

---

### 6.8 已报废资产管理 / Waste Asset Management

#### 6.8.1 获取报废记录列表 / Get Waste Asset List

**接口路径**：`GET /api/assets/waste-assets/`

**认证方式**：JWT Bearer Token

**请求参数**：

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| page | integer | 否 | 页码 |
| page_size | integer | 否 | 每页数量 |
| search | string | 否 | 搜索关键词 |
| ordering | string | 否 | 排序字段 |

---

#### 6.8.2 创建报废记录 / Create Waste Asset Record

**接口路径**：`POST /api/assets/waste-assets/`

**认证方式**：JWT Bearer Token

**请求参数**：

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| waste_asset_code | string | 是 | 资产编码 |
| waste_asset_date | date | 否 | 报废日期 |
| waste_asset_reason | string | 否 | 报废原因 |
| waste_asset_description | string | 否 | 描述 |

---

#### 6.8.3 获取报废记录详情 / Get Waste Asset Detail

**接口路径**：`GET /api/assets/waste-assets/{waste_asset_code}/`

**认证方式**：JWT Bearer Token

---

#### 6.8.4 更新报废记录 / Update Waste Asset

**接口路径**：`PUT /api/assets/waste-assets/{waste_asset_code}/`

**认证方式**：JWT Bearer Token

---

#### 6.8.5 删除报废记录 / Delete Waste Asset

**接口路径**：`DELETE /api/assets/waste-assets/{waste_asset_code}/`

**认证方式**：JWT Bearer Token

---

#### 6.8.6 获取资产的报废记录 / Get Waste Assets By Asset

**接口路径**：`GET /api/assets/waste-assets/by-asset/{asset_code}/`

**认证方式**：JWT Bearer Token

---

#### 6.8.7 获取报废统计 / Get Waste Asset Statistics

**接口路径**：`GET /api/assets/waste-assets/statistics/`

**认证方式**：JWT Bearer Token

**响应参数**：

| 参数名 | 类型 | 说明 |
|--------|------|------|
| total_waste_assets | integer | 报废资产总数 |
| this_year_waste | integer | 本年度报废数量 |
| monthly_waste | array | 按月统计 |

**响应示例**：

```json
{
  "code": 0,
  "msg": "success",
  "data": {
    "total_waste_assets": 50,
    "this_year_waste": 15,
    "monthly_waste": [
      {"month": 1, "count": 2},
      {"month": 2, "count": 3},
      {"month": 3, "count": 1}
    ]
  }
}
```

---

### 6.9 硬盘序列号管理 / Hard Disk SN Management

#### 6.9.1 获取硬盘序列号列表 / Get Hard Disk SN List

**接口路径**：`GET /api/assets/hard-disks/`

**认证方式**：JWT Bearer Token

**请求参数**：

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| page | integer | 否 | 页码 |
| page_size | integer | 否 | 每页数量 |
| harddisk_status | string | 否 | 硬盘状态过滤 |
| search | string | 否 | 搜索关键词（序列号、描述） |
| ordering | string | 否 | 排序字段 |

---

#### 6.9.2 创建硬盘序列号记录 / Create Hard Disk SN Record

**接口路径**：`POST /api/assets/hard-disks/`

**认证方式**：JWT Bearer Token

**请求参数**：

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| asset_code | string | 是 | 资产编码 |
| harddisk_sn_code | string | 是 | 硬盘序列号（唯一） |
| harddisk_number | integer | 否 | 硬盘编号 |
| harddisk_status | string | 否 | 硬盘状态 |
| harddisk_sn_description | string | 否 | 描述 |

---

#### 6.9.3 获取硬盘序列号详情 / Get Hard Disk SN Detail

**接口路径**：`GET /api/assets/hard-disks/{asset_code}/`

**认证方式**：JWT Bearer Token

---

#### 6.9.4 更新硬盘序列号 / Update Hard Disk SN

**接口路径**：`PUT /api/assets/hard-disks/{asset_code}/`

**认证方式**：JWT Bearer Token

---

#### 6.9.5 删除硬盘序列号 / Delete Hard Disk SN

**接口路径**：`DELETE /api/assets/hard-disks/{asset_code}/`

**认证方式**：JWT Bearer Token

---

#### 6.9.6 根据序列号搜索 / Search By Serial Number

**接口路径**：`POST /api/assets/hard-disks/search_by_serial_number/`

**认证方式**：JWT Bearer Token

**请求参数**：

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| harddisk_sn | string | 是 | 硬盘序列号 |

**请求示例**：

```json
{
  "harddisk_sn": "WD-WCC4J1234567"
}
```

**响应示例**：

```json
{
  "code": 0,
  "msg": "success",
  "data": {
    "count": 1,
    "serial_number": "WD-WCC4J1234567",
    "results": [
      {
        "id": 1,
        "asset_code": {
          "asset_code": "AST20260001",
          "asset_name": "联想笔记本"
        },
        "harddisk_sn_code": "WD-WCC4J1234567",
        "harddisk_number": 1,
        "harddisk_status": "in_use"
      }
    ]
  }
}
```

---

#### 6.9.7 获取资产的硬盘记录 / Get Hard Disks By Asset

**接口路径**：`GET /api/assets/hard-disks/by-asset/{asset_code}/`

**认证方式**：JWT Bearer Token

---

### 6.10 仪表盘 / Dashboard

#### 6.10.1 获取仪表盘概览 / Get Dashboard Overview

**接口路径**：`GET /api/assets/dashboard/overview/`

**认证方式**：JWT Bearer Token

**响应参数**：

| 参数名 | 类型 | 说明 |
|--------|------|------|
| assets.total | integer | 资产总数 |
| assets.in_use | integer | 在用资产数 |
| assets.in_store | integer | 在库资产数 |
| assets.scrapped | integer | 已报废资产数 |
| contracts.total | integer | 合同总数 |
| contracts.pending | integer | 待结算合同数 |
| out_assets.total | integer | 出库记录总数 |
| out_assets.in_use | integer | 在用出库数 |

**响应示例**：

```json
{
  "code": 0,
  "msg": "success",
  "data": {
    "assets": {
      "total": 500,
      "in_use": 280,
      "in_store": 200,
      "scrapped": 20
    },
    "contracts": {
      "total": 50,
      "pending": 15
    },
    "out_assets": {
      "total": 200,
      "in_use": 150
    }
  }
}
```

---

#### 6.10.2 按类型统计资产 / Get Asset Statistics By Type

**接口路径**：`GET /api/assets/dashboard/asset_by_type/`

**认证方式**：JWT Bearer Token

**响应示例**：

```json
{
  "code": 0,
  "msg": "success",
  "data": [
    {"type_name": "电子设备", "count": 200},
    {"type_name": "办公家具", "count": 150},
    {"type_name": "生产设备", "count": 100}
  ]
}
```

---

#### 6.10.3 获取最近入库资产 / Get Recent Assets

**接口路径**：`GET /api/assets/dashboard/recent_assets/`

**认证方式**：JWT Bearer Token

**响应示例**：

```json
{
  "code": 0,
  "msg": "success",
  "data": [
    {
      "asset_code": "AST20260001",
      "asset_name": "联想笔记本",
      "asset_entry_date": "2026-05-08"
    }
  ]
}
```

---

## 附录：通用错误码说明

| 错误码 | HTTP 状态码 | 说明 |
|--------|-------------|------|
| 0 | 200/201 | 成功 |
| 1 | 400 | 请求参数错误 |
| 1 | 401 | 未授权（Token 无效或已过期） |
| 1 | 403 | 权限不足 |
| 1 | 404 | 资源不存在 |
| 1 | 500 | 服务器内部错误 |

---

## 附录：资产状态说明

| 状态码 | 说明 |
|--------|------|
| in_store | 在库 |
| in_use | 在用 |
| in_scrapped | 已报废 |

---

## 附录：员工状态说明

| 状态码 | 说明 |
|--------|------|
| active | 在职 |
| left | 离职 |
| retirement | 退休 |
| dismissed | 辞退 |
| other | 其他 |

---

## 附录：仓库类型说明

| 类型码 | 说明 |
|--------|------|
| newasset | 新资产仓 |
| recycle | 回收仓 |
| damaged | 待报废仓 |

---

*文档生成时间：2026 年 05 月 08 日*
