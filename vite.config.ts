import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const port = env.PORT ? parseInt(env.PORT, 10) : 3000;

  return {
    plugins: [react()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    server: { port },
    build: {
      sourcemap: false,
      minify: "esbuild",
      chunkSizeWarningLimit: 1500,
      rollupOptions: {
        output: {
          manualChunks: {
            react: ["react", "react-dom"],
            wagmi: ["wagmi", "viem"],
            charts: ["d3", "lightweight-charts"]
          }
        }
      }
    }
  };
});
