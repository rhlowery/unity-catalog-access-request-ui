import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react-swc'
import { visualizer } from 'rollup-plugin-visualizer'

// https://vite.dev/config/
/// <reference types="vitest" />
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [
      react(),
      mode === 'analyze' && visualizer({
        filename: 'dist/stats.html',
        open: true,
        gzipSize: true,
        brotliSize: true,
      })
    ].filter(Boolean),
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom'],
            lucide: ['lucide-react'],
            ui: ['clsx'],
          },
          chunkFileNames: (chunkInfo) => {
            const facadeModuleId = chunkInfo.facadeModuleId
            if (facadeModuleId) {
              const fileName = facadeModuleId.split('/').pop()
              if (fileName && fileName.includes('Service') || fileName.includes('Adapter')) {
                return 'services/[name]-[hash].js'
              }
              if (fileName && fileName.includes('Component') || fileName.includes('.tsx')) {
                return 'components/[name]-[hash].js'
              }
            }
            return 'chunks/[name]-[hash].js'
          }
        }
      },
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: true,
          drop_debugger: true,
          pure_funcs: ['console.log', 'console.info', 'console.debug']
        }
      },
      cssCodeSplit: true,
      sourcemap: false,
      reportCompressedSize: false,
      chunkSizeWarningLimit: 1000
    },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
      include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
      exclude: ['node_modules', 'dist', '.idea', '.git', '.cache'],
      css: false,
    },
    server: {
      proxy: {
        '/api': {
          // Target should ideally be the configured host. Fallback to accounts.cloud.databricks.com
          target: env.VITE_DATABRICKS_HOST || 'https://accounts.cloud.databricks.com',
          changeOrigin: true,
          secure: false,
          headers: {
            Authorization: `Bearer ${env.VITE_DATABRICKS_TOKEN}`
          }
        }
      }
    },
    optimizeDeps: {
      include: ['react', 'react-dom', 'lucide-react', 'clsx'],
      exclude: ['@vitejs/plugin-react-swc']
    }
  }
})
