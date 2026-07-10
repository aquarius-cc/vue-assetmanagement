
---

### 文件 2：`docs/FRONTEND_TESTING_PROTOCOL.md`（前端 Vue/Vitest 专用）

```markdown
# 前端测试强制执行清单（FRONTEND TESTING PROTOCOL）
> **⚠️ 红线警告**：本协议与根级 AGENTS.md §3.7 联动。执行 `npm run test:unit` 前，必须逐项完成以下清单并输出证据，否则视为测试偷懒。

## 1. 测试文件拓扑（防遗漏）
- **临近原则**：修改 `src/components/AssetTable.vue` → 必须在同目录下创建/修改 `__tests__/AssetTable.spec.ts` 或 `AssetTable.test.ts`。
- **描述块强制**：测试文件必须包含顶级 `describe('<组件名>', () => { ... })`，并按功能分组（如 `describe('渲染逻辑')`、`describe('用户交互')`、`describe('边界状态')`）。

## 2. 边界值字典（防偏差——必须直接引用以下硬编码值）
AI 在编写测试数据时，必须从下表中**至少选取 80% 的异常值**，禁止全部使用常规数据：

| 分类 | 强制使用的异常值（直接复制到代码中） |
| :--- | :--- |
| **Props/数据** | `null`, `undefined`, `[]` (空数组), `{}` (空对象), `[1, 2, 3, 4, 5]` (超长列表) |
| **文本渲染** | `""` (空), `"这是一个极其极其极其极其极其长的文本内容".repeat(50)` (溢出) |
| **数字** | `-999`, `0`, `Number.MAX_SAFE_INTEGER`, `NaN` |
| **Store 状态** | `{ items: null }`, `{ items: [] }`, `{ error: 'Network Error' }` |
| **路由参数** | `:id` 为 `'abc'` (非数字), `'999999'` (不存在) |

## 3. 原子化测试法则（Anti-Batching —— 防自我放过）
- **禁止“万能测试”**：一个 `it()` 或 `test()` 用例**只能验证一种行为或一个边界**。
- **强制拆分**：测试“表格空状态”和“表格超长文本截断”必须分成 2 个独立的 `it()`。
  - ❌ *错误示范*：`it('should handle edge cases', () => { ... })`（里面塞了多个断言）→ **视为违规，需重构**。
  - ✅ *正确示范*：`it('should show empty placeholder when list is empty')` / `it('should truncate text when length > 50')`
- **断言锁死**：每个 `it()` 必须至少包含 **1 个 DOM 断言**（如 `expect(wrapper.text()).toContain('暂无数据')`）或 **1 个 Store 状态断言**（如 `expect(store.items.length).toBe(0)`）。**严禁**仅使用 `expect(true).toBe(true)` 或仅检查函数是否被调用（无状态验证）。

## 4. 异步与 Mock 敬畏协议（防自我放过）
- **必须模拟错误**：若组件调用了 `api.getAssets()`，除了 Mock 成功返回数据外，**必须单独开一个用例** Mock 为 `vi.rejected(new Error('Network Error'))`，并断言页面出现了错误提示组件，而不是白屏或卡死。
- **Pinia Store 隔离**：测试 Store 变动时，必须使用 `createTestingPinia` 创建独立实例，防止测试用例之间状态污染（必须显式断言 `store.$reset` 是否生效）。

## 5. 渲染边界强制验证（针对 UI 组件）
- **异常数据注入**：测试组件时，必须传入 `:items="null"` 或 `:data="undefined"` 作为 Prop，断言组件使用 `v-if` 或可选链（`?.`）优雅降级，而非抛出 `Cannot read properties of undefined`。
- **加载状态**：若组件包含 `loading` 状态，必须测试 `loading=true` 时显示骨架屏或加载圈，且 `loading=false` 时正常显示数据。

## 6. 执行前自检清单（强制输出）
在运行测试命令**之前**，AI 必须输出以下清单，否则父引擎按缺失证据处理：
```text
[测试预检] 
- 覆盖的边界类别（至少勾选3类）：数值[ ] 文本/渲染[ ] 空状态[ ] Store异常[ ] 路由参数[ ]
- 计划编写的测试用例数：<X>（正常渲染：<X>，交互逻辑：<X>，异常边界：<X>）
- 涉及的 Mock 场景：API成功[1个] / API失败[模拟500/超时]（如适用）
- 异步操作验证：是（包含 waitFor 或 flushPromises） / 否