import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['logo_flowspace.png', 'robots.txt', 'apple-touch-icon.png', 'firebase-messaging-sw.js'],
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
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp}'],
        // Excluir el service worker de Firebase del precaching
        globIgnores: ['**/firebase-messaging-sw.js']
      },
      // Registrar el service worker de Firebase manualmente
      injectRegister: 'auto'
    })
  ],
  server: {
    host: '0.0.0.0', // Escuchar en todas las interfaces de red
    port: 5173, // Puerto por defecto de Vite
    strictPort: false, // Si el puerto está ocupado, intentar otro
  },
  optimizeDeps: {
    include: ['@emoji-mart/data', 'emoji-mart'],
    exclude: ['html5-qrcode'] // Excluir porque se importa dinámicamente
  },
  build: {
    minify: false,
    commonjsOptions: {
      include: [/@emoji-mart/, /node_modules/]
    },
    rollupOptions: {
      output: {
        manualChunks: undefined
      }
    }
  }
})
