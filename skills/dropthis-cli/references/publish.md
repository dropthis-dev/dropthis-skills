# publish

## publish

Publish files, folders, strings, or stdin. Multiple files are bundled into one drop. Use `-` to read stdin explicitly, or pipe without args.

### Usage

```bash
dropthis publish [input...] [flags]
```

The `input` argument accepts:
- A file path (`./page.html`)
- A directory path (`./dist`)
- Multiple file paths (`index.html styles.css app.js`) -- bundled into one drop
- `-` for explicit stdin
- Omit input and pipe content via stdin

### Flags

| Flag | Required | Description |
|------|----------|-------------|
| `--title` `<title>` | No | Drop title |
| `--visibility` `<public\|unlisted>` | No | public (default) or unlisted |
| `--password` `<password>` | No | Require password to view |
| `--no-password` | No | Remove password protection |
| `--noindex` | No | Prevent search-engine indexing |
| `--index` | No | Allow search-engine indexing (default) |
| `--entry` `<path>` | No | Entry file for multi-file bundles (default: index.html) |
| `--expires-at` `<datetime>` | No | Auto-delete after this ISO 8601 date |
| `--metadata` `<json>` | No | Attach JSON key-value pairs, e.g. '{"source":"ci"}' |
| `--metadata-file` `<path>` | No | Read metadata JSON from a file |
| `--content-type` `<mime>` | No | Override MIME type (auto-detected from extension) |
| `--path` `<path>` | No | Set filename when publishing from stdin |
| `--idempotency-key` `<key>` | No | Prevent duplicate publishes on retry (auto-generated) |
| `--from-json` `<path>` | No | Send raw API request body from a JSON file |
| `--url` | No | Print only the published URL (no JSON envelope) |
| `--dry-run` | No | Show what would be published without publishing |
| `--json` | No | Force JSON output |

### Global Flags

These flags are inherited from the parent `dropthis` command and available on all subcommands:

| Flag | Description |
|------|-------------|
| `--api-key` `<key>` | Override API key for this invocation |
| `--api-url` `<url>` | Override API base URL |
| `-q`, `--quiet` | Suppress status output and imply JSON |

### Output

#### Default (non-TTY / JSON)

```json
{"ok":true,"drop":{"url":"https://dropthis.app/abc123","id":"drop_abc123","object":"drop","accessible":true,"persistent":false,"badgeApplied":true,"tier":"free","limitations":{"expiresInDays":7,"badge":true}}}
```

Fields present in all publish responses:

| Field | Type | Description |
|-------|------|-------------|
| `drop.object` | string | Always `"drop"` |
| `drop.url` | string | The published URL |
| `drop.id` | string | Drop ID (starts with `drop_`) |
| `drop.accessible` | boolean | Whether the drop is currently accessible |
| `drop.persistent` | boolean | `true` for Pro drops, `false` for free-tier drops (7-day TTL) |
| `drop.badgeApplied` | boolean | `true` when the dropthis badge is shown on the drop |
| `drop.tier` | string | Plan tier: `"free"` or `"pro"` |
| `drop.limitations` | object \| null | Plan constraints; `null` for Pro. Free: `{"expiresInDays":7,"badge":true}` |

#### With `--url`

```
https://dropthis.app/abc123
```

#### Human-friendly (TTY without `--json`)

For Pro drops:

```
Published: https://dropthis.app/abc123
```

For free-plan drops, a second line shows the plan constraints:

```
Published: https://dropthis.app/abc123
Free plan · Expires in 7 days · Badge included
```

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
# Publish a single HTML file, get just the URL
dropthis publish ./page.html --url

# Publish a directory (static site)
dropthis publish ./dist --url

# Publish multiple files bundled into one drop
dropthis publish index.html styles.css app.js --url

# Publish from stdin with required flags
echo "<h1>Hello</h1>" | dropthis publish - --content-type text/html --path index.html --url

# Pipe without args (stdin auto-detected in non-TTY)
echo "<h1>Hello</h1>" | dropthis publish --content-type text/html --path index.html --url

# Publish with a custom title and password
dropthis publish ./report.html --title "Q4 Report" --password s3cret --url

# Publish as unlisted with noindex
dropthis publish ./draft.html --visibility unlisted --noindex --url

# Publish with metadata
dropthis publish ./page.html --metadata '{"source":"agent","version":"1.2"}' --url

# Publish with an expiration
dropthis publish ./temp.html --expires-at "2025-12-31T23:59:59Z" --url

# Dry-run to validate before publishing
dropthis publish ./dist --dry-run --title "Preview"

# Publish from a raw JSON body file
dropthis publish --from-json ./request.json --url

# Publish with a specific API key
dropthis publish ./page.html --url --api-key sk_live_abc123

# Get full JSON response
dropthis publish ./page.html --json
```

### Notes

- When piping stdin, both `--content-type` and `--path` are required.
- `--from-json` and `<input>` are mutually exclusive.
- `--url` and `--dry-run` are mutually exclusive.
- `--password` and `--no-password` are mutually exclusive.
- `--noindex` and `--index` are mutually exclusive.
- `--metadata` and `--metadata-file` are mutually exclusive.
- An idempotency key is auto-generated (`cli_pub_<uuid>`) if not provided.
- Maximum 200 files per bundle.
- In non-TTY environments (pipes, CI), output defaults to JSON automatically.
