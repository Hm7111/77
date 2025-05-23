import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      '@tinymce/tinymce-react',
      'tinymce/tinymce'
    ],
    exclude: [],
  },
  build: {
    commonjsOptions: {
      transformMixedEsModules: true,
    },
    rollupOptions: {
      output: {
        manualChunks: {
          tinymce: ['@tinymce/tinymce-react', 'tinymce'],
          react: ['react', 'react-dom']
        }
      }
    }
  },
  resolve: {
    dedupe: ['react', 'react-dom'],
    alias: {
      // Add alias for tinymce plugins if needed
      'tinymce/plugins': path.resolve(__dirname, 'node_modules/tinymce/plugins')
    }
  }
});