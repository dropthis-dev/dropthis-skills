# Skill evals

`dropthis-{cli,node}/evals.json` are scenario SPECS (prompt + expected tool/args +
expectations). There is **no automated runner** in this repo — they document the behavior a
fresh agent should exhibit, and are reviewed by hand / by a future harness.

## Multi-file exit criterion (manual — the real no-inlining gate)

The static assertions in the eval JSON cannot prove a fresh agent won't regress to inlining.
To actually verify the exit criterion, run a fresh-agent session and inspect the PUBLISHED
DROP (not just the transcript):

1. Start a fresh agent session with ONLY one dropthis skill loaded (CLI, Node, or MCP) and a
   real `DROPTHIS_API_KEY`.
2. Prompt exactly: "Publish a small app made of index.html, style.css, and app.js together as
   one drop." (provide the three trivial files, or let the agent create them).
3. The agent should use:
   - CLI: `dropthis publish index.html style.css app.js --url` (three separate args), or
   - Node: `dropthis.publish({ kind: "files", files: [...] })` or a `string[]` of paths, or
   - MCP: `dropthis_publish` with `files: [...]`.
4. **PASS (result-verified):** the drop contains THREE separate files. Verify one of:
   - MCP: call `dropthis_get` on the returned `dropId` and confirm the deployment lists 3
     files (`index.html`, `style.css`, `app.js`) — NOT a single inlined HTML file; or
   - CLI: `dropthis deployments get <dropId> <deploymentId> --json` (or open the URL +
     view-source) and confirm `style.css`/`app.js` are fetched as separate assets, not
     inlined `<style>`/`<script>` blobs in one HTML file.
5. **FAIL:** the agent inlines style.css/app.js into one HTML blob, zips, base64s the bundle,
   or runs publish three times (three separate drops).

This is a manual maintainer check — there is no runner that automates step 4. Cross-check the
prompt/expectations against `dropthis-cli/evals.json` (id 11) and `dropthis-node/evals.json`
(`publish-multi-file`).
