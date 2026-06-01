# drops

Drop resource commands for listing, inspecting, updating metadata, and deleting drops.

## drops

### drops list

List your drops with pagination.

#### Usage

```bash
dropthis drops list [flags]
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
dropthis drops list

# List with page size
dropthis drops list --limit 10

# Paginate
dropthis drops list --cursor "eyJsYXN0X2lkIjoiZHJvcF8xMjMifQ"
```

---

### drops get

Get details for a single drop.

#### Usage

```bash
dropthis drops get <dropId> [flags]
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
dropthis drops get drop_abc123
```

---

### drops update

Update an existing drop by id. Can replace content, update metadata, or both. This is the single command for all updates to a drop -- content deployment and metadata changes.

- When `[input]` is provided (file, directory, stdin), a new deployment is created with the new content.
- When only metadata flags are provided (no input), only metadata is updated without a new deployment.
- Both can be combined: new content + metadata changes in one command.

#### Usage

```bash
dropthis drops update <dropId> [input] [flags]
```

- `<dropId>` is a drop id (must start with `drop_`), obtained from `--json` output of `publish` or `drops get`.
- `[input]` is an optional file, directory, or `-` for stdin. If omitted, only metadata flags are applied.

#### Flags

| Flag | Required | Description |
|------|----------|-------------|
| `--slug` `<slug>` | No | Change the vanity slug |
| `--title` `<title>` | No | Drop title |
| `--visibility` `<public\|unlisted>` | No | public (default) or unlisted |
| `--password` `<password>` | No | Require password to view |
| `--no-password` | No | Remove password protection |
| `--noindex` | No | Prevent search-engine indexing |
| `--index` | No | Allow search-engine indexing (default) |
| `--expires-at` `<datetime>` | No | Auto-delete after this ISO 8601 date |
| `--metadata` `<json>` | No | Attach JSON key-value pairs, e.g. '{"source":"ci"}' |
| `--metadata-file` `<path>` | No | Read metadata JSON from a file |
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

##### Dry-run with content

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

##### Dry-run without content (metadata-only)

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
# Update content of a drop
dropthis drops update drop_abc123 ./dist-v2 --url

# Update only metadata (no content change)
dropthis drops update drop_abc123 --title "Updated Title" --json

# Update with optimistic concurrency
dropthis drops update drop_abc123 ./new-content --if-revision 2 --url

# Update from stdin
echo "<h1>New content</h1>" | dropthis drops update drop_abc123 - --content-type text/html --path index.html --url

# Change visibility and set password
dropthis drops update drop_abc123 --visibility unlisted --password s3cret --json

# Change the vanity slug
dropthis drops update drop_abc123 --slug new-slug --json

# Dry-run to preview what would change
dropthis drops update drop_abc123 ./dist --dry-run

# Update content and metadata in one command
dropthis drops update drop_abc123 ./dist-v2 --title "v2 Release" --url

# Remove password
dropthis drops update drop_abc123 --no-password

# Set metadata
dropthis drops update drop_abc123 --metadata '{"campaign":"winter-2025"}'
```

#### Notes

- When no `[input]` is provided, only metadata flags (title, visibility, password, etc.) are applied without creating a new deployment.
- When `[input]` is provided, a new deployment is created. Metadata flags can be combined.
- `--if-revision` enables optimistic concurrency -- the update fails with `revision_conflict` if the drop has been modified since the specified revision.
- An idempotency key (a plain UUID) is auto-generated if `--idempotency-key` is not provided.

---

### drops delete

Delete a drop permanently.

#### Usage

```bash
dropthis drops delete <dropId> [flags]
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
dropthis drops delete drop_abc123

# Delete without confirmation (required for agents/CI)
dropthis drops delete drop_abc123 --yes
```

## Notes

- All `drops` subcommands require authentication.
- `drops update` handles both content deployment and metadata updates. Provide `[input]` for new content, metadata flags for metadata changes, or both.
- The `drops delete --yes` flag is mandatory in non-interactive (non-TTY) environments. Agents must always include it.
