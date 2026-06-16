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
| `--password` `<password>` | No | Require password to view (Pro-only — Free returns 403 `password_protection_unavailable` with an `upgrade_url`) |
| `--noindex` | No | Prevent search-engine indexing |
| `--entry` `<path>` | No | Entry file for multi-file bundles (default: index.html) |
| `--expires-at` `<datetime>` | No | Auto-delete after this ISO 8601 date |
| `--metadata` `<json>` | No | Attach JSON key-value pairs, e.g. '{"source":"ci"}' |
| `--metadata-file` `<path>` | No | Read metadata JSON from a file |
| `--content-type` `<mime>` | No | Override MIME type (auto-detected from extension) |
| `--path` `<path>` | No | Set filename when publishing from stdin |
| `--manifest` `<file.json>` | No | Publish a pre-built file bundle from a JSON manifest. The manifest shape is `{ "files": [ { "path", "content"\|"content_base64"\|"source_url", "content_type"? } ] }` — exactly one source per file. Use `source_url` for remote assets; never base64-inline an image. Mutually exclusive with positional `input` arguments. Available on both `publish` and `update-content`. |
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
{"ok":true,"drop":{"object":"drop","id":"drop_abc123","slug":"abc123","url":"https://dropthis.app/abc123","domain":null,"deploymentId":"dep_xyz789","title":"My Page","contentType":"text/html","visibility":"public","status":"ready","revision":1,"sizeBytes":1234,"createdAt":"2026-05-29T12:00:00Z","expiresAt":"2026-06-05T12:00:00Z","accessible":true,"persistent":false,"badgeApplied":true,"tier":{"name":"free","maxSizeBytes":5242880,"ttlDays":7,"persistent":false,"badge":true},"limitations":{"actions":[]}}}
```

Key fields present in publish responses:

| Field | Type | Description |
|-------|------|-------------|
| `drop.object` | string | Always `"drop"` |
| `drop.url` | string | The published URL |
| `drop.id` | string | Drop ID (starts with `drop_`). The durable write handle — capture and persist it for `update-content`/`update-settings`/`delete` and `deployments`. URLs and slugs are locators that can drift; the id never moves. |
| `drop.slug` | string | The drop's URL token (e.g. `abc123`). NOT a drop id. `deployments list/get` are strict id-only; the other drop commands accept the slug/URL and resolve it server-side, or recover the id explicitly with `dropthis resolve <slug>`. |
| `drop.domain` | string \| null | Hostname of the custom domain the drop is mounted on (e.g. `"reports.example.com"`), or `null` for shared-pool drops |
| `drop.rawUrl` | string \| null | For a **single non-HTML file** drop: the natural-path URL serving the file's raw bytes (e.g. `https://dropthis.app/abc123/notes.md`). Hand THIS to agents that want the exact bytes; the canonical `url` is the branded preview for humans. `null` for HTML drops and collections (the page IS the artifact / per-file paths come from the branded index). |
| `drop.deploymentId` | string \| null | The deployment that produced this content version |
| `drop.contentType` | string | MIME type of the entry content |
| `drop.sizeBytes` | number | Total bundle size in bytes |
| `drop.expiresAt` | string \| null | ISO 8601 auto-delete time, or `null` if persistent |
| `drop.accessible` | boolean | Whether the drop is currently accessible |
| `drop.persistent` | boolean | `true` for Pro drops (no TTL), `false` for Free drops (7-day TTL) |
| `drop.badgeApplied` | boolean | `true` when the dropthis badge is shown on the drop |
| `drop.tier` | object | Tier info: `{name, maxSizeBytes, ttlDays, persistent, badge}` (e.g. free is `{"name":"free","maxSizeBytes":5242880,"ttlDays":7,"persistent":false,"badge":true}`) |
| `drop.limitations` | object | `{"actions":[...]}` -- a list of `DropAction` entries (`code`, `kind`, `priority`, `message`, optional `resolve`). Empty array when there are no actions. |
| `drop.warnings` | array | Bundle classification warnings. A `root_relative_reference` entry names a file referencing assets with root-relative URLs (e.g. `/styles.css`) that break if the drop is served under a subpath -- prefer relative refs. Empty array when clean. |

#### With `--url`

```
https://dropthis.app/abc123
```

#### Human-friendly (TTY without `--json`)

```
Published: https://dropthis.app/abc123
  1.2 KB · text/html · expires 2026-06-05
```

The second line is a dimmed detail line summarizing the drop. It includes, when present:
the formatted size (`sizeBytes`), the content type (`contentType`, before any `;`),
`unlisted` when visibility is unlisted, and `expires <date>` when `expiresAt` is set (free
drops expire after 7 days). Fields that are absent are omitted; if none apply, the line is
not printed.

For a **single non-HTML file** drop, a `Raw:` line is also printed with the natural-path raw
bytes URL (the `rawUrl` field):

```
Published: https://dropthis.app/abc123
  3.4 KB · text/markdown
Raw:       https://dropthis.app/abc123/notes.md
```

The canonical `Published:` URL is the branded preview (badge) for humans; the `Raw:` URL serves
the exact bytes for agents. The `Raw:` line is absent for HTML drops and collections (`rawUrl`
is `null`).

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

# Publish with a custom title
dropthis ./report.html --title "Q4 Report" --url

# Publish as unlisted with noindex
dropthis ./draft.html --visibility unlisted --noindex --url

# Publish with metadata
dropthis ./page.html --metadata '{"source":"agent","version":"1.2"}' --url

# Publish with an expiration
dropthis ./temp.html --expires-at "2025-12-31T23:59:59Z" --url

# Publish a multi-file bundle from a manifest (HTML + remote image via source_url)
# manifest.json: {"files":[{"path":"index.html","content":"<h1>Hi</h1>"},{"path":"hero.png","source_url":"https://cdn.example.com/hero.png"}]}
dropthis publish --manifest ./manifest.json --title "My Page" --url

# Replace content using a manifest (update-content also accepts --manifest)
dropthis update-content drop_abc123 --manifest ./manifest.json --url

# Dry-run to validate before publishing
dropthis ./dist --dry-run --title "Preview"

# Publish with a specific API key
dropthis ./page.html --url --api-key sk_live_abc123

# Get full JSON response
dropthis ./page.html --json
```

### Notes

- **Canonical view vs raw bytes.** The published `url` is **always a branded view** carrying
  the dropthis badge (no client detection): an HTML drop renders the page; a single non-HTML
  file renders a branded **preview** (image inline; text/markdown/json/csv/code as escaped
  source; opaque binary as a download affordance); a collection renders a branded **index**
  linking each file's natural path. The raw bytes of a single-file drop live at a **natural
  path** under the drop and are surfaced as `rawUrl` (e.g. `…/abc123/notes.md`). Give the
  canonical `url` to humans, `rawUrl` to agents. There is no `/_raw/` route. Append
  `?download=1` to any natural-path URL to force a download.
- **Publish vs transfer.** dropthis publishes agent-readable artifacts, not files-for-transfer.
  The only gate is the per-drop size cap (5 MB Free / 100 MB Pro) — there is no content/extension
  policy. A `handoff.md` or a handful of JSON/CSV files publish fine; very large binaries are
  blocked by size, not type.
- When piping stdin, `--content-type` and `--path` are strongly recommended. If omitted, the SDK auto-detects the content type (HTML detected from tags, else `text/plain`) and picks an entry filename (`index.html` for HTML, `index.txt` otherwise). Set them explicitly for deterministic output.
- Setting `--password` is Pro-only (Free returns 403 `password_protection_unavailable` with an `upgrade_url`). Removing one with `update-settings --no-password` is always allowed.
- At the REST level the API is staged-only: `POST /v1/drops` accepts exactly one of `upload_id` (from a completed staged upload) or `source_url` -- there is no inline-content or multipart mode. The CLI stages files/strings/stdin for you automatically.
- `--url` and `--dry-run` are mutually exclusive.
- `--metadata` and `--metadata-file` are mutually exclusive.
- An idempotency key (a plain UUID) is auto-generated if `--idempotency-key` is not provided.
- Maximum 200 files per bundle. To include remote assets (images, video, pdf, fonts) without downloading them first, pass a manifest file with `--manifest <file.json>` on both `publish` and `update-content`. The manifest JSON shape is:

  ```json
  {
    "files": [
      { "path": "index.html",   "content": "<h1>Hello</h1>",                        "content_type": "text/html" },
      { "path": "hero.png",     "source_url": "https://cdn.example.com/hero.png" }
    ]
  }
  ```

  Each file entry takes **exactly one** of:
  - `content` — inline UTF-8 string
  - `content_base64` — base64-encoded bytes (for binary files you already have locally)
  - `source_url` — a public `http(s)` URL the server fetches; use this for images, video, PDF, fonts, and any remote asset

  Optional per-file fields: `content_type` (auto-detected if omitted), `path` (required), and any other fields the SDK's `PublishFileInput` accepts.

  **Anti-base64 rule:** never base64-inline a remote asset — use `source_url` instead. Base64 inflates payload size by ~33% and forces the asset through the agent context window.

  Note: `commands.json` (the machine-readable command catalog committed in this repo) is generated from the currently published `@dropthis/cli` binary. The `--manifest` flag is present in the CLI source but may not yet appear in that generated catalog until the next CLI release. The prose above is authoritative.
- In non-TTY environments (pipes, CI), output defaults to JSON automatically.
