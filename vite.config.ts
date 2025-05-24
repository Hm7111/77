import { defineConfig, splitVendorChunkPlugin } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  base: '/',
  plugins: [
    react(),
    splitVendorChunkPlugin()
  ],
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      '@tinymce/tinymce-react',
      'tinymce/tinymce',
      'zustand',
      'framer-motion',
      'html2canvas',
      'jspdf'
    ],
    exclude: [],
  },
  build: {
    sourcemap: false,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: false,
      },
    },
    rollupOptions: {
      output: {
        manualChunks: undefined
      }
    },
    chunkSizeWarningLimit: 1000,
  },
  resolve: {
    dedupe: ['react', 'react-dom'],
    alias: {
      '@': path.resolve(__dirname, './src'),
      'tinymce/plugins': path.resolve(__dirname, 'node_modules/tinymce/plugins')
    }
  },
  server: {
    hmr: {
      overlay: true,
    },
  },
  css: {
    devSourcemap: true,
  },
  preview: {
    port: 5000,
    strictPort: false,
  },
})