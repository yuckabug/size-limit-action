import { defineConfig } from "bunup";

const config = defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  minify: true,
});

export default config;
