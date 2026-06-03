# publish

## publish

Publish files, folders, URLs, strings, or stdin. Multiple files are bundled into one drop. A bare `http(s)` URL is fetched by the server (source_url). Use `-` to read stdin explicitly, or pipe without args.

`publish` is the **default command** — you can omit it and pass files directly to `dropthis`:

```bash
dropthis ./page.html          # shorthand
dropthis publish ./page.html  # explicit (equivalent)
```

### Usage

```bash
dropthis [input...] [flags]
dropthis publish [input...] [flags]
```

The `input` argument accepts:
- A file path (`./page.html`)
- A directory path (`./dist`)
- Multiple file paths (`index.html styles.css app.js`) -- bundled into one drop. Pass the files as separate arguments; do NOT inline CSS/JS into one HTML file.
- A public `http(s)` URL (`https://example.com/page.html`) -- the server fetches it (source_url flow)
- `-` for explicit stdin
- Omit input and pipe content via stdin

### Inline auth

When credentials are missing and the terminal is interactive, `publish` prompts for email OTP login inline instead of failing. Use `--no-interactive` to disable this and fail with exit code 3 instead.

### Flags

| Flag | Required | Description |
|------|----------|-------------|
| `--title` `<title>` | No | Drop title |
| `--visibility` `<public\|unlisted>` | No | public (default) or unlisted |
| `--password` `<password>` | No | Require password to view |
| `--noindex` | No | Prevent search-engine indexing |
| `--entry` `<path>` | No | Entry file for multi-file bundles (default: index.html) |
| `--expires-at` `<datetime>` | No | Auto-delete after this ISO 8601 date |
| `--metadata` `<json>` | No | Attach JSON key-value pairs, e.g. '{"source":"ci"}' |
| `--metadata-file` `<path>` | No | Read metadata JSON from a file |
| `--content-type` `<mime>` | No | Override MIME type (auto-detected from extension) |
| `--path` `<path>` | No | Set filename when publishing from stdin |
| `--idempotency-key` `<key>` | No | Prevent duplicate publishes on retry (auto-generated) |
| `--url` | No | Print only the published URL (no JSON envelope) |
| `--dry-run` | No | Show what would be published without publishing |
| `--json` | No | Force JSON output |

### Global Flags

These flags are inherited from the parent `dropthis` command and available on all subcommands:

| Flag | Description |
|------|-------------|
| `--api-key` `<key>` | Override API key for this invocation |
| `--api-url` `<url>` | Override API base URL |
| `--json` | Force JSON output |
| `-q`, `--quiet` | Suppress status output and imply JSON |
| `--no-interactive` | Disable interactive prompts (inline auth, confirmations) |

### Output

Retain `drop.id` for all follow-up operations (`drops`/`deployments`); the `slug`/`url` are not accepted as a drop id.

#### Default (non-TTY / JSON)

The CLI emits the SDK `DropResponse` under `drop`:

```json
{"ok":true,"drop":{"object":"drop","id":"drop_abc123","slug":"abc123","url":"https://dropthis.app/abc123","deploymentId":"dep_xyz789","title":"My Page","contentType":"text/html","visibility":"public","status":"ready","revision":1,"sizeBytes":1234,"createdAt":"2026-05-29T12:00:00Z","expiresAt":"2026-06-01T12:00:00Z","accessible":true,"persistent":false,"badgeApplied":true,"tier":{"name":"free","maxSizeBytes":5242880,"ttlDays":3,"persistent":false,"badge":true},"limitations":{"actions":[]}}}
```

Key fields present in publish responses:

| Field | Type | Description |
|-------|------|-------------|
| `drop.object` | string | Always `"drop"` |
| `drop.url` | string | The published URL |
| `drop.id` | string | Drop ID (starts with `drop_`). Use THIS for `get`/`update-content`/`update-settings`/`delete` and `deployments` -- not the slug/URL. |
| `drop.slug` | string | Vanity-able URL token (e.g. `abc123`). NOT a drop id -- do NOT pass it to `get`/`update-content`/`update-settings`/`delete`/`deployments` commands. |
| `drop.deploymentId` | string \| null | The deployment that produced this content version |
| `drop.contentType` | string | MIME type of the entry content |
| `drop.sizeBytes` | number | Total bundle size in bytes |
| `drop.expiresAt` | string \| null | ISO 8601 auto-delete time, or `null` if persistent |
| `drop.accessible` | boolean | Whether the drop is currently accessible |
| `drop.persistent` | boolean | `true` for Pro drops, `false` for free-tier drops (3-day TTL) |
| `drop.badgeApplied` | boolean | `true` when the dropthis badge is shown on the drop |
| `drop.tier` | object | Tier info: `{name, maxSizeBytes, ttlDays, persistent, badge}` (e.g. free is `{"name":"free","maxSizeBytes":5242880,"ttlDays":3,"persistent":false,"badge":true}`) |
| `drop.limitations` | object | `{"actions":[...]}` -- a list of `DropAction` entries (`code`, `kind`, `priority`, `message`, optional `resolve`). Empty array when there are no actions. |

#### With `--url`

```
https://dropthis.app/abc123
```

#### Human-friendly (TTY without `--json`)

```
Published: https://dropthis.app/abc123
  1.2 KB · text/html · expires 2026-06-01
```

The second line is a dimmed detail line summarizing the drop. It includes, when present:
the formatted size (`sizeBytes`), the content type (`contentType`, before any `;`),
`unlisted` when visibility is unlisted, and `expires <date>` when `expiresAt` is set (free
drops expire after 3 days). Fields that are absent are omitted; if none apply, the line is
not printed.

#### With `--dry-run`

```json
{
  "dryRun": true,
  "kind": "staged",
  "manifest": {
    "files": [
      {"path": "index.html", "contentType": "text/html", "sizeBytes": 1234}
    ],
    "entry": "index.html"
  },
  "options": {
    "title": "My Page"
  },
  "totalBytes": 1234
}
```

#### Errors

```json
{"ok":false,"error":{"code":"auth_error","message":"No API key found.","next_action":"Set DROPTHIS_API_KEY or run dropthis login."}}
```

### Examples

```bash
# Publish a single HTML file (shorthand — publish is the default command)
dropthis ./page.html --url

# Explicit form (equivalent)
dropthis publish ./page.html --url

# Publish a directory (static site)
dropthis ./dist --url

# Publish multiple files bundled into one drop
dropthis index.html styles.css app.js --url

# Publish a copy of a public URL (server fetches it)
dropthis https://example.com/page.html --url

# Publish from stdin (- is optional; content type and path auto-detected, but recommended)
echo "<h1>Hello</h1>" | dropthis publish - --content-type text/html --path index.html --url

# Pipe without args (stdin auto-detected in non-TTY)
echo "<h1>Hello</h1>" | dropthis publish --content-type text/html --path index.html --url

# Publish with a custom title and password
dropthis ./report.html --title "Q4 Report" --password s3cret --url

# Publish as unlisted with noindex
dropthis ./draft.html --visibility unlisted --noindex --url

# Publish with metadata
dropthis ./page.html --metadata '{"source":"agent","version":"1.2"}' --url

# Publish with an expiration
dropthis ./temp.html --expires-at "2025-12-31T23:59:59Z" --url

# Dry-run to validate before publishing
dropthis ./dist --dry-run --title "Preview"

# Publish with a specific API key
dropthis ./page.html --url --api-key sk_live_abc123

# Get full JSON response
dropthis ./page.html --json
```

### Notes

- When piping stdin, `--content-type` and `--path` are strongly recommended. If omitted, the SDK auto-detects the content type (HTML detected from tags, else `text/plain`) and picks an entry filename (`index.html` for HTML, `index.txt` otherwise). Set them explicitly for deterministic output.
- `--url` and `--dry-run` are mutually exclusive.
- `--metadata` and `--metadata-file` are mutually exclusive.
- An idempotency key (a plain UUID) is auto-generated if `--idempotency-key` is not provided.
- Maximum 200 files per bundle.
- In non-TTY environments (pipes, CI), output defaults to JSON automatically.
