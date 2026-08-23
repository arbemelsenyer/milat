/// <reference types="vitest" />
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "tests/**/*.test.ts"],
    /* tests/gecici/ GEÇİCİ tezgâhtır (CLAUDE.md §22): tek kullanımlık sonda
       dosyaları oraya yazılır, silinmez, üstüne yazılır. `include` onu KAPSAR
       ki tek tek çağrılabilsin (`npm run sonda`); kalıcı takıma karışmaması
       toplu koşumun kendi `exclude` bayrağıyla sağlanır (package.json `test`).
       Buraya exclude YAZILMAZ: config'teki exclude komut satırından
       gevşetilemiyor, o zaman sonda dosyası hiç çalıştırılamıyor. */
    exclude: ["**/node_modules/**", "**/dist/**"],
    globals: true,
  },
});
