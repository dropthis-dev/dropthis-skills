# Tool reference

All tools are namespaced `dropthis_`. The publish/update_content/update_settings/get/resolve tools return the drop's
`DropResponse` (camelCase, including `url`); `delete` returns `{ deleted, dropId }` and the list
tools return `{ items, nextCursor }`. Errors come back in-band with `code`, `suggestion`, and `request_id`.

**The id is the only write handle.** `dropthis_update_content`, `dropthis_update_settings`,
`dropthis_get`, `dropthis_get_content`, `dropthis_delete`, and `dropthis_list_deployments` take a
strict `drop_…` `drop_id` — pass a URL or slug and they return a self-explaining error pointing at
`dropthis_resolve` (they never silently resolve). When you only have a public URL or slug, call
`dropthis_resolve` first to get the id, then call the id-based tool. **Persist the `drop_…` id.**
URLs, raw_url, and slugs are locators, not identifiers — a vanity slug is renameable and the pool
host rotates, so a stored URL can drift; the id never moves. Treat `drop_…` as an opaque
case-sensitive string.

## dropthis_publish

Publish NEW content → permanent public URL. Creates a NEW drop every call and never takes a
`drop_id`. To change something you already published, use `dropthis_update_content` (the files
at the URL) or `dropthis_update_settings` (title, visibility, password, expiry, metadata)
with the `drop_…` id from this call's response — do NOT call publish again (that makes a duplicate).

- Inputs: exactly one of `content` (string) · `source_url` (http(s) URL) · `files` (array of `{path, content|content_base64|source_url, content_type?}` + optional `entry`) · `file` (local file or directory; a directory publishes as a complete multi-file site; stdio only) · `paths` (array of local file/directory paths published as one bundle; stdio only). In the `files` array, each file is inline `content`/`content_base64`, or a `source_url` the server fetches — use `source_url` for images/video/pdf/fonts (never base64-inline an image) — and in the HTML/CSS reference each bundled asset by its relative `path` (e.g. `assets/hero.jpg`), with the remote URL in that file's `source_url`, never hot-linked in the markup. Up to 200 files per drop. Optional: `title`, `password` (Pro-only — Free returns 403 `feature_not_in_plan`; see Plans and limits), `noindex`, `visibility` (`public` | `unlisted`), `expires_at`, `metadata`, `idempotency_key`.
- Output: the full camelCase `DropResponse` — `url`, `id`, `slug`, `domain` (custom-domain hostname or `null`), `rawUrl` (see below), `deploymentId`, `expiresAt`, `createdAt`, `contentType`, `sizeBytes`, `badgeApplied`, `persistent`, `tier`, `limitations` (no `password`), plus a `next` object echoing the `drop_id` for the update tools. Keep the `id` (not the `slug`/`url`) — every id-based tool takes it as `drop_id`.
- **`rawUrl` (canonical view vs raw bytes).** The canonical `url` is **always a branded view** with the dropthis badge: an HTML drop renders the page; a single non-HTML file renders a branded **preview** (image inline; markdown/JSON/CSV/text/code as escaped source; opaque binary as a download); a collection renders a branded **index** of natural-path links. For a single non-HTML file drop, `rawUrl` is the natural-path URL serving the raw bytes (e.g. `…/abc123/notes.md`) — hand it to agents that want the exact bytes; `null` for HTML drops and collections (the page IS the artifact, or per-file paths come from the index). The `next` object also carries a hint distinguishing "share the canonical `url` with humans / hand `rawUrl` to agents." There is no `/_raw/` route; append `?download=1` to any natural-path URL to force a download.
- The response may include `warnings` (omitted when empty). A `root_relative_reference` warning names a file that references assets with root-relative URLs (e.g. `/styles.css`) — those break if the drop is ever served under a subpath. Prefer relative refs (`styles.css`, `./styles.css`) in generated HTML/CSS.

## dropthis_update_content

Update the content of an EXISTING drop, keeping its URL/slug (ships a new deployment). **Partial by
default** — the files you pass upsert by path, every file the drop already serves that you don't
mention is carried forward, and `delete_paths` removes named files, so you don't resend unchanged
assets. **Content-only** — it ships a new content version and never changes settings. To change
settings (title, visibility, password, noindex, expiry, metadata), use `dropthis_update_settings`;
to create a brand-new drop use `dropthis_publish`.

- Inputs: `drop_id` (the full `drop_…` id returned as `id` by publish — NOT the slug/URL token); exactly one of `content`, `source_url`, `files` (array of `{path, content|content_base64|source_url, content_type?}` + optional `entry`), `file` (local file or directory; stdio only), or `paths` (array of local file/directory paths; stdio only). In the `files` array, each file is inline `content`/`content_base64`, or a `source_url` the server fetches — use `source_url` for images/video/pdf/fonts (never base64-inline an image) — and in the HTML/CSS reference each bundled asset by its relative `path` (e.g. `assets/hero.jpg`), with the remote URL in that file's `source_url`, never hot-linked in the markup. Optional: `mode` (`"patch"` default | `"replace"`), `delete_paths` (array of paths to remove; patch only), `idempotency_key`, `if_revision`. Does NOT accept `expires_at` or `metadata` (those are settings — use `dropthis_update_settings`).
- **`mode` and `delete_paths`.** `mode: "patch"` (the default) merges your files into the current content set and removes any path listed in `delete_paths`; everything you don't touch stays. `mode: "replace"` makes the files you send the drop's entire content set (anything you omit is gone) — and `delete_paths` is invalid with `replace` (the server rejects the combination). The server enforces all validation; this tool just passes the fields through. (`mode`/`delete_paths` are in the live tool source; the auto-generated schema block below may not list them until the next `@dropthis/mcp` release — the prose here is authoritative.)
- Not idempotent: a retry creates another deployment unless you pass the same `idempotency_key`.
- Concurrency loop: `dropthis_get` returns the drop's current `revision` — pass it as `if_revision`. If someone else updated the drop in between, the call fails with a `revision_conflict` (409) error that carries `current_revision` in-band: re-read the drop, merge, and retry with `if_revision` set to that `current_revision`.
- Output: the updated `DropResponse` — `url`, `id`, `revision`, `deploymentId`, `createdAt` (there is NO `updatedAt` field).

## dropthis_update_settings

Update settings only — never content. To replace the content at the URL use
`dropthis_update_content`; to create a new drop use `dropthis_publish`. Idempotent — applying
the same values again is a no-op.

- Inputs: `drop_id` (the full `drop_…` id returned as `id` by publish — NOT the slug/URL token); optional `title`, `visibility`, `password` (Pro-only — setting one on Free returns 403 `feature_not_in_plan` with `upgrade_url`; `null` clears an existing password and is always allowed), `noindex` (`null` clears), `expires_at`, `metadata`. This is where expiry and metadata are managed (`dropthis_update_content` does not accept them).
- Output: the updated `DropResponse` — `url`, `id`, `slug`, `title`, `visibility`, `revision` (there is NO `updatedAt` field).

## dropthis_get

- Input: `drop_id` (the full `drop_…` id returned as `id` by publish — NOT the slug/URL token).
- Output: the full camelCase `DropResponse` — `id`, `slug`, `url`, `domain` (custom-domain hostname or `null`), `rawUrl` (natural-path raw bytes for a single non-HTML file drop, `null` for HTML drops and collections), `deploymentId`, `title`, `visibility`, `status`, `revision`, `contentType`, `sizeBytes`, `createdAt`, `expiresAt`, `accessible`, `persistent`, `badgeApplied`, `tier`, `limitations`, plus the settings read-back fields `noindex` (bool), `passwordProtected` (bool), and `metadata` (object). **The raw password is never returned** — only `passwordProtected` tells you whether one is set. The summary flags access state, e.g. `[unlisted, password-protected, noindex]`. Read-only.
- Pass the returned `revision` as `if_revision` on the next `dropthis_update_content` to avoid clobbering concurrent edits.

## dropthis_list

- Inputs: optional `cursor`, `limit` (1–100, default 20), `domain` (only drops mounted on that custom hostname). Output: `items` (each `id`, `slug`, `url`, `title`, `status`, `expiresAt`) + `nextCursor`. Read-only.
- URL→id recovery: prefer `dropthis_resolve` — it turns any public URL or slug straight into the drop (with its `id`), owner-scoped. `dropthis_list` is the browse alternative when you want to scan or filter (`domain`).

## dropthis_delete

Permanently delete a drop and its public URL. Destructive.

- Inputs: `drop_id` (the full `drop_…` id returned as `id` by publish — NOT the slug/URL token), `confirm: true` (required).
- Output: a small result envelope `{ "deleted": true, "dropId": "drop_abc123" }` (camelCase) — NOT a `DropResponse`. The DropResponse-returning tools (`dropthis_publish`, `dropthis_update_content`, `dropthis_update_settings`, `dropthis_get`) pass through the camelCase `DropResponse` fields; the list tools (`dropthis_list`, `dropthis_list_deployments`) return projected `{ items, nextCursor }` envelopes; `dropthis_delete` returns this tool-specific `{ deleted, dropId }` result.
- Confirm with the user before calling.

## dropthis_list_deployments

- Inputs: `drop_id` (the full `drop_…` id returned as `id` by publish — NOT the slug/URL token); optional `cursor`, `limit` (1–100, default 20). Output: the drop's content history (past deployments / versions) as `items` + `nextCursor`. Read-only.

## dropthis_resolve

Turn a drop's public URL or slug — what a user typically pastes — into the drop itself, including
its `drop_…` id. This is the on-ramp for the strict id-only edit/read tools: resolve here, then
call `dropthis_update_content` / `dropthis_update_settings` / `dropthis_get` / `dropthis_delete`
with the returned `id`.

- Input: `target` — a drop's public URL (e.g. `https://abc123.listb.link/` or a custom-domain URL), its slug, or a `drop_…` id (which passes straight through).
- Output: the full camelCase `DropResponse` on a hit (with `id`, `url`, `slug`, …), exactly like `dropthis_get`. On no match the result is an error explaining that no drop of yours matches (use `dropthis_list` to browse).
- **Server-side and owner-scoped.** Resolution runs on the server (`POST /v1/drops/resolve`) — there is no client-side slug parsing or host allowlist, so it handles every URL face: shared-pool URLs, legacy `dropthis.app` URLs, and custom-domain URLs (path-mode `/{slug}/`, dedicated-mode root, and deep links — all resolve to the drop at the mount). It only matches drops on THIS account; an unknown or foreign URL returns no match (no existence leak).
- Read-only. Resolve once and persist the `drop_…` id — URLs and slugs are locators that can drift; the id never moves.

## dropthis_account

- Output: the account profile — `id`, `email`, `displayName`, `plan` (`free` | `pro`), `status`, `createdAt`, a `limits` block with the active plan-tier limits, a `usage` block (`storagUsedBytes`, `customDomainsUsed`), a `workspace` block (`id`, `name`, `slug`, `kind`, `role` — the workspace this key is bound to), and `upgrade_url` (`null` on Pro). The account acts within a workspace; the `workspace` block identifies it. Read-only.
- `limits` shape (camelCase): `{ name, maxSizeBytes, defaultTtlSeconds, maxStorageBytes, maxCustomHostnames }` — `maxSizeBytes` is the per-drop size cap; `defaultTtlSeconds` is the drop lifetime before expiry (`null` = drops are permanent); `maxStorageBytes` is the account-wide storage cap; `maxCustomHostnames` is the custom hostname cap (0 on Free, 1 on Pro). Free example: `{ "name": "free", "maxSizeBytes": 5242880, "defaultTtlSeconds": 2592000, "maxStorageBytes": 524288000, "maxCustomHostnames": 0 }`.
- Call first to size a publish before uploading.

<!-- BEGIN GENERATED TOOLS -->

> Auto-generated by `scripts/gen-tools.mjs` from the live `@dropthis/mcp` `tools/list` schemas. Do not edit by hand.

### `dropthis_accept_invitation`
Inputs: `invitation_id`, `token`

### `dropthis_account`
Inputs: (none)

### `dropthis_create_workspace`
Inputs: `name` (required), `slug`

### `dropthis_delete`
Inputs: `drop_id` (required), `confirm` (required)

### `dropthis_delete_workspace`
Inputs: `workspace` (required), `confirm` (required)

### `dropthis_domains_connect`
Inputs: `hostname` (required), `mode` (required)

### `dropthis_domains_delete`
Inputs: `domain` (required), `confirm` (required)

### `dropthis_domains_get`
Inputs: `domain` (required)

### `dropthis_domains_list`
Inputs: (none)

### `dropthis_domains_update`
Inputs: `domain` (required), `drop_id`, `default`

### `dropthis_domains_verify`
Inputs: `domain` (required)

### `dropthis_get`
Inputs: `drop_id` (required)

### `dropthis_get_content`
Inputs: `drop_id` (required), `deployment_id`, `path`

### `dropthis_invitations`
Inputs: (none)

### `dropthis_invite_member`
Inputs: `workspace` (required), `email` (required), `role`

### `dropthis_list`
Inputs: `cursor`, `limit`, `domain`

### `dropthis_list_deployments`
Inputs: `drop_id` (required), `cursor`, `limit`

### `dropthis_members`
Inputs: `workspace` (required)

### `dropthis_publish`
Inputs: `content`, `content_type`, `path`, `source_url`, `files`, `entry`, `file`, `paths`, `title`, `noindex`, `visibility`, `expires_at`, `metadata`, `password`, `domain`, `slug`, `idempotency_key`, `workspace`

### `dropthis_remove_member`
Inputs: `workspace` (required), `account_id` (required), `confirm` (required)

### `dropthis_rename_workspace`
Inputs: `workspace` (required), `name`, `slug`

### `dropthis_resolve`
Inputs: `target` (required)

### `dropthis_update_content`
Inputs: `drop_id` (required), `content`, `content_type`, `path`, `source_url`, `files`, `mode`, `delete_paths`, `entry`, `file`, `paths`, `idempotency_key`, `if_revision`

### `dropthis_update_member_role`
Inputs: `workspace` (required), `account_id` (required), `role` (required), `confirm`

### `dropthis_update_settings`
Inputs: `drop_id` (required), `title`, `visibility`, `password`, `noindex`, `expires_at`, `metadata`, `domain`, `slug`

### `dropthis_use_workspace`
Inputs: `workspace` (required)

### `dropthis_workspaces`
Inputs: (none)

<!-- END GENERATED TOOLS -->

## Content read-back and rollback (REST)

The REST API can return a drop's stored content — owner-authenticated (your `sk_` key),
independent of any viewer password:

- `GET /v1/drops/{drop_id}/content` — JSON manifest of the CURRENT deployment's files
  (paths, sizes, content types, entry); add `?path=<files[].path>` to download one file's
  exact stored bytes with its stored content type.
- `GET /v1/drops/{drop_id}/deployments/{deployment_id}/content` — same for any historical
  deployment, including SUPERSEDED ones.

There is no rollback verb: downloading an old deployment's files and republishing them with
`dropthis_update_content` IS the rollback path.

## Plans and limits

Four tiers — read the live matrix from `dropthis_account` → `entitlements` (`capabilities` + `required_plan` + `limits`):

- **Free:** 30-day TTL, dropthis badge, 5 MB/drop, 500 MB storage, no custom domains, no password.
- **Keep ($5/mo):** permanent + custom expiry, badge stays, 2 GB storage, basic link preview, view count.
- **Pro ($29/mo):** no badge, custom domain, password, 100 MB/drop, 10 GB storage, full analytics, version history, custom OG image.
- **Business (later):** team seats, multiple domains, retention controls, lead capture.

A capability the plan lacks returns 403 `feature_not_in_plan` (with `feature`, `current_plan`, `required_plan`, `upgrade_url`, `retryable:false`); numeric ceilings return `quota_exceeded`. e.g. setting a `password` below Pro → `feature_not_in_plan`; clearing an existing password (`password: null`) is always allowed. Billing is parked — plans are granted manually for now.

Plan-limit errors return the server's `suggestion` as an upgrade nudge — relay it.
