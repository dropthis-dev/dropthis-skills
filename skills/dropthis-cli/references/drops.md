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

---

### get

Get details for a single drop.

#### Usage

```bash
dropthis get <dropId> [flags]
```

#### Flags

| Flag | Required | Description |
|------|----------|-------------|
| `--json` | No | Force JSON output |

#### Output

```json
{"ok":true,"drop":{"id":"drop_abc123","url":"https://dropthis.app/abc123","title":"My Page","visibility":"public","accessible":true,"persistent":false,"tier":{"name":"free","maxSizeBytes":5242880,"ttlDays":3,"persistent":false,"badge":true},"limitations":{"actions":[]}}}
```

The `drop` object is the full SDK `DropResponse`. Notable fields:

| Field | Type | Description |
|-------|------|-------------|
| `accessible` | boolean | Whether the drop is currently accessible (not expired, not deleted) |
| `persistent` | boolean | `true` for Pro drops (no TTL), `false` for free-tier drops (3-day TTL) |
| `tier` | object | Tier info: `{name, maxSizeBytes, ttlDays, persistent, badge}` (free is `{"name":"free","maxSizeBytes":5242880,"ttlDays":3,"persistent":false,"badge":true}`) |
| `limitations` | object | `{"actions":[...]}` -- a list of `DropAction` entries; empty array when there are none |

#### Examples

```bash
# Get drop details
dropthis get drop_abc123
```

---

### update-content

Replace a drop's content with a new version — same URL and slug, new deployment. Settings (title, visibility, password, expiry, metadata) are left unchanged. To change settings, use `update-settings` instead.

#### Usage

```bash
dropthis update-content <dropId> [input] [flags]
```

- `<dropId>` is a drop id (must start with `drop_`), obtained from `--json` output of `publish` or `get`.
- `[input]` is a file, directory, or `-` for stdin. If omitted in a non-TTY environment, piped stdin is read automatically.

#### Flags

| Flag | Required | Description |
|------|----------|-------------|
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
# Replace the content of a drop (same URL)
dropthis update-content drop_abc123 ./dist-v2 --url

# Replace content with optimistic concurrency
dropthis update-content drop_abc123 ./new-content --if-revision 2 --url

# Replace content from stdin
echo "<h1>New content</h1>" | dropthis update-content drop_abc123 - --content-type text/html --path index.html --url

# Dry-run to preview what would change
dropthis update-content drop_abc123 ./dist --dry-run
```

#### Notes

- `update-content` ships a new deployment but never changes settings. Use `update-settings` for title/visibility/password/expiry/metadata.
- `--if-revision` enables optimistic concurrency -- the update fails with `revision_conflict` if the drop has been modified since the specified revision.
- An idempotency key (a plain UUID) is auto-generated if `--idempotency-key` is not provided.

---

### update-settings

Change a drop's settings — title, visibility, password, expiry, noindex, or metadata. Content is left unchanged (no new deployment). To replace content, use `update-content` instead.

#### Usage

```bash
dropthis update-settings <dropId> [flags]
```

- `<dropId>` is a drop id (must start with `drop_`), obtained from `--json` output of `publish` or `get`.

#### Flags

| Flag | Required | Description |
|------|----------|-------------|
| `--title` `<title>` | No | Drop title |
| `--visibility` `<public\|unlisted>` | No | public (default) or unlisted |
| `--password` `<password>` | No | Require password to view |
| `--no-password` | No | Remove password protection |
| `--noindex` | No | Prevent search-engine indexing |
| `--index` | No | Allow search-engine indexing (default) |
| `--expires-at` `<datetime>` | No | Auto-delete after this ISO 8601 date |
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

# Change visibility and set password
dropthis update-settings drop_abc123 --visibility unlisted --password s3cret --json

# Remove password
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
dropthis delete <dropId> [flags]
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
- Content and settings are separate commands: `update-content <id> <input>` replaces the files at the URL (new deployment, settings unchanged); `update-settings <id> --<setting>` changes title/visibility/password/expiry/metadata (content unchanged). To change both, run both.
- The `delete --yes` flag is mandatory in non-interactive (non-TTY) environments. Agents must always include it.
