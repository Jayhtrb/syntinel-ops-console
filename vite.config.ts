import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// SynTinel Ops Console - single page ops dashboard.
// 1366x768 and 1920x1080 are the target viewports; chunk warnings are raised
// so chart/vendor weight stays visible during development.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5199,
    strictPort: false,
  },
  build: {
    target: 'es2022',
    sourcemap: false,
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('recharts') || id.includes('victory-vendor') || id.includes('/d3-')) return 'charts';
          if (id.includes('@mui') || id.includes('@emotion')) return 'mui';
          if (id.includes('react-dom') || id.includes('react/jsx') || id.includes('scheduler')) return 'react';
          return undefined;
        },
      },
    },
  },
});
