// @lovable.dev/vite-tanstack-config already includes the required
// TanStack Start, React, Tailwind, tsconfig paths and Nitro plugins.
// Do not add them manually or they will be duplicated.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
  },

  // Desktop build: generate a standalone local Node server.
  // Electron will start this server internally; no Internet is required.
  nitro: {
    preset: "node_server",
  },
});