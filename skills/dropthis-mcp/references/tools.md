# Tool reference

All tools are namespaced `dropthis_`. The publish/update_content/update_settings/get tools return the drop's
`DropResponse` (camelCase, including `url`); `delete` returns `{ deleted, dropId }` and the list
tools return `{ items, nextCursor }`. Errors come back in-band with `code`, `suggestion`, and `request_id`.

## dropthis_publish

Publish NEW content → permanent public URL. Creates a NEW drop every call and never takes a
`drop_id`. To change something you already published, use `dropthis_update_content` (the files
at the URL) or `dropthis_update_settings` (title, visibility, password, expiry, metadata)
with the `drop_…` id from this call's response — do NOT call publish again (that makes a duplicate).

- Inputs: exactly one of `content` (string) · `source_url` (http(s) URL) · `files` (array of `{path, content|content_base64, content_type?}` + optional `entry`) · `file` (local file or directory; a directory publishes as a complete multi-file site; stdio only) · `paths` (array of local file/directory paths published as one bundle; stdio only). Optional: `title`, `password` (Pro), `noindex`, `visibility` (`public` | `unlisted`), `expires_at`, `metadata`, `idempotency_key`.
- Output: the full camelCase `DropResponse` — `url`, `id`, `slug`, `deploymentId`, `expiresAt`, `createdAt`, `contentType`, `sizeBytes`, `badgeApplied`, `persistent`, `tier`, `limitations` (no `password`), plus a `next` object echoing the `drop_id` for the update tools. Keep the `id` (not the `slug`/`url`) — every id-based tool takes it as `drop_id`.

## dropthis_update_content

Replace the content of an EXISTING drop, keeping its URL/slug (ships a new deployment). **Content-only** — it
ships a new content version and never changes settings. To change settings (title, visibility,
password, noindex, expiry, metadata), use `dropthis_update_settings`; to create a
brand-new drop use `dropthis_publish`.

- Inputs: `drop_id` (the full `drop_…` id returned as `id` by publish — NOT the slug/URL token); exactly one of `content`, `source_url`, `files` (+ optional `entry`), `file` (local file or directory; stdio only), or `paths` (array of local file/directory paths; stdio only). Optional: `idempotency_key`, `if_revision`. Does NOT accept `expires_at` or `metadata` (those are settings — use `dropthis_update_settings`).
- Not idempotent: a retry creates another deployment unless you pass the same `idempotency_key`.
- Output: the updated `DropResponse` — `url`, `id`, `revision`, `deploymentId`, `createdAt` (there is NO `updatedAt` field).

## dropthis_update_settings

Update settings only — never content. To replace the content at the URL use
`dropthis_update_content`; to create a new drop use `dropthis_publish`. Idempotent — applying
the same values again is a no-op.

- Inputs: `drop_id` (the full `drop_…` id returned as `id` by publish — NOT the slug/URL token); optional `title`, `visibility`, `password` (Pro; `null` clears), `noindex` (`null` clears), `expires_at`, `metadata`. This is where expiry and metadata are managed (`dropthis_update_content` does not accept them).
- Output: the updated `DropResponse` — `url`, `id`, `slug`, `title`, `visibility`, `revision` (there is NO `updatedAt` field).

## dropthis_get

- Input: `drop_id` (the full `drop_…` id returned as `id` by publish — NOT the slug/URL token).
- Output: the full camelCase `DropResponse` — `id`, `slug`, `url`, `deploymentId`, `title`, `visibility`, `status`, `revision`, `contentType`, `sizeBytes`, `createdAt`, `expiresAt`, `accessible`, `persistent`, `badgeApplied`, `tier`, `limitations`, plus the settings read-back fields `noindex` (bool), `passwordProtected` (bool), and `metadata` (object). **The raw password is never returned** — only `passwordProtected` tells you whether one is set. The summary flags access state, e.g. `[unlisted, password-protected, noindex]`. Read-only.

## dropthis_list

- Inputs: optional `cursor`, `limit` (1–100, default 20). Output: `items` (each `id`, `url`, `title`, `status`, `expiresAt`) + `nextCursor`. Read-only.

## dropthis_delete

Permanently delete a drop and its public URL. Destructive.

- Inputs: `drop_id` (the full `drop_…` id returned as `id` by publish — NOT the slug/URL token), `confirm: true` (required).
- Output: a small result envelope `{ "deleted": true, "dropId": "drop_abc123" }` (camelCase) — NOT a `DropResponse`. The DropResponse-returning tools (`dropthis_publish`, `dropthis_update_content`, `dropthis_update_settings`, `dropthis_get`) pass through the camelCase `DropResponse` fields; the list tools (`dropthis_list`, `dropthis_list_deployments`) return projected `{ items, nextCursor }` envelopes; `dropthis_delete` returns this tool-specific `{ deleted, dropId }` result.
- Confirm with the user before calling.

## dropthis_list_deployments

- Inputs: `drop_id` (the full `drop_…` id returned as `id` by publish — NOT the slug/URL token); optional `cursor`, `limit` (1–100, default 20). Output: the drop's content history (past deployments / versions) as `items` + `nextCursor`. Read-only.

## dropthis_account

- Output: plan, status, plan-tier limits, and account identity. Read-only. Call first to learn Free vs Pro constraints.

<!-- BEGIN GENERATED TOOLS -->

> Auto-generated by `scripts/gen-tools.mjs` from the live `@dropthis/mcp` `tools/list` schemas. Do not edit by hand.

### `dropthis_account`
Inputs: (none)

### `dropthis_delete`
Inputs: `drop_id` (required), `confirm` (required)

### `dropthis_get`
Inputs: `drop_id` (required)

### `dropthis_list`
Inputs: `cursor`, `limit`

### `dropthis_list_deployments`
Inputs: `drop_id` (required), `cursor`, `limit`

### `dropthis_publish`
Inputs: `content`, `content_type`, `path`, `source_url`, `files`, `entry`, `file`, `paths`, `title`, `password`, `noindex`, `visibility`, `expires_at`, `metadata`, `idempotency_key`

### `dropthis_update_content`
Inputs: `drop_id` (required), `content`, `content_type`, `path`, `source_url`, `files`, `entry`, `file`, `paths`, `idempotency_key`, `if_revision`

### `dropthis_update_settings`
Inputs: `drop_id` (required), `title`, `visibility`, `password`, `noindex`, `expires_at`, `metadata`

<!-- END GENERATED TOOLS -->

## Free vs Pro

Free: 3-day TTL, badge, 5 MB/drop. Pro: persistent, no badge, 100 MB/drop, password,
custom domains, noindex control. Free-tier misuse returns the server's `suggestion` as
an upgrade nudge — relay it.
