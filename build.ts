#!/usr/bin/env bun

await Bun.build({
  entrypoints: ["./src/index.ts"],
  outdir: "./dist",
  format: "esm",
  minify: true,
  target: "node",
});

export {};
