import { defineConfig, splitVendorChunkPlugin } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    splitVendorChunkPlugin() // تحسين: فصل حزم المكتبات الخارجية
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
    exclude: [], // تجنب استثناء أي تبعيات لتحسين الأداء
  },
  build: {
    sourcemap: false, // تحسين: تعطيل source maps في الإنتاج لتقليل الحجم
    minify: 'terser', // تحسين: استخدام terser للحصول على ضغط أفضل
    terserOptions: {
      compress: {
        drop_console: true, // تحسين: إزالة console.log في الإنتاج
      },
    },
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // تقسيم المكتبات الخارجية إلى حزم منفصلة
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
            // باقي المكتبات تذهب إلى حزمة vendor
            return 'vendor';
          }
        }
      }
    },
    chunkSizeWarningLimit: 1000, // تحسين: زيادة حد التحذير لحجم الحزم
  },
  resolve: {
    dedupe: ['react', 'react-dom'], // تحسين: تفادي وجود نسخ متعددة من React
    alias: {
      '@': path.resolve(__dirname, './src'),
      'tinymce/plugins': path.resolve(__dirname, 'node_modules/tinymce/plugins')
    }
  },
  server: {
    // تكوين الخادم المحلي
    hmr: {
      overlay: true, // تفعيل واجهة أخطاء التطبيق الساخن
    },
  },
  css: {
    // تحسين الـ CSS
    devSourcemap: true, // تفعيل source maps للـ CSS في وضع التطوير
  },
  preview: {
    // إعدادات المعاينة
    port: 5000,
    strictPort: false, // السماح بتغيير المنفذ إذا كان المنفذ 5000 مشغولاً
  },
})