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
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.d.ts', 'src/**/__tests__/**', 'src/types/**', 'src/router/index.ts'],
      thresholds: {
        statements: 80,
        branches: 80,
        functions: 80,
        lines: 80,
        'src/stores/**/*.ts': {
          statements: 90,
          branches: 90,
          functions: 90,
          lines: 90,
        },
      },
    },
  },
})
