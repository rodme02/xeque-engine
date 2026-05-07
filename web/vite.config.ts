import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "./",
  // wasm-pack output lives at ../web/wasm relative to here; let it resolve
  // through the normal module pipeline.
  worker: {
    format: "es",
  },
  build: {
    target: "esnext",
    sourcemap: true,
  },
  server: {
    port: 5173,
    fs: {
      // allow Vite to serve the wasm-pack output that lives outside src/
      allow: [".."],
    },
  },
});
