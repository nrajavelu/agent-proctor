import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'ProctorSDK',
      fileName: (format) => `proctor-sdk.${format}.js`,
      formats: ['es', 'cjs', 'umd']
    },
    rollupOptions: {
      external: [],
      output: {
        globals: {}
      }
    },
    target: 'es2015',
    sourcemap: true,
    emptyOutDir: true
  },
  server: {
    port: 5174,
    host: true
  }
});