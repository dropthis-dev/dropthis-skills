# Tool reference

All tools are namespaced `dropthis_`. Mutating tools return `url` first. Errors come back
in-band with `code`, `suggestion`, and `request_id`.

## dropthis_publish

Publish NEW content → permanent public URL.

- Inputs: exactly one of `content` (string) · `source_url` (http(s) URL) · `file` (local path, stdio only). Optional: `title`, `password` (Pro), `noindex`, `visibility` (`public` | `unlisted`).
- Output: `url`, `drop_id`, `expires_at`, `tier`, `badge`.

## dropthis_redeploy

Publish a new content version to an existing drop, keeping its URL/slug.

- Inputs: `drop_id`; one of `content` or `file`. (`source_url` is not supported for redeploy.)
- Output: `url`, `drop_id`, `updated_at`.

## dropthis_update

Update settings only — never content.

- Inputs: `drop_id`; optional `title`, `visibility`, `password` (Pro; `null` clears), `noindex` (`null` clears), `vanity_slug` (Pro).
- Output: `url`, `drop_id`, `updated_at`.

## dropthis_get

- Input: `drop_id`. Output: url, slug, expiry, settings. Read-only.

## dropthis_list

- Inputs: optional `cursor`, `limit` (1–100, default 20). Output: `items` (id, url, title, status, expiresAt) + `next_cursor`. Read-only.

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
