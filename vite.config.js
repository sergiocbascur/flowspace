import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react({
      jsxRuntime: 'automatic',
      jsxImportSource: 'react'
    }),
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
  resolve: {
    dedupe: ['react', 'react-dom'], // Asegurar una sola instancia de React
    conditions: ['import', 'module', 'browser', 'default'] // Forzar resolución ESM cuando esté disponible
  },
  optimizeDeps: {
    include: ['@emoji-mart/data', 'emoji-mart', 'react', 'react-dom', 'lucide-react'],
    exclude: ['html5-qrcode'], // Excluir para evitar problemas de inicialización
    esbuildOptions: {
      jsx: 'automatic'
    }
  },
  build: {
    commonjsOptions: {
      include: [/@emoji-mart/, /react/, /react-dom/], // Incluir React para convertir CommonJS a ESM
      exclude: [/html5-qrcode/] // Excluir html5-qrcode de CommonJS processing
    },
    rollupOptions: {
      output: {
        manualChunks: undefined
      },
      onwarn(warning, warn) {
        // Suprimir advertencias específicas si es necesario
        if (warning.code === 'UNRESOLVED_IMPORT') return;
        warn(warning);
      }
    }
  }
})
