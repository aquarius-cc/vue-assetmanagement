process.env.TZ = 'Asia/Shanghai'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'happy-dom',
    // 【Q-05】限制 worker 数量以消除随机失败（"worker process failed to exit" /
    // happy-dom 环境 teardown 竞态）。原默认值按 CPU 核数派生，在多核开发机上
    // 会同时拉起过多 happy-dom 实例，导致用例随机红灯。
    // 4 是实测稳定值：全量 1878 用例 67s 通过，且不影响覆盖率统计口径。
    // 如需提速可用 `npx vitest run --maxWorkers=8` 单次覆盖，不改本配置。
    maxWorkers: 4,
    env: {
      VITE_TOKEN_CRYPTO_KEY: 'test_asset_mgmt_key',
      // 与 api/config.ts 的 EXPORT_MAX_ROWS_FALLBACK 保持一致（见 CT-1 测试口径说明）
      VITE_EXPORT_MAX_ROWS: '10000',
    },
    globals: true,
    include: ['src/**/*.{test,spec}.{js,ts}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts', 'src/**/*.vue'],
      exclude: ['src/**/*.d.ts', 'src/**/__tests__/**', 'src/types/**', 'src/router/index.ts'],
      thresholds: {
        // 【P2-2 分层棘轮】无前缀 key = 全局并集（含 .vue），会把 80 拖到 42% 直接假红。
        // 故 ts 与 vue 两层各自设前缀阈值，不再设无前缀全局阈值。
        'src/**/*.ts': {
          statements: 80,
          branches: 80,
          functions: 80,
          lines: 80,
        },
        'src/stores/**/*.ts': {
          statements: 90,
          branches: 90,
          functions: 90,
          lines: 90,
        },
        // 【P2-2 分层棘轮】.vue 单独成层，阈值 N 取实测基线（含 .vue 后的实测值）。
        // 棘轮语义 = 只升不降：覆盖率上移后需手工同步调高本块，回吐则 CI 红。
        // 2026-10-12 基线（120 个 .vue，绝大多数零覆盖）：语句 12.98 / 分支 11.66 / 函数 10.95 / 行 13.11。
        // 2026-10-30 重基（M-27/M-25，121 个 .vue，RoleManage/AuthUserManage 补挂载测试
        // 后两页由零覆盖升至 ~48%）：语句 21.14 / 分支 19.03 / 函数 18.66 / 行 21.36。
        // 四项均向下取到 0.1 粒度并留 ~0.1pt 余量，避免浮点噪声触发假红。
        'src/**/*.vue': {
          statements: 21.1,
          branches: 19.0,
          functions: 18.6,
          lines: 21.3,
        },
      },
    },
  },
})
