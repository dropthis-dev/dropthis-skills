---
name: dropthis-mcp
description: >
  Use when the user wants to publish, share, post, put online, make public, host, or get a
  shareable link for content — HTML, a report, dashboard, slide deck, site, or file — through
  the dropthis MCP server, even if they don't say "drop". Also use to update, edit, rename,
  password-protect, list, or delete published drops. Tools: `dropthis_publish`,
  `dropthis_update_content`, `dropthis_update_settings`, `dropthis_get`, `dropthis_list`,
  `dropthis_list_deployments`, `dropthis_delete`, `dropthis_account` — in Claude Code, Claude
  Desktop, Cursor, Windsurf, ChatGPT, or n8n. Also use when configuring the dropthis MCP server
  (local stdio or the hosted remote connector).
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
  - ../../references/domains.md
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
- `file` — a local file path **or directory** (a directory publishes as a complete multi-file site). **Local/stdio only**; not available on the remote connector.
- `paths` — a list of local file/directory paths published together as one bundle. **Local/stdio only**; not available on the remote connector.

## The publish-vs-update contract (read this)

`dropthis_publish` creates a **NEW** drop on every call and **never takes a `drop_id`**.
Updating an existing drop needs its full `drop_…` id (from the publish response). To change
something you already published, do **not** call `dropthis_publish` again — that makes a
duplicate. Instead:

- `dropthis_update_content` — replace the files at the URL (ships a new deployment, same URL).
  Content-only: it takes the same content inputs (`content`, `source_url`, `files`, `file`, or
  `paths`) and never changes settings. Not idempotent — a retry creates another deployment
  unless you pass the same `idempotency_key`.
- `dropthis_update_settings` — change title, visibility, password, noindex,
  expiry, or metadata, without touching content. Idempotent.

**Retain the `id` from the publish response for all follow-up operations.** Every id-based
tool — `dropthis_update_content`, `dropthis_update_settings`, `dropthis_get`, `dropthis_delete`,
`dropthis_list_deployments` — takes the full `drop_…` id as `drop_id`, NOT the slug or the
URL token. `dropthis_publish` returns both `id` and `slug` (and `url`); keep the `id`.

```json
// dropthis_publish returns:
{ "id": "drop_6hRcUUok5PYeEK6jJQY5Is", "slug": "0izsioo", "url": "https://dropthis.app/0izsioo" }
```

```text
# update_content uses the id, NOT the slug:
dropthis_update_content { "drop_id": "drop_6hRcUUok5PYeEK6jJQY5Is", "content": "<h1>v2</h1>" }
# WRONG: dropthis_update_content { "drop_id": "0izsioo", ... }  → fails (slug is not a drop id)
```

If you only have the slug/URL, call `dropthis_list` to recover the `id` — each item carries
its `slug`, so match the URL's slug against `items[].slug`. (The REST API can also resolve
directly: `GET /v1/drops?slug=<slug>`, owner-scoped, returns 0 or 1 drops.)

**Glossary:** a **Drop** is one published artifact at a permanent URL. A **deployment** is one
content version of a Drop (`dropthis_update_content` ships a new deployment; see them with
`dropthis_list_deployments`). A **Package** is a multi-file bundle (the `files` input).

## Custom domains

Serve drops at your own hostname. Two modes: `path` (many drops at `/{slug}/`) and `dedicated` (hostname = one drop at root).

```
dropthis_domains_connect { "hostname": "reports.example.com", "mode": "path" }
# → add CNAME reports.example.com → edge.dropthis.app at your DNS provider
dropthis_domains_verify { "domain": "reports.example.com" }  # re-call after retry_after if not live yet
dropthis_publish { "content": "<html>…</html>", "domain": "reports.example.com", "slug": "q4" }
```

Dedicated domain already occupied → 409 with `drop_id` of the occupant; use `dropthis_update_content` to replace its content or `dropthis_domains_update` to repoint. Path-mode publishes require relative asset references (root-relative `/…` → 422 with violations list).

See [../../references/domains.md](../../references/domains.md) for the full runbook.

## Auth and limits

Call `dropthis_account` first if you need to size a publish: its `limits` block carries the
active plan-tier limits (`maxSizeBytes`, `defaultTtlSeconds` — `null` means permanent,
`maxStorageBytes` — `null` means uncapped). Three plans: Free ($0 — 7-day TTL, badge,
5 MB/drop) · Personal ($5/mo — permanent while subscribed, no badge, 100 MB/drop, 2 GB
storage) · Pro ($19/mo — adds analytics). Setting a `password` is
currently rejected on EVERY plan (403 `password_protection_unavailable`) until the Pro
unlock flow ships; clearing one with `null` still works. Plan-limit errors return the
server's `suggestion` as an upgrade nudge — read it in the tool result and relay it.

## Errors

Tool results carry the server's `code`, `suggestion`, and `request_id` in-band. On an error,
adjust based on `suggestion` (e.g., switch to a smaller payload, upgrade, or fix the input).

See [references/tools.md](references/tools.md) for the full per-tool contract.
