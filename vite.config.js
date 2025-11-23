import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0', // Escuchar en todas las interfaces de red
    port: 5173, // Puerto por defecto de Vite
    strictPort: false, // Si el puerto está ocupado, intentar otro
  },
  optimizeDeps: {
    include: ['@emoji-mart/data', 'emoji-mart', 'html5-qrcode']
  },
  build: {
    commonjsOptions: {
      include: [/@emoji-mart/, /html5-qrcode/, /node_modules/]
    },
    rollupOptions: {
      output: {
        manualChunks: undefined
      }
    }
  }
})
