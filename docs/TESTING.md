# 测试规范文档

> 单元测试与组件测试的编写指南。

## 1. 测试框架与工具

- **运行器**：Vitest
- **Vue 测试工具**：@vue/test-utils
- **模拟 DOM**：happy-dom
- **断言库**：Vitest 内置（兼容 chai 风格）

## 2. 文件组织

- 测试文件放在 `src/__tests__/` 或与被测文件同目录。
- 命名：`<被测文件名>.test.ts`（例如 `assetService.test.ts`）

## 3. 编写测试

### 3.1 纯函数/工具测试

```ts
import { describe, it, expect } from 'vitest'
import { formatAssetNo } from '@/utils/format'

describe('formatAssetNo', () => {
  it('应返回格式化后的资产编号', () => {
    expect(formatAssetNo(123)).toBe('AST-000123')
  })
})

### 3.2 组件测试

import { mount } from '@vue/test-utils'
import AssetForm from '@/components/AssetForm.vue'

describe('AssetForm', () => {
  it('提交时校验必填项', async () => {
    const wrapper = mount(AssetForm)
    await wrapper.find('form').trigger('submit')
    expect(wrapper.text()).toContain('请输入资产名称')
  })
})

### 3.3 store测试

import { setActivePinia, createPinia } from 'pinia'
import { useAuthStore } from '@/stores/auth'

describe('auth store', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('登录后设置 token', () => {
    const store = useAuthStore()
    store.token = 'test-token'
    expect(store.token).toBe('test-token')
  })
})

## 4 运行测试

npm run test           # 单次运行所有测试
npx vitest --watch     # 监视模式
npx vitest --coverage  # 覆盖率报告

## 5. 测试分层

- 单元测试：工具函数、公共方法、核心逻辑
- 集成测试：接口联动、模块协作流程
- 业务测试：完整场景、边界用例、异常场景

## 6. 编写规范

- 关键业务必须覆盖测试用例
- 边界值、异常参数、空数据优先覆盖
- 测试用例语义化命名，便于维护

## 7. 执行流程

- 本地开发：提交前本地自测 + 单测运行
- CI 阶段：自动执行全量测试，失败禁止合并
- 版本上线：回归测试 + 场景验收

## 8. 质量要求

- 核心模块测试覆盖率达标
- 修复 Bug 必须补充对应回归用例

## 9. 测试覆盖率目标

- 工具函数：≥ 90%
- Store / Services：≥ 70%
- 组件：核心交互路径 ≥ 60%

## 10. 注意事项

- AI 添加新功能时必须同步编写对应测试
- 优先测试关键业务逻辑（资产状态流转、权限判断）
- 避免测试第三方库的实现细节（如 Element Plus 组件内部行为）
