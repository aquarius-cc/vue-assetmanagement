import { fileURLToPath, URL } from 'node:url'

import { defineConfig, loadEnv } from 'vite'
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

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
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

      // 仅在构建（production）时启用分析和压缩
      ...(mode === 'production'
        ? [
            visualizer({
              filename: './dist/stats.html',
              open: true,
              gzipSize: true,
              brotliSize: true,
            }),
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
      // Bundle analyzer - only in build mode
      // process.env.NODE_ENV === 'production' &&
      //   visualizer({
      //     filename: './dist/stats.html',
      //     open: true,
      //     gzipSize: true,
      //     brotliSize: true,
      //   }),

      // // Compression plugin for production builds
      // process.env.NODE_ENV === 'production' &&
      //   compression({
      //     algorithm: 'gzip',
      //     ext: '.gz',
      //     threshold: 10240, // 10KB
      //     deleteOriginFile: false,
      //   }),
      // process.env.NODE_ENV === 'production' &&
      //   compression({
      //     algorithm: 'brotliCompress',
      //     ext: '.gz',
      //     threshold: 10240, // 10KB
      //     deleteOriginFile: false,
      //   }),
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
            if (id.includes('node_modules')) {
              // 把所有 node_modules 中的依赖单独打成 vendor chunk
              return 'vendor'
            }
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
      },
    },
  }
})
