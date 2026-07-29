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
    outDir: resolve(__dirname, "dacha/dacha/static"),
    emptyOutDir: false,
    manifest: true,
    rollupOptions: {
      input: resolve(__dirname, "frontend/src/js/app.js"),
      output: {
        entryFileNames: "assets/[name].js",
        chunkFileNames: "assets/[name].js",
        assetFileNames: "assets/[name][extname]",
      },
    },
  },
  server: {
    origin: "http://localhost:5173",
    cors: true,
    static: {
      directory: resolve(__dirname),
      publicDir: resolve(__dirname, "static"),
    },
  },
});
