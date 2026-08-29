import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    // React와 Tailwind 플러그인은 프로젝트 유지에 필수입니다.
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      // "@" 경로를 프로젝트의 "src" 폴더로 매핑합니다.
      '@': path.resolve(__dirname, './src'),
    },
  },

  optimizeDeps: {
    exclude: ['@portone/browser-sdk'],
  },

  // SVG, CSV 등 원시 파일 임포트를 지원합니다.
  assetsInclude: ['**/*.svg', '**/*.csv'],
})