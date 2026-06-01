---
name: dropthis-mcp
description: >
  Publish anything online through the dropthis MCP server — inline HTML/content, a
  public URL to fetch, or (locally) a file — and get a permanent URL back. Use when the
  user wants to publish, update, or manage drops via MCP tools (`dropthis_publish`,
  `dropthis_redeploy`, `dropthis_update`, `dropthis_get`, `dropthis_list`,
  `dropthis_list_deployments`, `dropthis_delete`, `dropthis_whoami`, `dropthis_account`)
  in Claude Code, Claude Desktop, Cursor, Windsurf,
  ChatGPT, or n8n, or when configuring the dropthis MCP server (local stdio or the hosted
  remote connector). Load this before calling dropthis tools — it covers input selection,
  auth, and the free/Pro contract.
license: MIT
metadata:
  author: dropthis
  homepage: https://dropthis.app
  source: https://github.com/dropthis-dev/dropthis-mcp
  openclaw:
    primaryEnv: DROPTHIS_API_KEY
    requires:
      env:
        - DROPTHIS_API_KEY
    envVars:
      - name: DROPTHIS_API_KEY
        required: true
        description: dropthis API key (sk_ prefix). Required for the local stdio server and the static-key remote path.
    install:
      - kind: node
        package: "@dropthis/mcp"
        label: dropthis MCP server (stdio)
    links:
      repository: https://github.com/dropthis-dev/dropthis-mcp
      documentation: https://dropthis.app/docs/mcp
      remoteEndpoint: https://mcp.dropthis.app/mcp
inputs:
  - name: DROPTHIS_API_KEY
    description: "dropthis API key. Used by the local stdio server (env) and the static-key remote path (Bearer)."
    required: true
references:
  - references/tools.md
---

# dropthis MCP

The dropthis MCP server exposes publishing as a small set of typed tools. An agent that has
produced content can publish it and get a permanent public URL back.

## Connecting

**Local (stdio)** — for coding agents. Run `npx -y @dropthis/mcp` with `DROPTHIS_API_KEY` set:

```json
{
  "mcpServers": {
    "dropthis": {
      "command": "npx",
      "args": ["-y", "@dropthis/mcp"],
      "env": { "DROPTHIS_API_KEY": "sk_..." }
    }
  }
}
```

**Remote (hosted)** — `https://mcp.dropthis.app/mcp`. Chat clients (ChatGPT, claude.ai) use
OAuth (approve a 6-digit email login). Automation (n8n, CI) sends `Authorization: Bearer sk_...`.

## Choosing the publish input

`dropthis_publish` takes **exactly one** of:

- `content` — inline HTML/text you generated. The common case.
- `source_url` — a public `http(s)` URL the server fetches (SSRF-guarded). Use to mirror an existing page.
- `files` — a multi-file bundle of `{path, content|content_base64, content_type?}` (plus optional `entry`). Use this for multi-file apps — do NOT inline CSS/JS into one HTML string.
- `file` — a local file path. **Local/stdio only**; not available on the remote connector.

To change settings (title, visibility, password, noindex, vanity slug) without changing
content, use `dropthis_update`. To ship a new content version to the same URL, use
`dropthis_redeploy` (it accepts the same content inputs: `content`, `source_url`, `files`, or `file`).

**Retain the `id` from the publish response for all follow-up operations.** Every id-based
tool — `dropthis_redeploy`, `dropthis_update`, `dropthis_get`, `dropthis_delete`,
`dropthis_list_deployments` — takes the full `drop_…` id as `drop_id`, NOT the slug or the
URL token. `dropthis_publish` returns both `id` and `slug` (and `url`); keep the `id`.

```json
// dropthis_publish returns:
{ "id": "drop_6hRcUUok5PYeEK6jJQY5Is", "slug": "0izsioo", "url": "https://dropthis.app/0izsioo" }
```

```text
# Redeploy uses the id, NOT the slug:
dropthis_redeploy { "drop_id": "drop_6hRcUUok5PYeEK6jJQY5Is", "content": "<h1>v2</h1>" }
# WRONG: dropthis_redeploy { "drop_id": "0izsioo", ... }  → fails (slug is not a drop id)
```

If you only have the slug/URL, call `dropthis_list` to recover the `id`.

## Auth and limits

Call `dropthis_whoami` first if you need to know the plan (Free vs Pro) before publishing.
Pro-only inputs (`password`, `vanity_slug`, custom domains) return an in-band upgrade nudge
on Free — read the `suggestion` field in the tool result and relay it.

## Errors

Tool results carry the server's `code`, `suggestion`, and `request_id` in-band. On an error,
adjust based on `suggestion` (e.g., switch to a smaller payload, upgrade, or fix the input).

See [references/tools.md](references/tools.md) for the full per-tool contract.
