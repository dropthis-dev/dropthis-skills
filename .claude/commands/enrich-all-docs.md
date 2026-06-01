---
name: enrich-all-docs
description: >
  Regenerate all skill documentation for both dropthis-node and dropthis-cli.
  Scans source code in sibling repos, runs gap analyzers, and regenerates SKILL.md
  files, reference docs, and evals. Use when the user says "update all docs",
  "regenerate skills", "enrich docs", "sync skills", or after any SDK/CLI source change.
---

# Enrich All Docs

Regenerate all skill documentation in this repo by scanning source code in
the sibling SDK and CLI repos.

## Prerequisites

This skill expects the following workspace layout:

```
dropthis-dev/
  dropthis-node/      ← SDK source (sibling)
  dropthis-cli/       ← CLI source (sibling)
  dropthis-skills/    ← This repo (skills output)
```

## Step 1: Run both gap analyzers

```bash
cd ../dropthis-node && npx tsx .claude/commands/analyze_gaps.ts
cd ../dropthis-cli && npx tsx .claude/commands/analyze_gaps.ts
```

If both report `summary.total_issues: 0`, report that all skills are up to date and stop.

## Step 2: Regenerate SDK skill

If the SDK analyzer found gaps, run the SDK enrich skill:

1. Read `../dropthis-node/src/` for the full public API surface
2. Diff against `skills/dropthis-node/SKILL.md` and `skills/dropthis-node/references/`
3. Regenerate any stale or missing documentation
4. Update `skill-evals/dropthis-node/evals.json` if scenarios changed

Output goes to:
- `skills/dropthis-node/SKILL.md`
- `skills/dropthis-node/references/*.md`
- `skill-evals/dropthis-node/evals.json`

## Step 3: Regenerate CLI skill

If the CLI analyzer found gaps, run the CLI enrich skill:

1. Read `../dropthis-cli/src/` for all commands, flags, and output shapes
2. Also read `../dropthis-node/src/types.ts` for SDK types the CLI wraps
3. Diff against `skills/dropthis-cli/SKILL.md` and `skills/dropthis-cli/references/`
4. Regenerate any stale or missing documentation
5. Update `skill-evals/dropthis-cli/evals.json` if scenarios changed

Output goes to:
- `skills/dropthis-cli/SKILL.md`
- `skills/dropthis-cli/references/*.md`
- `skill-evals/dropthis-cli/evals.json`

6. Regenerate the machine-readable command catalog and verify it is in sync (maintainer step — no CI runs this):
   - `npm install`  (first time only; installs the pinned @dropthis/cli + @dropthis/mcp dev-tools)
   - `npm run gen:commands`
   - `node scripts/gen-commands.mjs --check`  (must exit 0)

## Step 3b: Regenerate the MCP tool reference (maintainer step — no CI runs this)

1. `npm install`  (first time only; installs the pinned @dropthis/mcp dev-tool)
2. `npm run gen:tools`  (drives the live @dropthis/mcp `tools/list` schemas → regenerates the GENERATED block)
3. `node scripts/gen-tools.mjs --check`  (must exit 0)
4. Hand-authored prose above the GENERATED block (Choosing inputs, per-tool descriptions/outputs, Free vs Pro) stays manual.

## Step 4: Verify

Run both analyzers again:

```bash
cd ../dropthis-node && npx tsx .claude/commands/analyze_gaps.ts
cd ../dropthis-cli && npx tsx .claude/commands/analyze_gaps.ts
```

Confirm both report `summary.total_issues: 0`.

## Step 5: Report summary

Report:
- SDK: methods documented / updated / removed
- CLI: commands documented / updated / removed, flags documented / updated / removed
- Reference files regenerated
- Analyzer results (before and after)
