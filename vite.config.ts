import { fileURLToPath, URL } from 'node:url'

import { createLogger, defineConfig, loadEnv, type Logger, type LogErrorOptions } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import vueDevTools from 'vite-plugin-vue-devtools'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'
// import Icons from 'unplugin-icons/vite'
// import IconsResolver from 'unplugin-icons/resolver'
// import Inspect from 'vite-plugin-inspect'
import { visualizer } from 'rollup-plugin-visualizer'
import compression from 'vite-plugin-compression'

// [BF-087] dev 代理错误降噪（[PATCH-FE] customLogger 日志层过滤）
// AI_REVIEW_NEEDED: vite proxy error 过滤判据（AR-2①）
// 根因：Vite 代理错误日志点硬编码 config.logger.error(...err.stack)（vite 8.2.2
// dist/node/chunks/node.js:19212 http proxy error / :19218 ws proxy error /
// :19228 ws proxy socket error / :19254 ws proxy bypass error），无静默开关；
// 而 configure 钩子挂 proxy.on('error') 无效——Vite 在 configure 返回后才注册
// 自身处理器（:19209→:19210），EventEmitter 调用全部监听器，挡不住打全栈。
// customLogger 是 UserConfig 正式字段（index.d.ts:3598），createLogger 直接
// 返回它（:3234）成为 config.logger（:36616）→ proxyMiddleware 同一 config
// （:35845），四个日志点全走它——唯一干净的官方扩展点。
const PROXY_NOISE_CODES = new Set(['ECONNRESET', 'ECONNABORTED', 'ECONNREFUSED', 'EPIPE'])
const PROXY_NOISE_WINDOW_MS = 10_000

/**
 * 是否命中「预期性代理断连」降噪判据：双条件缺一不可——
 * 错误码在白名单 且 日志消息含 proxy（定位到代理日志点）。
 * 任一不满足 → false，原样透传（不吞真错误）。
 */
function shouldDowngradeProxyNoise(msg: string, options?: LogErrorOptions): boolean {
  const code = (options?.error as NodeJS.ErrnoException | null | undefined)?.code
  return typeof code === 'string' && PROXY_NOISE_CODES.has(code) && msg.includes('proxy')
}

/**
 * 同错误码 10s 窗口节流：窗口内重复错误静默丢弃，防 console 刷屏。
 * 返回 true 表示本次应静默。
 */
function isProxyNoiseThrottled(code: string, lastAt: number | undefined, now: number): boolean {
  return lastAt !== undefined && now - lastAt < PROXY_NOISE_WINDOW_MS
}

/**
 * 包装 Vite 默认 logger：仅拦截命中降噪判据的代理错误为单行提示（带节流），
 * 其余全部委托默认 logger（含未知错误完整堆栈，不吞异常）。
 */
function createProxyQuietLogger(): Logger {
  const base = createLogger()
  const lastLoggedAt = new Map<string, number>()
  return {
    info: (msg, options) => base.info(msg, options),
    warn: (msg, options) => base.warn(msg, options),
    warnOnce: (msg, options) => base.warnOnce(msg, options),
    clearScreen: type => base.clearScreen(type),
    hasErrorLogged: error => base.hasErrorLogged(error),
    // hasWarned 必须 getter/setter 委托（不可 spread 拷贝）：底 logger 的
    // warn* 会原地改写自身的 hasWarned（:3276），拷贝会读到陈旧值（Vite 经
    // :22309 读它）。
    get hasWarned() {
      return base.hasWarned
    },
    set hasWarned(value: boolean) {
      base.hasWarned = value
    },
    error: (msg, options) => {
      if (!shouldDowngradeProxyNoise(msg, options)) {
        base.error(msg, options)
        return
      }
      const code = String((options?.error as NodeJS.ErrnoException).code)
      const now = Date.now()
      if (isProxyNoiseThrottled(code, lastLoggedAt.get(code), now)) return
      lastLoggedAt.set(code, now)
      base.warn(`代理连接中断（${code}）：后端重载/重启或浏览器断开所致，属 dev 预期，前端将自动重连`)
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    // [BF-087] dev 代理错误降噪（详见文件头 createProxyQuietLogger 注释）
    customLogger: createProxyQuietLogger(),
    // 子路径部署支持（如 /admin/），默认根路径 '/'
    // router/index.ts 的 createWebHistory 已自动读取 import.meta.env.BASE_URL
    base: env.VITE_BASE_URL || '/',
    plugins: [
      vue(),
      vueJsx(),
      vueDevTools(),
      AutoImport({
        // Auto import functions from Vue, e.g. ref, reactive, toRef...
        // 自动导入 Vue 相关函数，如：ref, reactive, toRef 等
        imports: ['vue'],
        // Auto import functions from Element Plus, e.g. ElMessage, ElMessageBox... (with style)
        // 自动导入 Element Plus 相关函数，如：ElMessage, ElMessageBox... (带样式)
        resolvers: [
          ElementPlusResolver(),

          // Auto import icon components
          // 自动导入图标组件
          // IconsResolver({
          //   prefix: 'Icon',
          // }),
        ],
        dts: true,
      }),
      Components({
        resolvers: [
          // Auto register icon components
          // 自动注册图标组件
          // IconsResolver({
          //   enabledCollections: ['ep'],
          // }),
          // Auto register Element Plus components
          // 自动导入 Element Plus 组件
          ElementPlusResolver(),
        ],
        dts: true,
      }),
      // Icons({
      //   autoInstall: true,
      // }),

      // Inspect(),

      // 仅在构建（production）时启用压缩；bundle 分析需显式 ANALYZE=1 触发，避免 stats.html 混入生产产物（H-4）
      ...(mode === 'production'
        ? [
            // 用法：cross-env ANALYZE=1 npm run build（或 PowerShell: $env:ANALYZE='1'; npm run build）
            ...(process.env.ANALYZE
              ? [
                  visualizer({
                    filename: './dist/stats.html',
                    open: true,
                    gzipSize: true,
                    brotliSize: true,
                  }),
                ]
              : []),
            compression({
              algorithm: 'gzip',
              ext: '.gz',
              threshold: 10240, // 10KB
              deleteOriginFile: false,
            }),
            compression({
              algorithm: 'brotliCompress',
              ext: '.br', // ⚠️ 修正：Brotli 应使用 .br 后缀
              threshold: 10240,
              deleteOriginFile: false,
            }),
          ]
        : []),
    ].filter(Boolean),
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    // CSS 预处理器配置
    css: {
      preprocessorOptions: {
        scss: {
          // 使用 sass-embedded 作为 SCSS 预处理器
          // 移除 api 选项，或使用正确的配置
          // 如果需要指定编译器，请参考 Vite 文档
          silenceDeprecations: ['legacy-js-api'], // 可选
        },
      },
    },
    // Build optimizations
    build: {
      target: 'es2020',
      cssCodeSplit: true,
      sourcemap: false,
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: true,
          drop_debugger: true,
        },
        format: {
          // 👈 关键：Vite 8 必须用 format
          comments: false,
        },
      },
      rollupOptions: {
        output: {
          manualChunks(id: string) {
            if (!id.includes('node_modules')) return undefined
            // 【BF-004 修复】按域拆分重库, 消除单一 vendor chunk(2532KB)
            // 注意: zrender 必须与 echarts 同 chunk, 否则初始化顺序/循环依赖问题
            if (id.includes('echarts') || id.includes('zrender') || id.includes('vue-echarts')) {
              return 'echarts'
            }
            if (id.includes('exceljs')) return 'exceljs'
            if (id.includes('element-plus') || id.includes('@element-plus')) return 'element-plus'
            return 'vendor'
          },
          // Clean up chunk names
          chunkFileNames: 'assets/js/[name]-[hash].js',
          entryFileNames: 'assets/js/[name]-[hash].js',
          assetFileNames: (assetInfo) => {
            if (assetInfo.name?.endsWith('.css')) {
              return 'assets/css/[name]-[hash].[ext]'
            }
            return 'assets/[name]-[hash].[ext]'
          },
        },
      },
    },
    // 开发服务器配置
    server: {
      host: '0.0.0.0', // 允许外部访问
      // 从 .env 读取端口，若无则默认 5173
      port: env.VITE_PORT ? parseInt(env.VITE_PORT, 10) : 5173,
      // port: 5173,
      // 代理配置解决CORS问题
      proxy: {
        '/api': {
          // target: 'http://127.0.0.1:8000', // Django后端地址
          // 从 .env 读取后端地址，支持自定义
          target: env.VITE_API_TARGET || 'http://127.0.0.1:8000',
          changeOrigin: true, // 改变请求头中的host
          secure: false, // 如果是https接口，需要配置这个参数
          // rewrite: (path) => path.replace(/^\/api/, '') // 如果后端不需要/api前缀，可以重写路径
        },
        '/ws': {
          // 【BF-002 建议1】WebSocket 走 Vite 代理, 消除双 host 结构(localhost ↔ 127.0.0.1)。
          // dev 下前端用同源相对路径 /ws/... 由 5173 转发至后端; 生产同源走 nginx location /ws/。
          target: env.VITE_API_TARGET || 'http://127.0.0.1:8000',
          ws: true, // 启用 WebSocket 升级转发
          changeOrigin: true,
          secure: false,
        },
      },
    },
  }
})
