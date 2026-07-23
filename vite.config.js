import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [tailwindcss()],
  resolve: {
    alias: {
      "@": resolve(__dirname, "./frontend/src"),
    },
  },
  root: resolve(__dirname, "frontend"),
  build: {
    outDir: resolve(__dirname, "static/dist"),
    emptyOutDir: true,
    // Deterministic output names for WhiteNoise hash-based caching
    rollupOptions: {
      input: resolve(__dirname, "frontend/index.html"),
      output: {
        entryFileNames: "assets/[name]-[hash].js",
        chunkFileNames: "assets/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash][extname]",
      },
    },
  },
  // Vite serves /static/ from the project root in development
  server: {
    static: {
      directory: resolve(__dirname),
      publicDir: resolve(__dirname, "static"),
    },
  },
});
