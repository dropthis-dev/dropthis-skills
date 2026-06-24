# drops

Top-level commands for listing, inspecting, updating, and deleting drops. These verbs are flat — there is no `drops` parent command.

## Commands

### list

List your drops with pagination.

#### Usage

```bash
dropthis list [flags]
```

#### Flags

| Flag | Required | Description |
|------|----------|-------------|
| `--limit` `<n>` | No | Page size (integer) |
| `--cursor` `<cursor>` | No | Pagination cursor from previous response |
| `--json` | No | Force JSON output |

#### Output

```json
{"ok":true,"drops":[{"id":"drop_abc123","url":"https://dropthis.app/abc123"}]}
```

#### Examples

```bash
# List drops
dropthis list

# List with page size
dropthis list --limit 10

# Paginate
dropthis list --cursor "eyJsYXN0X2lkIjoiZHJvcF8xMjMifQ"
```

#### Resolving a URL/slug back to a drop id

If you only have a drop's public URL or slug, run `dropthis resolve <target>` (below) to get its
`drop_…` id — do not parse the slug out of the URL yourself. `get`, `delete`, and `pull` also
accept a URL or slug directly (they resolve internally). `list` is the browse alternative when you
want to scan or filter (`--domain`).

---

### resolve

Resolve a public drop URL or slug back to its `drop_…` id (a `drop_…` id passes straight
through). Writes are id-only, so this is the recovery path: resolve once, then
`update-content`/`update-settings`/`delete` by the returned id.

Resolution runs **server-side and owner-scoped** — there is no client-side slug parsing or host
allowlist, so it handles every URL face: shared-pool URLs, legacy `dropthis.app` URLs, and
custom-domain URLs (path-mode `/{slug}/`, dedicated-mode root, and deep links). It only matches
drops on your account; an unknown or foreign URL returns a `not_found` error.

> **Persist the `drop_…` id.** URLs, raw_url, and slugs are locators, not identifiers — a vanity
> slug is renameable and the pool host rotates, so a stored URL can drift; the id never moves.
> Treat `drop_…` as an opaque case-sensitive string.

#### Usage

```bash
dropthis resolve <id|url|slug> [flags]
```

#### Flags

| Flag | Required | Description |
|------|----------|-------------|
| `--json` | No | Force JSON output |

#### Output

```json
{"ok":true,"drop":{"id":"drop_abc123","url":"https://abc123.listb.link/","slug":"abc123","title":"My Page"}}
```

#### Examples

```bash
# Recover the id from a pasted URL
dropthis resolve https://abc123.listb.link/

# Pipe the id straight into another command
ID=$(dropthis resolve abc123 --json | jq -r .drop.id)
dropthis update-content "$ID" ./dist-v2 --url
```

---

### get

Get details for a single drop.

#### Usage

```bash
dropthis get <id|url|slug> [flags]
```

#### Flags

| Flag | Required | Description |
|------|----------|-------------|
| `--json` | No | Force JSON output |

#### Output

```json
{"ok":true,"drop":{"id":"drop_abc123","url":"https://dropthis.app/abc123","domain":null,"title":"My Page","visibility":"public","revision":1,"accessible":true,"persistent":false,"tier":{"name":"free","maxSizeBytes":5242880,"ttlDays":30,"persistent":false,"badge":true},"limitations":{"actions":[]}}}
```

The `drop` object is the full SDK `DropResponse`. Notable fields:

| Field | Type | Description |
|-------|------|-------------|
| `accessible` | boolean | Whether the drop is currently accessible (not expired, not deleted) |
| `domain` | string \| null | Hostname of the custom domain the drop is mounted on (e.g. `"reports.example.com"`), or `null` for shared-pool drops |
| `rawUrl` | string \| null | For a single non-HTML file drop, the natural-path URL serving the file's raw bytes (hand it to agents); `null` for HTML drops and collections. The canonical `url` is always the branded view for humans |
| `revision` | number | Current drop revision -- pass it as `--if-revision` on `update-content`/`update-settings` for optimistic locking |
| `persistent` | boolean | `true` for paid drops (no TTL), `false` for Free drops (30-day TTL) |
| `tier` | object | Tier info: `{name, maxSizeBytes, ttlDays, persistent, badge}` (free is `{"name":"free","maxSizeBytes":5242880,"ttlDays":30,"persistent":false,"badge":true}`) |
| `limitations` | object | `{"actions":[...]}` -- a list of `DropAction` entries; empty array when there are none |

#### Examples

```bash
# Get drop details
dropthis get drop_abc123
```

---

### update-content

Update a drop's content with a new version — same URL and slug, new deployment. **Partial by default:** the files you pass upsert by path, every file the drop already serves that you don't mention is carried forward, and each `--delete-path` removes one named file — so you don't resend unchanged assets. Pass `--replace` (or `--mode replace`) to make the files you send the drop's entire content set. Settings (title, visibility, password, expiry, metadata) are left unchanged. To change settings, use `update-settings` instead.

#### Usage

```bash
dropthis update-content <id|url|slug> [input] [flags]
```

- The target is the drop's `drop_…` id (from `publish`/`get` `--json` output). A drop URL or slug also works — the CLI resolves it to the id server-side, owner-scoped, then ships the new content by id. The write itself is always id-only.
- `[input]` is a file, directory, or `-` for stdin. If omitted in a non-TTY environment, piped stdin is read automatically.

#### Flags

| Flag | Required | Description |
|------|----------|-------------|
| `--mode` `<patch\|replace>` | No | How the deployment combines with current content. `patch` (default): provided files upsert, unmentioned files carried forward, `--delete-path` removes named files. `replace`: the files you send are the whole content set. |
| `--replace` | No | Shortcut for `--mode replace`. |
| `--delete-path` `<path>` | No | Remove one file from the carried-forward set (patch only). Repeatable — pass it once per file. Invalid with `--replace`/`--mode replace`. |
| `--entry` `<path>` | No | Entry file for multi-file bundles (default: index.html) |
| `--content-type` `<mime>` | No | Override MIME type (auto-detected from extension) |
| `--path` `<path>` | No | Set filename when publishing from stdin |
| `--idempotency-key` `<key>` | No | Prevent duplicate updates on retry (auto-generated plain UUID) |
| `--if-revision` `<n>` | No | Fail if current revision doesn't match -- optimistic lock |
| `--url` | No | Print only the published URL (no JSON envelope) |
| `--dry-run` | No | Show what would be published without publishing |
| `--json` | No | Force JSON output |

#### Output

##### Default (non-TTY / JSON)

```json
{"ok":true,"drop":{"url":"https://dropthis.app/abc123","id":"drop_abc123"}}
```

##### With `--url`

```
https://dropthis.app/abc123
```

##### Human-friendly (TTY without `--json`)

```
Updated: https://dropthis.app/abc123
```

##### Dry-run

```json
{
  "dryRun": true,
  "kind": "staged",
  "target": "drop_abc123",
  "manifest": {
    "files": [
      {"path": "index.html", "contentType": "text/html", "sizeBytes": 2048}
    ],
    "entry": "index.html"
  },
  "options": {},
  "totalBytes": 2048
}
```

##### Revision conflict error

```json
{"ok":false,"error":{"code":"revision_conflict","message":"Revision mismatch","current_revision":3,"next_action":"Fetch the drop, merge your changes, and retry with the current revision."}}
```

#### Examples

```bash
# Patch (default): upsert just the changed file, keep everything else the drop serves
echo "<h1>v2</h1>" | dropthis update-content drop_abc123 - --content-type text/html --path index.html --url

# Replace: the files you send become the drop's entire content set
dropthis update-content drop_abc123 ./dist-v2 --replace --url
# (equivalent: --mode replace)

# Patch + delete: upsert what you pass and drop two named files (repeat --delete-path)
dropthis update-content drop_abc123 ./changed --delete-path old/legacy.css --delete-path stale.js --url

# Update with optimistic concurrency
dropthis update-content drop_abc123 ./new-content --if-revision 2 --url

# Dry-run to preview what would change
dropthis update-content drop_abc123 ./dist --dry-run
```

#### Notes

- `update-content` is **partial by default** (`--mode patch`): provided files upsert by path, unmentioned files are carried forward, and each `--delete-path` removes one named file. Pass `--replace` (or `--mode replace`) to make the files you send the drop's whole content set; `--delete-path` is invalid with replace. The server enforces the merge and validation.
- `update-content` ships a new deployment but never changes settings. Use `update-settings` for title/visibility/password/expiry/metadata.
- `--if-revision` enables optimistic concurrency -- the update fails with `revision_conflict` if the drop has been modified since the specified revision.
- An idempotency key (a plain UUID) is auto-generated if `--idempotency-key` is not provided.
- `--mode`/`--replace`/`--delete-path` are in the CLI source; the generated `commands.json` catalog (built from the currently published binary) may not list them until the next CLI release. The prose above is authoritative.

---

### update-settings

Change a drop's settings — title, visibility, password, expiry, noindex, or metadata. Content is left unchanged (no new deployment). To replace content, use `update-content` instead.

#### Usage

```bash
dropthis update-settings <id|url|slug> [flags]
```

- The target is the drop's `drop_…` id (from `publish`/`get` `--json` output). A drop URL or slug also works — the CLI resolves it to the id server-side, owner-scoped, then applies the settings by id. The write itself is always id-only.

#### Flags

| Flag | Required | Description |
|------|----------|-------------|
| `--title` `<title>` | No | Drop title |
| `--visibility` `<public\|unlisted>` | No | public (default) or unlisted |
| `--password` `<password>` | No | Require password to view (Pro-only — Free returns 403 `feature_not_in_plan` with an `upgrade_url`) |
| `--no-password` | No | Remove password protection (always allowed) |
| `--noindex` | No | Prevent search-engine indexing |
| `--index` | No | Allow search-engine indexing (default) |
| `--expires-at` `<datetime>` | No | Auto-delete after this ISO 8601 date |
| `--no-expires` | No | Clear the expiry — make the drop permanent (Keep/Pro) |
| `--domain` `<hostname>` | No | Move the drop onto a connected custom domain |
| `--shared` | No | Force the shared `dropthiis.com` pool even when the workspace has a default custom domain |
| `--slug` `<slug>` | No | Rename the drop's vanity slug (path on its current domain) |
| `--metadata` `<json>` | No | Attach JSON key-value pairs, e.g. '{"source":"ci"}' |
| `--metadata-file` `<path>` | No | Read metadata JSON from a file |
| `--idempotency-key` `<key>` | No | Prevent duplicate updates on retry (auto-generated plain UUID) |
| `--if-revision` `<n>` | No | Fail if current revision doesn't match -- optimistic lock |
| `--dry-run` | No | Show what would change without applying |
| `--json` | No | Force JSON output |

#### Output

##### Default (non-TTY / JSON)

```json
{"ok":true,"drop":{"url":"https://dropthis.app/abc123","id":"drop_abc123"}}
```

##### Dry-run

```json
{
  "dryRun": true,
  "kind": "options_update",
  "target": "drop_abc123",
  "fields": {
    "title": "New Title"
  }
}
```

##### Revision conflict error

```json
{"ok":false,"error":{"code":"revision_conflict","message":"Revision mismatch","current_revision":3,"next_action":"Fetch the drop, merge your changes, and retry with the current revision."}}
```

#### Examples

```bash
# Update only the title (no content change)
dropthis update-settings drop_abc123 --title "Updated Title" --json

# Change visibility
dropthis update-settings drop_abc123 --visibility unlisted --json

# Remove an existing password (always allowed; SETTING one is Pro-only)
dropthis update-settings drop_abc123 --no-password

# Set metadata
dropthis update-settings drop_abc123 --metadata '{"campaign":"winter-2025"}'

# Update content and settings: run both commands
dropthis update-content drop_abc123 ./dist-v2 --url
dropthis update-settings drop_abc123 --title "v2 Release" --json
```

#### Notes

- `update-settings` applies settings changes (title, visibility, password, noindex, expires-at, metadata) without creating a new deployment.
- `--if-revision` enables optimistic concurrency -- the update fails with `revision_conflict` if the drop has been modified since the specified revision.
- An idempotency key (a plain UUID) is auto-generated if `--idempotency-key` is not provided.

---

### delete

Delete a drop permanently.

#### Usage

```bash
dropthis delete <id|url|slug> [flags]
```

#### Flags

| Flag | Required | Description |
|------|----------|-------------|
| `--yes` | No* | Confirm deletion (required in non-interactive mode) |
| `--json` | No | Force JSON output |

*In non-interactive mode (non-TTY, pipes, agents), `--yes` is required.

#### Output

```json
{"ok":true,"deleted":true,"id":"drop_abc123"}
```

#### Examples

```bash
# Delete a drop (interactive prompt)
dropthis delete drop_abc123

# Delete without confirmation (required for agents/CI)
dropthis delete drop_abc123 --yes
```

## Notes

- All drop commands require authentication.
- Content and settings are separate commands: `update-content <id> <input>` updates the files at the URL (new deployment, settings unchanged — partial by default; `--replace` swaps the whole set, `--delete-path` removes named files); `update-settings <id> --<setting>` changes title/visibility/password/expiry/metadata (content unchanged). To change both, run both.
- `get`, `delete`, `pull`, `update-content`, and `update-settings` accept the drop's URL or slug as well as its `drop_…` id — the CLI resolves it server-side, then mutates strictly by id. `dropthis resolve <target>` is the explicit form when you just want the id. Persist the `drop_…` id; URLs and slugs are locators that can drift, the id never moves.
- The `delete --yes` flag is mandatory in non-interactive (non-TTY) environments. Agents must always include it.
- Content read-back (REST): `GET /v1/drops/{dropId}/content` returns a JSON manifest of the CURRENT deployment's files (paths, sizes, content types, entry); add `?path=<file>` to download one file's exact stored bytes. Owner-authenticated with your `sk_` key; works regardless of any viewer password. For historical versions see [deployments.md](deployments.md).
