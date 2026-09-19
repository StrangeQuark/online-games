import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
const target = process.env.API_TARGET || "http://localhost:8080";
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": { target, changeOrigin: false },
      "/ws": { target, ws: true, changeOrigin: false },
    },
  },
});
