import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [
    tailwindcss({
      content: {
        files: [
          resolve(__dirname, "../../dacha/dacha/**/*.html"),
          resolve(__dirname, "../../dacha/home/**/*.html"),
          resolve(__dirname, "../../dacha/houses/**/*.html"),
          resolve(__dirname, "../../dacha/events/**/*.html"),
          resolve(__dirname, "../../dacha/faq/**/*.html"),
          resolve(__dirname, "../../dacha/news/**/*.html"),
          resolve(__dirname, "../../dacha/booking/**/*.html"),
          resolve(__dirname, "../../dacha/core/**/*.html"),
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      "@": resolve(__dirname, "./frontend/src"),
    },
  },
  root: resolve(__dirname, "frontend"),
  build: {
    outDir: resolve(__dirname, "static/dist"),
    emptyOutDir: true,
    rollupOptions: {
      input: resolve(__dirname, "frontend/index.html"),
      output: {
        entryFileNames: "assets/[name]-[hash].js",
        chunkFileNames: "assets/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash][extname]",
      },
    },
  },
  server: {
    static: {
      directory: resolve(__dirname),
      publicDir: resolve(__dirname, "static"),
    },
  },
});
