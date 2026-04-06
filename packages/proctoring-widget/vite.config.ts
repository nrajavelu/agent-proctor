import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  root: 'src',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        widget: resolve(__dirname, 'src/widget.html')
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: '[name].js',
        assetFileNames: '[name].[ext]'
      }
    },
    target: 'es2015',
    sourcemap: true
  },
  server: {
    port: 5173,
    host: true
  },
  preview: {
    port: 5173,
    host: true
  }
});