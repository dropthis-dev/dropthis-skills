---
name: dropthis-mcp
description: >
  Use when the user wants to publish, share, post, put online, make public, host, or get a
  shareable link for content — HTML, a report, dashboard, slide deck, site, or file — through
  the dropthis MCP server, even if they don't say "drop". Also use to update, edit, rename,
  password-protect, list, or delete published drops. Tools: `dropthis_publish`,
  `dropthis_update_content`, `dropthis_update_settings`, `dropthis_get`, `dropthis_resolve`,
  `dropthis_list`, `dropthis_list_deployments`, `dropthis_delete`, `dropthis_account` — in
  Claude Code, Claude Desktop, Cursor, Windsurf, ChatGPT, or n8n. Also use to create a
  team/workspace, invite a teammate, change a member's role, or accept an invite via
  `dropthis_create_workspace`, `dropthis_workspaces`, `dropthis_members`, `dropthis_invite_member`,
  and `dropthis_invitations` (team ops need a team-scoped connection). Also use when configuring the
  dropthis MCP server (local stdio or the hosted remote connector).
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
      documentation: https://github.com/dropthis-dev/dropthis-mcp#readme
      remoteEndpoint: https://mcp.dropthis.app/mcp
inputs:
  - name: DROPTHIS_API_KEY
    description: "dropthis API key. Used by the local stdio server (env) and the static-key remote path (Bearer)."
    required: true
references:
  - references/tools.md
  - ../../references/domains.md
  - ../../references/workspaces.md
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
- `files` — a multi-file bundle of `{path, content|content_base64|source_url, content_type?}` (plus optional `entry`). Each file is inline `content`/`content_base64`, or a `source_url` the server fetches — use `source_url` for images/video/pdf/fonts (never base64-inline an image) — and in the HTML/CSS reference each bundled asset by its relative `path` (e.g. `assets/hero.jpg`), with the remote URL in that file's `source_url`, never hot-linked in the markup. Up to 200 files per drop.
- `file` — a local file path **or directory** (a directory publishes as a complete multi-file site). **Local/stdio only**; not available on the remote connector.
- `paths` — a list of local file/directory paths published together as one bundle. **Local/stdio only**; not available on the remote connector.

## What a drop URL serves (canonical view vs raw bytes)

Every drop's canonical `url` is **always a branded view** carrying the dropthis badge — there is
no user-agent sniffing and no `/_raw/` route:

- **HTML** → the page renders as-is (badge injected).
- **Single non-HTML file** (one `.md`, `.json`, `.csv`, `.png`, …) → a **branded preview** page
  at the canonical URL (image inline; markdown/JSON/CSV/text/code as escaped **source**, not
  re-rendered; opaque binary as a download affordance). The file's **raw bytes** live at the
  **natural path** under the drop and come back as `rawUrl` in the result.
- **Collection** (multiple files, no HTML entry) → a **branded index** at the canonical URL
  linking each file's natural path; a `README.md`/`index.md` is shown atop the index.

Hand the **canonical `url` to humans** (badge) and **`rawUrl` to agents** (exact bytes). The
publish result includes a `next` hint spelling this out. For collections, `rawUrl` is `null` —
the per-file natural paths come from the branded index (or fetch bytes with
`dropthis_get_content`). Append `?download=1` to any natural-path URL to force a download.

dropthis publishes **agent-readable artifacts**, not files-for-transfer. The dividing line is
**publish vs transfer**, gated only by the **per-drop size cap** (5 MB Free / 100 MB Pro) — there
is no content/extension policy and no type allow/deny list. A `handoff.md` or several JSON files
publish fine; a multi-GB rip is blocked by price, not type.

## The publish-vs-update contract (read this)

`dropthis_publish` creates a **NEW** drop on every call and **never takes a `drop_id`**.
Updating an existing drop needs its full `drop_…` id (from the publish response). To change
something you already published, do **not** call `dropthis_publish` again — that makes a
duplicate. Instead:

- `dropthis_update_content` — update the files at the URL (ships a new deployment, same URL).
  Content-only: it takes the same content inputs (`content`, `source_url`, `files`, `file`, or
  `paths`) and never changes settings. Not idempotent — a retry creates another deployment
  unless you pass the same `idempotency_key`. **It is a PARTIAL update by default
  (`mode: "patch"`):** the files you pass upsert by path, every file the drop already serves
  that you don't mention is carried forward, and `delete_paths` removes named files — so you do
  NOT resend unchanged assets (editing only `index.html` leaves a previously-bundled image in
  place). Pass `mode: "replace"` when you want the files you send to be the drop's entire content
  set (anything you omit is gone); `delete_paths` is invalid with `replace`. The server enforces
  the merge and all validation — the tool just passes `mode`/`delete_paths` through.
- `dropthis_update_settings` — change title, visibility, password, noindex,
  expiry, or metadata, without touching content. Idempotent.

**Retain the `id` from the publish response for all follow-up operations.** Every id-based
tool — `dropthis_update_content`, `dropthis_update_settings`, `dropthis_get`, `dropthis_get_content`,
`dropthis_delete`, `dropthis_list_deployments` — takes the full `drop_…` id as `drop_id` and is
**strict id-only**. Pass a URL or slug and the tool returns a self-explaining error pointing you
at `dropthis_resolve` — it does NOT silently look it up. `dropthis_publish` returns both `id` and
`slug` (and `url`); keep the `id`.

> **Persist the `drop_…` id.** URLs, raw_url, and slugs are locators, not identifiers — a vanity
> slug is renameable and the pool host rotates, so a stored URL can drift; the id never moves.
> Treat `drop_…` as an opaque case-sensitive string.

```json
// dropthis_publish returns:
{ "id": "drop_6hRcUUok5PYeEK6jJQY5Is", "slug": "0izsioo", "url": "https://0izsioo.listb.link/" }
```

```text
# update_content uses the id, NOT the slug:
dropthis_update_content { "drop_id": "drop_6hRcUUok5PYeEK6jJQY5Is", "content": "<h1>v2</h1>" }
# WRONG: dropthis_update_content { "drop_id": "0izsioo", ... }  → error: that is a URL/slug,
#   not a drop_id. Call dropthis_resolve with it to get the drop_id, then retry.
```

**Recovering an id from a URL/slug → `dropthis_resolve`.** When you only have what the user
pasted — a public URL or a slug — call `dropthis_resolve { "target": "https://0izsioo.listb.link/" }`.
It resolves the locator back to the drop (including its `id`) **server-side and owner-scoped**:
it matches only drops on this account and returns no match for an unknown or foreign URL. It
handles every URL face — shared-pool, legacy `dropthis.app`, and custom-domain URLs (path-mode
`/{slug}/`, dedicated-mode root, and deep links). A `drop_…` id passes straight through. Resolve
once, then call the id-based tools with the returned `id`. (Do NOT parse the slug out of the URL
yourself.) `dropthis_list` is an alternative — pass `domain` to scope to a custom hostname:
`dropthis_list { "domain": "reports.example.com" }`.

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

## Workspaces

dropthis has two credential modes:

- **Delegated key** (`KeyType "delegated"`) — minted by `dropthis login`. Account-scoped. Has a
  **server-side switchable active workspace** that persists across reconnects; an allowlist of
  permitted workspaces can be set at creation. This is the default.
- **Service key** (`KeyType "service"`) — pinned to one workspace at creation, for CI. Cannot
  switch workspace; sending a switch request returns 400 `workspace_pinned`.

**Workspace tools (both available over the hosted remote connector and local stdio):**

- `dropthis_workspaces` — list all workspaces the connection can act in; the currently active one
  is flagged `isActive`. Use this first to pick a workspace slug.
- `dropthis_use_workspace { "workspace": "<slug-or-id>" }` — switch the active workspace for
  this connection. The choice persists server-side on the credential, so subsequent publishes
  (even after a reconnect) land in the new workspace. Delegated keys only; service keys → 400.

```
dropthis_workspaces
# → lists workspaces with isActive flag

dropthis_use_workspace { "workspace": "byrokko" }
# → "Switched to workspace: Byrokko (byrokko, team)"

dropthis_publish { "content": "<html>…</html>" }
# → lands in byrokko (team's shared custom domain, if configured)
```

**Picking a workspace:** if the connection can reach only one workspace (the common case, including a
fresh login), a plain `dropthis_publish` lands in that workspace with no prompt — your personal
workspace for a solo account, or the sole allowed one if the connection is restricted to one. If you
belong to more than one workspace and haven't chosen yet, the first publish returns
409 `workspace_choice_required` whose body carries `choices[]` — call `dropthis_use_workspace` once
to pick; the choice persists server-side across reconnects, so later publishes don't ask again.
Passing `workspace` on `dropthis_publish` skips the prompt for that call.

**Reading the current workspace:** `dropthis_account` always shows the active workspace as a
`workspace` block (`id`, `name`, `slug`, `kind`, `role`). Every drop response also echoes its
owning workspace `{id, name, slug, kind}`.

**Team publishing:** once you switch to a team workspace, publishes land under the team's shared
custom domain automatically — no extra flag. The workspace default domain is set by the team
admin in the console.

**Team CRUD works from MCP too** (ADR 0068) — gated by the credential's scopes, not the surface.
A `team`-scoped connection covers `dropthis_create_workspace` / `dropthis_rename_workspace`,
`dropthis_members` / `dropthis_invite_member`, and `dropthis_invitations` / `dropthis_accept_invitation`
(the teammate's join path). The admin/destructive tools — `dropthis_delete_workspace`,
`dropthis_remove_member`, and `dropthis_update_member_role` (any role change) — need a `team-admin`
scope (workspaces:admin / members:admin). A default publish-only connection can do none (403
`insufficient_scope`); mutating tools also need a write-enabled connection, and ownership transfer /
deletes confirm-gate (`confirm: true`). See references/../workspaces.md.

See [../../references/workspaces.md](../../references/workspaces.md) for the full runbook.

## Auth and limits

Call `dropthis_account` first if you need to pre-check a gate or size a publish: its
`entitlements` block carries the full capability matrix (`capabilities` + per-feature
`required_plan`) and numeric `limits` (`maxSizeBytes`, `defaultTtlSeconds` — `null` means
permanent, `maxStorageBytes`, `seatLimit`). Four plans: **Free** (30-day TTL, badge,
5 MB/drop, 500 MB) · **Keep $5/mo** (permanent + custom expiry, badge stays, 2 GB, basic
link preview, view count) · **Pro $29/mo** (no badge, custom domain, password, 100 MB/drop,
10 GB, full analytics, version history, custom OG image) · **Business** (later: seats,
multiple domains, retention, lead capture). A capability the plan lacks returns 403
`feature_not_in_plan` (`feature`/`current_plan`/`required_plan`/`upgrade_url`/`retryable:false`);
numeric ceilings return `quota_exceeded`. Setting a `password` below Pro → `feature_not_in_plan`;
clearing one with `null` is always allowed. Billing is parked — plans are granted manually.
Relay the server's `suggestion` (and `required_plan`) as the upgrade nudge — never blindly retry a plan gate.

## Errors

Tool results carry the server's `code`, `suggestion`, and `request_id` in-band. On an error,
adjust based on `suggestion` (e.g., switch to a smaller payload, upgrade, or fix the input).

See [references/tools.md](references/tools.md) for the full per-tool contract.
