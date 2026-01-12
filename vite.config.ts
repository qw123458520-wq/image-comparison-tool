import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import electron from 'vite-plugin-electron/simple'

export default defineConfig({
  plugins: [
    react(),
    electron({
      main: {
        entry: 'electron/main.ts',
        vite: {
          build: {
            rollupOptions: {
              external: ['better-sqlite3'],
            },
          },
        },
      },
      preload: {
        input: 'electron/preload.ts',
      },
      renderer: {},
    }),
  ],
  server: {
    port: 3000,
  },
  build: {
    // 禁用代码分割，使用单个包以提升加载速度
    rollupOptions: {
      output: {
        manualChunks: undefined, // 禁用代码分割
      },
    },
    // 关闭源码映射以减小体积
    sourcemap: false,
    // 增大 chunk 大小警告阈值
    chunkSizeWarningLimit: 2000,
    // 启用压缩优化
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: false, // 保留 console，便于调试
        drop_debugger: true,
      },
    },
  },
})
