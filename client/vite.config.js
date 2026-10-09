import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // During development the API runs separately; forward /api calls to it.
    proxy: { "/api": process.env.API_URL || "http://localhost:4000" },
  },
});
