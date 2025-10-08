import { defineConfig } from 'vite'
import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from '@vitejs/plugin-react-swc'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rolldownOptions: {
      output: {
        manualChunks: (id) => {
          // Vendor chunk for core React and Convex
          if (id.includes('node_modules/react') ||
              id.includes('node_modules/react-dom') ||
              id.includes('node_modules/convex')) {
            return 'vendor';
          }

          // UI libraries chunk
          if (id.includes('node_modules/@radix-ui') ||
              id.includes('node_modules/lucide-react') ||
              id.includes('node_modules/react-icons') ||
              id.includes('node_modules/@tabler/icons-react') ||
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

          // Google AI and image processing
          if (id.includes('node_modules/@google/genai') ||
              id.includes('node_modules/jimp')) {
            return 'ai';
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
