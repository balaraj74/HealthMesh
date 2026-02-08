import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

const isProduction = process.env.NODE_ENV === "production";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
    },
  },
  root: path.resolve(import.meta.dirname, "client"),
  // Load .env files from project root (where .env.local is)
  envDir: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
    // Disable sourcemaps in production for faster builds
    sourcemap: !isProduction,
    // Target modern browsers for smaller bundles
    target: "es2020",
    // Minification settings for smaller bundle size
    minify: isProduction ? "esbuild" : false,
    // CSS code splitting for better performance
    cssCodeSplit: true,
    // Optimize chunk splitting
    rollupOptions: {
      output: {
        manualChunks: {
          // Split vendor chunks for better caching
          "react-vendor": ["react", "react-dom"],
          "ui-vendor": ["framer-motion", "lucide-react", "recharts"],
          "radix-vendor": [
            "@radix-ui/react-dialog",
            "@radix-ui/react-dropdown-menu",
            "@radix-ui/react-tabs",
            "@radix-ui/react-tooltip",
            "@radix-ui/react-select",
          ],
          // Separate router for smaller initial bundle
          "router": ["wouter"],
          // Separate query client
          "query": ["@tanstack/react-query"],
        },
        // Use hashed filenames for cache busting
        entryFileNames: isProduction ? "assets/[name]-[hash].js" : "assets/[name].js",
        chunkFileNames: isProduction ? "assets/[name]-[hash].js" : "assets/[name].js",
        assetFileNames: isProduction ? "assets/[name]-[hash].[ext]" : "assets/[name].[ext]",
      },
    },
    // Report compressed size for better insights
    reportCompressedSize: true,
    // Reduce chunk size warnings threshold
    chunkSizeWarningLimit: 1000,
  },
  // Optimize esbuild for faster builds
  esbuild: {
    target: "es2020",
    // Drop console logs in production
    drop: isProduction ? ["console", "debugger"] : [],
  },
  server: {
    port: 3000,
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
  envPrefix: ["VITE_"],
});

