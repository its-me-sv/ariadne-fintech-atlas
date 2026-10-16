import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Relative base so the build runs from any URL (the published artifact serves it from a subpath).
export default defineConfig({
  base: "./",
  plugins: [react()],
  build: {
    outDir: "dist",
    assetsDir: "assets",
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules/three") || id.includes("@react-three")) return "three";
          if (id.includes("@xyflow") || id.includes("elkjs")) return "graph";
          if (id.includes("node_modules/react") || id.includes("scheduler")) return "react";
          return undefined;
        },
      },
    },
  },
  test: { environment: "node" },
} as never);
