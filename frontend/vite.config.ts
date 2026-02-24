import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  server: {
    host: '::',
    port: 8080,
    proxy: {
      // All /api/* → FastAPI backend
      // Override target with: VITE_API_URL=http://<rpi-ip>:8008 npm run dev
      '/api': {
        target: process.env.VITE_API_URL ?? 'http://localhost:8008',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
  },
});
