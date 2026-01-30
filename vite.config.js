import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react-swc'

// https://vite.dev/config/
/// <reference types="vitest" />
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],
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
    }
  }
})
