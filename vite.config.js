import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],
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
