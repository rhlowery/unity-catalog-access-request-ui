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
          target: env.VITE_DATABRICKS_HOST || 'https://dbc-placeholder.cloud.databricks.com',
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
