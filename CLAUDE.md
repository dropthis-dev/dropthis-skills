# CLAUDE.md

This repo contains AI agent skills for Dropthis. Each skill in `skills/` has a `SKILL.md` and `references/` directory with detailed docs.

Skills are canonical here — edit directly. No sync from other repos.

## Generated reference (don't hand-edit)

`skills/dropthis-cli/commands.json` and the `GENERATED` block in
`skills/dropthis-mcp/references/tools.md` are produced by `npm run gen` from the
published `@dropthis/cli` and `@dropthis/mcp` (devDependencies). When those
packages ship a command/tool surface change, bump the devDeps and regenerate:

```bash
npm install @dropthis/cli@latest @dropthis/mcp@latest
npm run gen
```

The `skills-drift` CI workflow runs `npm run check` against both the pinned and
the latest published packages — it goes red when the committed reference drifts
or a new release moves the surface ahead, so regeneration is enforced, not
remembered. The narrative `SKILL.md` prose is hand-written and not covered by
this guard — keep it in sync by hand.
