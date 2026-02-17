import fs from 'fs'
import path from 'path'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

function getApiPortFromBackend(): string | null {
  try {
    const envPath = path.resolve(__dirname, '../../services/api/.env')
    const content = fs.readFileSync(envPath, 'utf-8')
    const match = content.match(/API_PORT\s*=\s*(\d+)/)
    return match ? match[1] : null
  } catch {
    return null
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiPort = env.VITE_API_PORT || getApiPortFromBackend() || '8000'
  console.log(`[miniapp-web] API proxy → http://localhost:${apiPort}`)
  return {
    plugins: [react()],
    base: '/miniapp/',
    build: {
      outDir: 'dist',
      sourcemap: false,
    },
    server: {
      port: 5173,
      host: true,
      proxy: {
        '/api': {
          target: `http://localhost:${apiPort}`,
          changeOrigin: true,
          timeout: 30000,
        },
      },
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
  }
})
