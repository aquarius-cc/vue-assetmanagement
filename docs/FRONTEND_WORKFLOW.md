# Git 工作流 & CI/CD 规范

> 分支策略、提交规范、自动化检查的详细说明。

## 1. 分支策略

采用 **GitHub Flow** 简化版：

- `main`：生产稳定分支，禁止直接提交
- `develop`：开发主干分支
- `feature/*`：功能开发分支
- `fix/*`：Bug 修复分支
- `hotfix/*`：线上紧急修复
- `feature/<feature-name>`：新功能开发。
- `fix/<bug-name>`：Bug 修复。
- `chore/<update>`：依赖升级、配置调整等。

**禁止**直接向 `main` 推送代码。

---

## 2. 提交规范

遵循 **Conventional Commits**，格式：
<type>(<scope>): <subject>
| type | 说明 |
|------|------|
| feat | 新功能 |
| fix | Bug 修复 |
| docs | 文档更新 |
| style | 代码格式调整（不影响功能） |
| refactor | 代码重构 |
| perf | 性能优化 |
| test | 测试相关 |
| chore | 构建/工具链 |

- 示例： 
- feat(资产): 添加资产批量导入功能
- fix(领用): 修复日期校验错误
- chore: 升级 Vite 到 8.x

---

## 3. 自动化检查（Git Hooks）

### pre-commit

由 `lint-staged` 执行，只检查暂存文件：

- `*.{js,ts,vue}` → `eslint --fix` + `prettier --write`
- `*.{css,scss,md}` → `prettier --write`

如果修复后仍有错误，提交将被阻止。

### commit-msg

由 `commitlint` 校验提交信息格式，不符合上述规范则拒绝提交。

---

## 4. 开发流程 (Harness Steps)

1. **获取最新代码**：`git checkout main && git pull`
2. **创建分支**：`git checkout -b feature/xxx`
3. **开发**：编写代码，遵守 `docs/FRONTEND.md` 规范。
4. **自测**：
   
   ```bash
   npm run lint
   npm run test
   ```

## 3. 合并流程

- 功能开发完成 → 提 MR/PR → 代码评审
- 评审通过后合并至 develop
- 版本迭代完成统一合并至 main

## 4. CI/CD 流程

- 提交触发：代码检查、类型校验、单元测试
- 合并触发：打包构建、环境部署
- 生产发布：人工确认 + 自动化发布
