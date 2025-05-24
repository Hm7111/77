import { defineConfig, splitVendorChunkPlugin } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
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
        drop_console: true,
      },
    },
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('@tinymce') || id.includes('tinymce')) {
              return 'tinymce';
            }
            if (id.includes('react')) {
              return 'react';
            }
            if (id.includes('zustand') || id.includes('@tanstack/react-query')) {
              return 'utils';
            }
            if (id.includes('html2canvas') || id.includes('jspdf') || id.includes('pdf-lib')) {
              return 'pdf';
            }
            if (id.includes('framer-motion') || id.includes('lucide-react')) {
              return 'ui';
            }
            if (id.includes('@supabase/supabase-js')) {
              return 'supabase';
            }
            return 'vendor';
          }
        }
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