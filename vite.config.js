import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['logo_flowspace.png', 'robots.txt', 'apple-touch-icon.png'],
      manifest: {
        name: 'FlowSpace',
        short_name: 'FlowSpace',
        description: 'Gestión operativa y personal - Tu Segundo Cerebro',
        theme_color: '#007AFF',
        background_color: '#FFFFFF',
        display: 'standalone',
        orientation: 'portrait-primary',
        start_url: '/',
        icons: [
          {
            src: 'logo_flowspace.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'logo_flowspace.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          }
        ]
      },
      workbox: {
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024, // 4MB
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp}']
      }
    })
  ],
  server: {
    host: '0.0.0.0', // Escuchar en todas las interfaces de red
    port: 5173, // Puerto por defecto de Vite
    strictPort: false, // Si el puerto está ocupado, intentar otro
  },
  optimizeDeps: {
    include: ['@emoji-mart/data', 'emoji-mart'],
    // Excluir html5-qrcode de la pre-optimización para reducir memoria
    exclude: ['html5-qrcode']
  },
  build: {
    // Usar esbuild para minificación (más rápido y usa menos memoria que terser)
    minify: 'esbuild',
    // Reducir el límite de tamaño de chunks para evitar divisiones problemáticas
    chunkSizeWarningLimit: 1000,
    commonjsOptions: {
      include: [/@emoji-mart/],
      // Excluir html5-qrcode del procesamiento común para reducir memoria
      exclude: [/html5-qrcode/]
    },
    rollupOptions: {
      output: {
        // No hacer chunking manual para evitar problemas de inicialización
        manualChunks: undefined
      }
    }
  }
})
