import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(path.resolve(__dirname, "package.json"), "utf-8")) as { version: string };

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  /** Mesmo diretório que `vite.config.ts`, para encontrar `.env` mesmo com `cwd` diferente. */
  envDir: path.resolve(__dirname),
  define: {
    /** Versão semântica única: altere o campo `version` do package.json ao publicar mudanças. */
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  preview: {
    // Docker / Easypanel: o proxy envia Host=domínio público; sem isso o preview responde "Blocked request".
    allowedHosts: true,
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime"],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) {
            if (id.includes("@supabase")) return "supabase";
            // Radix + React no mesmo chunk evita "Cannot read properties of undefined (reading 'forwardRef')" em produção
            if (id.includes("@radix-ui")) return "react-vendor";
            if (id.includes("lucide-react")) return "icons";
            if (id.includes("react-dom") || id.includes("react-router")) return "react-vendor";
            if (id.includes("react")) return "react-vendor";
            if (id.includes("@tanstack/react-query")) return "query";
          }
        },
      },
    },
    chunkSizeWarningLimit: 900,
  },
}));
