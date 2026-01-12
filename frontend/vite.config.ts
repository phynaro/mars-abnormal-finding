import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  base: '/', // Ensure proper base URL for relative paths
  plugins: [
    react({
      // Use classic JSX runtime to avoid jsxDEV issues
      jsxRuntime: 'classic',
      jsxImportSource: 'react'
    })
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 3000,
    host: '0.0.0.0',
    allowedHosts: ['localhost', '127.0.0.1', '192.168.0.241', 'pch.trazor.cloud'],
    // Enable polling for file watching (required for Docker on Windows)
    watch: {
      usePolling: true,
      interval: 1000
    },
    hmr: {
      host: 'pch.trazor.cloud',
      protocol: 'wss'
    }
  },
  build: {
    // Ensure proper handling of canvas and blob operations in production
    rollupOptions: {
      output: {
        // Ensure proper chunking for react-easy-crop
        manualChunks: {
          'react-easy-crop': ['react-easy-crop']
        }
      }
    },
    // Add source maps for better debugging in production
    sourcemap: true,
    // Ensure proper asset handling
    assetsInlineLimit: 0,
    // Ensure development-like behavior in build
    minify: false
  },
  // Add CSP headers for canvas operations
  define: {
    // Ensure proper environment detection
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development')
  }
})
