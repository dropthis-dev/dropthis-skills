# Tool reference

All tools are namespaced `dropthis_`. Mutating tools return `url` first. Errors come back
in-band with `code`, `suggestion`, and `request_id`.

## dropthis_publish

Publish NEW content → permanent public URL.

- Inputs: exactly one of `content` (string) · `source_url` (http(s) URL) · `files` (array of `{path, content|content_base64, content_type?}` + optional `entry`) · `file` (local path, stdio only). Optional: `title`, `password` (Pro), `noindex`, `visibility` (`public` | `unlisted`), `expires_at`, `metadata`, `idempotency_key`.
- Output: the full camelCase `DropResponse` — `url`, `id`, `slug`, `deploymentId`, `expiresAt`, `createdAt`, `contentType`, `sizeBytes`, `badgeApplied`, `persistent`, `tier`, `limitations` (no `password`).

## dropthis_redeploy

Publish a new content version to an existing drop, keeping its URL/slug.

- Inputs: `drop_id`; exactly one of `content`, `source_url`, `files` (+ optional `entry`), or `file` (stdio only). Optional: `expires_at`, `metadata`, `idempotency_key`, `if_revision`.
- Output: the updated `DropResponse` — `url`, `id`, `revision`, `deploymentId`, `createdAt` (there is NO `updatedAt` field).

## dropthis_update

Update settings only — never content.

- Inputs: `drop_id`; optional `title`, `visibility`, `password` (Pro; `null` clears), `noindex` (`null` clears), `vanity_slug` (Pro).
- Output: the updated `DropResponse` — `url`, `id`, `slug`, `title`, `visibility`, `revision` (there is NO `updatedAt` field).

## dropthis_get

- Input: `drop_id`.
- Output: the full camelCase `DropResponse` — `id`, `slug`, `url`, `deploymentId`, `title`, `visibility`, `status`, `revision`, `contentType`, `sizeBytes`, `createdAt`, `expiresAt`, `accessible`, `persistent`, `badgeApplied`, `tier`, `limitations`. **The password is never returned** (write-only — `DropResponse` has no password field). Read-only.

## dropthis_list

- Inputs: optional `cursor`, `limit` (1–100, default 20). Output: `items` (each `id`, `url`, `title`, `status`, `expiresAt`) + `nextCursor`. Read-only.

## dropthis_delete

Permanently delete a drop and its public URL. Destructive.

- Inputs: `drop_id`, `confirm: true` (required). Output: `deleted`, `drop_id`.
- Confirm with the user before calling.

## dropthis_whoami

- Output: plan, status, plan-tier limits. Read-only. Call first to learn Free vs Pro constraints.

## Free vs Pro

Free: 3-day TTL, badge, 5 MB/drop. Pro: persistent, no badge, 100 MB/drop, password, vanity
slugs, custom domains, noindex control. Free-tier misuse returns the server's `suggestion` as
an upgrade nudge — relay it.
