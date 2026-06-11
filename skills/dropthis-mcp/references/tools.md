# Tool reference

All tools are namespaced `dropthis_`. The publish/update_content/update_settings/get tools return the drop's
`DropResponse` (camelCase, including `url`); `delete` returns `{ deleted, dropId }` and the list
tools return `{ items, nextCursor }`. Errors come back in-band with `code`, `suggestion`, and `request_id`.

## dropthis_publish

Publish NEW content → permanent public URL. Creates a NEW drop every call and never takes a
`drop_id`. To change something you already published, use `dropthis_update_content` (the files
at the URL) or `dropthis_update_settings` (title, visibility, password, expiry, metadata)
with the `drop_…` id from this call's response — do NOT call publish again (that makes a duplicate).

- Inputs: exactly one of `content` (string) · `source_url` (http(s) URL) · `files` (array of `{path, content|content_base64, content_type?}` + optional `entry`) · `file` (local file or directory; a directory publishes as a complete multi-file site; stdio only) · `paths` (array of local file/directory paths published as one bundle; stdio only). Optional: `title`, `password` (currently rejected on every plan — see Plans and limits), `noindex`, `visibility` (`public` | `unlisted`), `expires_at`, `metadata`, `idempotency_key`.
- Output: the full camelCase `DropResponse` — `url`, `id`, `slug`, `deploymentId`, `expiresAt`, `createdAt`, `contentType`, `sizeBytes`, `badgeApplied`, `persistent`, `tier`, `limitations` (no `password`), plus a `next` object echoing the `drop_id` for the update tools. Keep the `id` (not the `slug`/`url`) — every id-based tool takes it as `drop_id`.
- The response may include `warnings` (omitted when empty). A `root_relative_reference` warning names a file that references assets with root-relative URLs (e.g. `/styles.css`) — those break if the drop is ever served under a subpath. Prefer relative refs (`styles.css`, `./styles.css`) in generated HTML/CSS.

## dropthis_update_content

Replace the content of an EXISTING drop, keeping its URL/slug (ships a new deployment). **Content-only** — it
ships a new content version and never changes settings. To change settings (title, visibility,
password, noindex, expiry, metadata), use `dropthis_update_settings`; to create a
brand-new drop use `dropthis_publish`.

- Inputs: `drop_id` (the full `drop_…` id returned as `id` by publish — NOT the slug/URL token); exactly one of `content`, `source_url`, `files` (+ optional `entry`), `file` (local file or directory; stdio only), or `paths` (array of local file/directory paths; stdio only). Optional: `idempotency_key`, `if_revision`. Does NOT accept `expires_at` or `metadata` (those are settings — use `dropthis_update_settings`).
- Not idempotent: a retry creates another deployment unless you pass the same `idempotency_key`.
- Concurrency loop: `dropthis_get` returns the drop's current `revision` — pass it as `if_revision`. If someone else updated the drop in between, the call fails with a `revision_conflict` (409) error that carries `current_revision` in-band: re-read the drop, merge, and retry with `if_revision` set to that `current_revision`.
- Output: the updated `DropResponse` — `url`, `id`, `revision`, `deploymentId`, `createdAt` (there is NO `updatedAt` field).

## dropthis_update_settings

Update settings only — never content. To replace the content at the URL use
`dropthis_update_content`; to create a new drop use `dropthis_publish`. Idempotent — applying
the same values again is a no-op.

- Inputs: `drop_id` (the full `drop_…` id returned as `id` by publish — NOT the slug/URL token); optional `title`, `visibility`, `password` (SETTING one is currently rejected on every plan with 403 `password_protection_unavailable`; `null` clears an existing password and is always allowed), `noindex` (`null` clears), `expires_at`, `metadata`. This is where expiry and metadata are managed (`dropthis_update_content` does not accept them).
- Output: the updated `DropResponse` — `url`, `id`, `slug`, `title`, `visibility`, `revision` (there is NO `updatedAt` field).

## dropthis_get

- Input: `drop_id` (the full `drop_…` id returned as `id` by publish — NOT the slug/URL token).
- Output: the full camelCase `DropResponse` — `id`, `slug`, `url`, `deploymentId`, `title`, `visibility`, `status`, `revision`, `contentType`, `sizeBytes`, `createdAt`, `expiresAt`, `accessible`, `persistent`, `badgeApplied`, `tier`, `limitations`, plus the settings read-back fields `noindex` (bool), `passwordProtected` (bool), and `metadata` (object). **The raw password is never returned** — only `passwordProtected` tells you whether one is set. The summary flags access state, e.g. `[unlisted, password-protected, noindex]`. Read-only.
- Pass the returned `revision` as `if_revision` on the next `dropthis_update_content` to avoid clobbering concurrent edits.

## dropthis_list

- Inputs: optional `cursor`, `limit` (1–100, default 20). Output: `items` (each `id`, `slug`, `url`, `title`, `status`, `expiresAt`) + `nextCursor`. Read-only.
- URL→id resolution: each item carries its `slug` (the URL token). If you only have a drop's URL, match its slug against `items[].slug` and use that item's `id` for every id-based tool. (The REST API can also resolve directly: `GET /v1/drops?slug=<slug>` is owner-scoped and returns 0 or 1 drops.)

## dropthis_delete

Permanently delete a drop and its public URL. Destructive.

- Inputs: `drop_id` (the full `drop_…` id returned as `id` by publish — NOT the slug/URL token), `confirm: true` (required).
- Output: a small result envelope `{ "deleted": true, "dropId": "drop_abc123" }` (camelCase) — NOT a `DropResponse`. The DropResponse-returning tools (`dropthis_publish`, `dropthis_update_content`, `dropthis_update_settings`, `dropthis_get`) pass through the camelCase `DropResponse` fields; the list tools (`dropthis_list`, `dropthis_list_deployments`) return projected `{ items, nextCursor }` envelopes; `dropthis_delete` returns this tool-specific `{ deleted, dropId }` result.
- Confirm with the user before calling.

## dropthis_list_deployments

- Inputs: `drop_id` (the full `drop_…` id returned as `id` by publish — NOT the slug/URL token); optional `cursor`, `limit` (1–100, default 20). Output: the drop's content history (past deployments / versions) as `items` + `nextCursor`. Read-only.

## dropthis_account

- Output: the account profile — `id`, `email`, `displayName`, `plan` (`free` | `personal` | `pro`), `status`, `createdAt`, and a `limits` block with the active plan-tier limits. Read-only.
- `limits` shape (camelCase): `{ name, maxSizeBytes, defaultTtlSeconds, maxStorageBytes }` — `maxSizeBytes` is the per-drop size cap; `defaultTtlSeconds` is the drop lifetime before expiry (`null` = drops are permanent); `maxStorageBytes` is the account-wide storage cap (`null` = no cap). Free example: `{ "name": "free", "maxSizeBytes": 5242880, "defaultTtlSeconds": 604800, "maxStorageBytes": null }`.
- Call first to size a publish before uploading.

<!-- BEGIN GENERATED TOOLS -->

> Auto-generated by `scripts/gen-tools.mjs` from the live `@dropthis/mcp` `tools/list` schemas. Do not edit by hand.

### `dropthis_account`
Inputs: (none)

### `dropthis_delete`
Inputs: `drop_id` (required), `confirm` (required)

### `dropthis_get`
Inputs: `drop_id` (required)

### `dropthis_get_content`
Inputs: `drop_id` (required), `deployment_id`, `path`

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

Three tiers — read the live numbers from `dropthis_account` → `limits`:

- **Free ($0):** 7-day TTL, dropthis badge, 5 MB/drop.
- **Personal ($5/mo):** drops stay live while subscribed (no TTL), no badge, 100 MB/drop, 2 GB account storage.
- **Pro ($19/mo):** everything in Personal plus analytics. Custom domains are ungated (available on all plans). Password
  protection belongs to Pro but is NOT purchasable yet — the server rejects setting a
  password on EVERY plan (403 `password_protection_unavailable`) until the viewer unlock
  flow ships. Clearing an existing password (`password: null`) is always allowed.

Plan-limit errors return the server's `suggestion` as an upgrade nudge — relay it.
