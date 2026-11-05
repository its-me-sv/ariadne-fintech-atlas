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
          if (id.includes("vite/preload-helper") || id.includes("commonjsHelpers") || id.includes("vite/modulepreload-polyfill")) return "react";
          if (/node_modules\/(react|react-dom|scheduler|zustand|use-sync-external-store|minisearch|@babel\/runtime)\//.test(id)) return "react";
          if (id.includes("node_modules/three") || id.includes("@react-three")) return "three";
          // globe only: keep the map libraries and the TopoJSON out of the graph chunk
          if (/node_modules\/(d3-geo|d3-array|internmap|topojson-client|world-atlas)\//.test(id)) return "geo";
          if (id.includes("@xyflow") || id.includes("elkjs") || id.includes("d3-") || id.includes("classcat")) return "graph";
          return undefined;
        },
      },
    },
  },
  test: { environment: "node" },
} as never);
