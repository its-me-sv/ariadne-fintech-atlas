import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Relative base: the same build works at a domain root (GitHub Pages at ariadne.surajvijayan.dev) or under a subpath,
// and the app uses hash routes, so no server rewrites are needed.
export default defineConfig({
  base: "./",
  plugins: [react()],
  build: {
    outDir: "dist",
    assetsDir: "assets",
    chunkSizeWarningLimit: 1600,
    // Vite 8 bundles with Rolldown: named chunk groups replace the old manualChunks function.
    // Higher priority wins when a module matches several groups. Paths are matched with [\\/]
    // so the rules also hold for Windows-style module ids.
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            // the shell every page needs
            { name: "react", priority: 40, test: /node_modules[\\/](react|react-dom|scheduler|zustand|use-sync-external-store|minisearch|@babel[\\/]runtime)[\\/]/ },
            // 3D overview only
            { name: "three", priority: 30, test: /node_modules[\\/](three|three-stdlib|@react-three[\\/][^\\/]+)[\\/]/ },
            // globe only: the map libraries and the TopoJSON, kept out of the graph chunk
            { name: "geo", priority: 20, test: /node_modules[\\/](d3-geo|d3-array|internmap|topojson-client|world-atlas)[\\/]/ },
            // architecture graph only
            { name: "graph", priority: 10, test: /node_modules[\\/](@xyflow[\\/][^\\/]+|elkjs|d3-[^\\/]+|classcat)[\\/]/ },
          ],
        },
      },
    },
  },
  test: { environment: "node" },
} as never);
