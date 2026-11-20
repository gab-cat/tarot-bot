import { defineConfig } from 'vite'
import tailwindcss from "@tailwindcss/vite"
import react from '@vitejs/plugin-react-swc'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": `${import.meta.dirname}/src`,
    },
  },
  build: {
    rolldownOptions: {
      output: {
        manualChunks: (id) => {
          // Core React. Convex stays out so it loads only with the /xendit/success route.
          if (id.includes('node_modules/react/') ||
              id.includes('node_modules/react-dom/') ||
              id.includes('node_modules/scheduler/')) {
            return 'vendor';
          }

          // UI libraries chunk (lucide-react is only on the success page, so it stays there)
          if (id.includes('node_modules/@radix-ui') ||
              id.includes('node_modules/react-icons') ||
              id.includes('node_modules/class-variance-authority') ||
              id.includes('node_modules/clsx') ||
              id.includes('node_modules/tailwind-merge')) {
            return 'ui';
          }

          // Animation libraries chunk
          if (id.includes('node_modules/gsap') ||
              id.includes('node_modules/motion')) {
            return 'animations';
          }

          // Routing
          if (id.includes('node_modules/react-router-dom')) {
            return 'router';
          }
        }
      }
    }
  }
})
