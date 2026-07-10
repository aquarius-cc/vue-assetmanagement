# 项目背景与总览
## 1. 项目简介
本项目为企业资产管理系统前端标准化工程化项目，基于 **Vue 3 + TypeScript + Vite 8**，采用前后端分层架构，遵循 Harness 协作流程，统一规范约束，适配人工 + AI 协同开发模式。
涵盖资产入库、领用、外借、报废、回收等全流程，支持数据可视化、细粒度权限控制、批量导入导出等核心能力。

## 2. 技术栈总览
- 框架：Vue 3 (Composition API) + TypeScript + Pinia + Vue Router
- 构建：Vite 8 + unplugin 系列（自动导入、图标自动注册）
- UI：Element Plus（按需）+ vxe-table + ECharts
- 工具：Axios, dayjs, lodash-es, @vueuse/core
- 权限：@casl/ability + @casl/vue
- 规范：ESLint + Prettier + Husky + lint-staged + commitlint
- 测试：Vitest + @vue/test-utils + happy-dom
- 图标：Iconify（ep/carbon），基于 unplugin-icons 自动引入
- 后端：Python + Django
- 工程：Git 版本管理、自动化 CI/CD、规范校验、统一构建流程

## 3. 代码规范（摘要）
详细规则请查阅： **[docs/FRONTEND.md](docs/FRONTEND.md)**

- TypeScript 严格模式强制开启，全面禁用 `any` 类型
- Vue 组件统一使用 `<script setup lang="ts">` 语法糖
- 组件命名遵循 multi-word 多单词规则
- 样式统一使用 `<style scoped lang="scss">` 隔离作用域
- 无用变量统一以下划线 `_` 命名或直接移除
- 代码格式化：单引号、无行尾分号、行宽 100（Prettier 自动固化）

## 4. 核心目标
- 统一项目代码风格与架构约束
- 降低多人协作、AI 协同开发沟通成本
- 保障系统长期可维护性、可扩展性与迭代效率

## 5. 目录总览
- `/src`：业务源码
- `/docs`：全量规范、设计、流程文档
- `/tests`：测试用例
- `AGENTS.md`：轻量协作入口索引

```txt
src/
├── api/ # 接口请求模块
├── assets/ # 静态资源（CSS、图片）
├── components/ # 公共组件（按业务域分）
├── composables/ # 组合函数
├── directives/ # 自定义指令（v-can）
├── router/ # 路由配置 + 守卫
├── services/ # 业务逻辑服务层
├── stores/ # Pinia 状态管理（auth, app, asset）
├── types/ # 全局类型定义
├── utils/ # 工具函数（request, dayjs 等）
├── main.ts # 入口文件
└── App.vue
```

> **协作提示**：AI 代理或新成员应首先阅读 `AGENTS.md`，再根据需要查阅 `docs/` 下对应文档。