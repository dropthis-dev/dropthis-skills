#!/usr/bin/env node
// Generates skills/dropthis-cli/commands.json from the live CLI command catalog.
// Source of truth: the BUILT/published `@dropthis/cli` binary `dropthis commands --json`
// (buildCatalog(program) in dropthis-cli). We MUST use the built binary, not `tsx src/cli.ts`
// (that throws ReferenceError: PKG_VERSION is not defined — PKG_VERSION is a build-time define).
// Usage:
//   npm run gen:commands              # write commands.json
//   node scripts/gen-commands.mjs --check   # exit 1 if committed file is stale
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(here, "../skills/dropthis-cli/commands.json");
const require = createRequire(import.meta.url);

// Resolve the CLI bin from the repo's own node_modules (pinned devDependency).
// Fall back to a version-pinned npx if it isn't installed yet.
function runCli() {
  try {
    const pkgPath = require.resolve("@dropthis/cli/package.json");
    const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
    const bin = resolve(dirname(pkgPath), typeof pkg.bin === "string" ? pkg.bin : pkg.bin.dropthis);
    return execFileSync(process.execPath, [bin, "commands", "--json"], {
      encoding: "utf8",
      env: { ...process.env, CI: "true" },
    });
  } catch {
    return execFileSync("npx", ["--yes", "@dropthis/cli@0.6.0", "commands", "--json"], {
      encoding: "utf8",
      env: { ...process.env, CI: "true" },
    });
  }
}

const parsed = JSON.parse(runCli());
const next = `${JSON.stringify({ commands: parsed.commands }, null, 2)}\n`;

if (process.argv.includes("--check")) {
  const current = (() => {
    try {
      return readFileSync(OUT, "utf8");
    } catch {
      return "";
    }
  })();
  if (current !== next) {
    console.error("commands.json is stale. Run: npm run gen:commands");
    process.exit(1);
  }
  console.log("commands.json up to date.");
} else {
  writeFileSync(OUT, next);
  console.log(`Wrote ${OUT}`);
}
