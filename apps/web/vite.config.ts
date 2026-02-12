import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import tailwindcss from "@tailwindcss/vite";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..", "..");
const packagesRoot = path.resolve(repoRoot, "packages");

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue(), tailwindcss()],
  resolve: {
    alias: {
      "@corp/foundations": path.resolve(
        packagesRoot,
        "foundations",
        "src",
        "index.ts",
      ),
      "@corp/contracts": path.resolve(
        packagesRoot,
        "contracts",
        "src",
        "index.ts",
      ),
    },
  },
  server: {
    port: 5173,
    fs: { allow: [repoRoot] },
    headers: {
      // Security headers
      "X-Frame-Options": "SAMEORIGIN",
      "X-Content-Type-Options": "nosniff",
      "X-XSS-Protection": "1; mode=block",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
      // Prevent ETag inode leak by using custom etag
      "Cache-Control": "no-cache, no-store, must-revalidate",
    },
  },
  build: {
    target: "es2022",
    chunkSizeWarningLimit: 1200,
    // Optimize chunking to reduce number of requests
    rollupOptions: {
      output: {
        manualChunks: {
          // Group vendor libs together
          "vendor-vue": ["vue", "vue-router", "pinia"],
          "vendor-axios": ["axios"],
          // Group all services into one chunk
          "app-services": [
            "./src/services/ApiClientService.ts",
            "./src/services/AuthService.ts",
            "./src/services/AlertService.ts",
            "./src/services/StorageService.ts",
          ],
          // Group Pinia stores
          "app-stores": [
            "./src/pinia/stores/auth.store.ts",
            "./src/pinia/stores/policy.store.ts",
            "./src/pinia/stores/bootstrap.store.ts",
          ],
        },
      },
    },
  },
  css: {
    preprocessorOptions: {
      scss: {
        silenceDeprecations: ["import"],
      },
    },
  },
  // Disable ETag to prevent inode leak
  esbuild: {
    legalComments: "none",
  },
});
