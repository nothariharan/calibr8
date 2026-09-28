import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: { assetsDir: "static" },
  server: {
    proxy: {
      "/api": "http://127.0.0.1:8080",
      "/docs": "http://127.0.0.1:8080",
      "/health": "http://127.0.0.1:8080",
      "^/projects/[^/]+/certificate": {
        target: "http://127.0.0.1:8080",
      },
    },
  },
});
