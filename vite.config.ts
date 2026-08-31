import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  publicDir: false,
  build: { outDir: 'dist', emptyOutDir: true },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    exclude: ['tests/e2e/**', 'node_modules/**', 'dist/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary'],
      include: ['src/lib/**/*.ts', 'src/components/TopBar.tsx', 'src/components/BrowserBar.tsx', 'src/components/ReviewDrawer.tsx'],
      thresholds: { lines: 80, functions: 80, branches: 80, statements: 80 }
    }
  }
});
