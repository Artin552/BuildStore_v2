import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Бэкенд Express. Браузер обращается к Vite (порт 5173), а Vite сам пересылает
// запросы /api и /uploads на этот адрес. Поэтому CORS настраивать не нужно.
const BACKEND_URL = 'http://127.0.0.1:4000';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true, // порт занят — сразу ошибка, а не тихий переход на другой порт
    proxy: {
      '/api': BACKEND_URL,
      '/uploads': BACKEND_URL,
    },
  },
});
