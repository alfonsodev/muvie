#!/usr/bin/env node
/**
 * Writes the current git commit short hash to build-meta.json.
 * Run this just before `eas build` so the hash is embedded in the app bundle.
 */

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const outFile = path.join(__dirname, "..", "build-meta.json");

let gitCommit = "unknown";
try {
  gitCommit = execSync("git rev-parse --short HEAD", { cwd: __dirname })
    .toString()
    .trim();
} catch (e) {
  console.warn("[set-build-meta] Could not read git hash:", e.message);
}

fs.writeFileSync(outFile, JSON.stringify({ gitCommit }, null, 2) + "\n");
console.log(`[set-build-meta] gitCommit = ${gitCommit}`);
