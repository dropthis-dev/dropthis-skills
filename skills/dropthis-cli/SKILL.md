---
name: dropthis-cli
description: >
  Use when the user wants to publish, share, post, put online, make public, host, or get a
  shareable link for content — an HTML file, a directory/built site, or generated content —
  from the terminal with the `dropthis` CLI, even if they don't say "drop". Also use to
  update, edit, rename, password-protect, list, or delete published drops via
  `dropthis publish`, `dropthis update-content`, `dropthis update-settings`, `dropthis get`,
  `dropthis resolve`, `dropthis list`, and `dropthis delete`. Load this before running `dropthis`
  commands — it covers the non-interactive flag contract and auth resolution order.
license: MIT
metadata:
  author: dropthis
  homepage: https://dropthis.app
  source: https://github.com/dropthis-dev/dropthis-cli
  openclaw:
    primaryEnv: DROPTHIS_API_KEY
    requires:
      env:
        - DROPTHIS_API_KEY
      bins:
        - dropthis
    envVars:
      - name: DROPTHIS_API_KEY
        required: true
        description: dropthis API key (sk_ prefix) for authenticating CLI commands
    install:
      - kind: node
        package: "@dropthis/cli"
        bins: [dropthis]
        label: dropthis CLI
    links:
      repository: https://github.com/dropthis-dev/dropthis-cli
      documentation: https://dropthis.app/docs
inputs:
  - name: DROPTHIS_API_KEY
    description: "dropthis API key for authenticating CLI commands. Get one from the dashboard or via `dropthis login`."
    required: true
references:
  - references/publish.md
  - references/drops.md
  - references/deployments.md
  - references/auth.md
  - references/error-codes.md
  - references/diagnostics.md
  - ../../references/domains.md
---

# dropthis CLI

## Installation

Before running any `dropthis` commands, check whether the CLI is installed:

```bash
dropthis --version
```

If the command is not found, install it:

```bash
npm install -g @dropthis/cli
```

## Agent Protocol

The CLI outputs JSON in non-TTY environments. Exit codes are stable.

**Rules for agents:**
- Supply ALL required flags. The CLI will NOT prompt when stdin is not a TTY.
- Use `--api-key` or `DROPTHIS_API_KEY` env var. Never rely on interactive login.
- Use `--no-interactive` to disable inline auth prompts and confirmations.
- Use `--url` to get only the published URL (cleanest for agents).
- Use `--json` for the full response object.
- Exit `0` = success. Non-zero = error with message on stderr.

| Exit Code | Meaning |
|-----------|---------|
| 0 | Success |
| 1 | API or generic error |
| 2 | Invalid usage |
| 3 | Auth required |
| 4 | Local input error (file or directory not found — including `file_not_found` publish inputs — or too many files) |
| 5 | Network error (`network_error` — could not reach the API; check network / `DROPTHIS_API_URL`) |
| 6 | Domain verification pending (`domains verify` one-shot while DNS/TLS is not live yet) |
| 7 | Domain verification timeout (`domains verify --wait` exceeded `--timeout`) |

## Authentication

Auth resolves in this order:
1. `--api-key sk_...` flag
2. `DROPTHIS_API_KEY` environment variable
3. Stored credential from `dropthis login`

### Interactive login (humans)

```bash
dropthis login
```

### Non-interactive login (agents)

1. Ask the user for their email address.
2. Run `dropthis login request --email <their-email>` to send a one-time code.
3. Tell the user to check their inbox for the code.
4. Once they provide the code, run `dropthis login verify --email <their-email> --otp <code>`.
5. Confirm with `dropthis whoami --json`.

### CI/CD (no login needed)

```bash
export DROPTHIS_API_KEY=sk_live_...
dropthis publish ./dist --url
```

## Available Commands

Lifecycle verbs are flat and top-level — they mirror the MCP tool names 1:1.

| Command | What it does |
|---------|-------------|
| `<input>` | Publish content, get a URL (default command) |
| `publish <input>` | Create a NEW drop. Never takes an id. Same as above, explicit form |
| `update-content <id> [input]` | Replace a drop's content, same URL (ships a new deployment). Settings unchanged |
| `update-settings <id> [flags]` | Change title, visibility, password, expiry, or metadata. Content unchanged |
| `get <id\|url\|slug>` | Show drop details |
| `resolve <id\|url\|slug>` | Resolve a public URL/slug back to its `drop_…` id (server-side, owner-scoped) |
| `list [--domain <hostname>]` | List your drops (optionally filtered to a custom domain) |
| `delete <id\|url\|slug>` | Delete a drop (`--yes` for scripts) |
| `pull <id\|url\|slug> [-o <dir>]` | Download a drop's files into a local directory (read-back) |
| `deployments list <id>` | List deployments (content history) for a drop |
| `deployments get <id> <dep-id>` | Show deployment details |
| `login` | Authenticate with email OTP |
| `logout` | Remove stored credentials |
| `whoami` | Show current auth status |
| `account get` / `account update` / `account delete` | Show or manage your account |
| `api-keys create` / `api-keys list` / `api-keys delete <id>` | Manage API keys |
| `upgrade` | Update the CLI to the latest version from npm |
| `doctor` | Report CLI diagnostics |
| `commands` | Print machine-readable command metadata |

> `publish` creates a NEW drop every call and never takes an id; updating an existing drop needs
> its `drop_…` id. The mutating commands — `update-content`, `update-settings`, `delete` (and the
> reads `get`/`pull`) — accept a drop URL or slug as well as the id: the CLI resolves it
> **server-side and owner-scoped**, then mutates strictly by id. `deployments list/get` are
> id-only. When you only have a URL/slug, `dropthis resolve <target>` returns the id explicitly
> (or pipe it: `ID=$(dropthis resolve <url> --json | jq -r .drop.id)`). **Persist the `drop_…`
> id** — URLs, raw_url, and slugs are locators, not identifiers; a vanity slug is renameable and
> the pool host rotates, so a stored URL can drift, but the id never moves. Treat `drop_…` as an
> opaque case-sensitive string.

## What a drop URL serves (canonical view vs raw bytes)

Every drop has a **human face** (the canonical URL) and, for single-file drops, a **machine
face** (the raw bytes at a natural path). The canonical URL is **always a branded view** — it
carries the dropthis badge with no client detection:

- **HTML drop** → the page renders as-is (badge injected). Unchanged.
- **Single non-HTML file** (e.g. one `.md`, `.json`, `.csv`, `.png`) → a **branded preview**
  page at the canonical URL: an image is shown inline; markdown / JSON / CSV / text / code is
  shown as **escaped source** in a styled block (it is NOT re-rendered — the source is the
  honest, useful form for both a reader and an agent); an opaque binary gets a download
  affordance. The file's **raw bytes** live at the **natural path** under the drop (e.g.
  `https://dropthis.app/abc123/notes.md`), surfaced as `rawUrl` in the response.
- **Collection** (multiple files, no HTML entry) → a **branded index** at the canonical URL
  linking each file at its natural path; a `README.md`/`index.md` is shown (as source) atop
  the index.

There is **no `/_raw/` route** and no user-agent sniffing. Give the **canonical URL to
humans** (they get the badge) and **`rawUrl` to agents** (they get the exact bytes). For
collections, the per-file natural paths come from the branded index. Force a download of any
natural-path URL with `?download=1`.

dropthis publishes **agent-readable artifacts**, not files-for-transfer. The dividing line is
**publish vs transfer**, and it is gated by the **per-drop size cap** (5 MB Free / 100 MB Pro),
not by any content/extension policy — there is no type allow/deny list. A `handoff.md` or seven
JSON files sail through; a multi-GB video rip is impossible by price.

## Publish

`publish` is the default command — you can omit it:

```bash
# Single file (shorthand)
dropthis ./page.html --url

# Directory (static site)
dropthis ./dist --url

# Multiple files
dropthis index.html styles.css app.js --url

# Publish a copy of a public URL (server fetches it — SSRF-guarded)
dropthis https://example.com/page.html --url

# Stdin — publish is the default command, so it can be omitted. Piped (non-TTY) stdin
# is read automatically when no input is given; use - to read stdin explicitly.
echo "<h1>Hello</h1>" | dropthis --content-type text/html --path index.html --url
echo "<h1>Hello</h1>" | dropthis - --content-type text/html --path index.html --url
```

> Capture the drop **id** from publish output for later edits: `ID=$(dropthis ./page.html --json | jq -r '.drop.id')` — then `dropthis update-content "$ID" ...` / `dropthis update-settings "$ID" ...` / `dropthis deployments list "$ID"`. Follow-up commands need the `drop_…` id, not the slug.

### Publish Options

| Flag | Description |
|------|-------------|
| `--title <title>` | Drop title |
| `--visibility <public\|unlisted>` | Drop visibility |
| `--password <password>` | Set password protection (currently rejected on every plan — see note below) |
| `--noindex` | Prevent search engine indexing |
| `--entry <path>` | Entry file for directories |
| `--content-type <mime>` | Content type (recommended for stdin; auto-detected if omitted) |
| `--path <path>` | File path for stdin or byte input |
| `--expires-at <datetime>` | Expiration datetime |
| `--manifest <file.json>` | Publish a pre-built file bundle from a JSON manifest: `{ "files": [ { "path", "content"\|"content_base64"\|"source_url", "content_type"? } ] }`. Exactly one source per file. Use `source_url` for remote assets — never base64-inline images. Available on `publish` and `update-content`. |
| `--metadata <json>` | Metadata as JSON string |
| `--metadata-file <path>` | Metadata from a JSON file |
| `--idempotency-key <key>` | Idempotency key |
| `--url` | Print only the URL |
| `--json` | Print full JSON response |
| `--dry-run` | Validate without publishing |

## Common Patterns

**Agent generates HTML and publishes it:**
```bash
# Write generated content to temp file, publish, return URL
dropthis /tmp/generated-page.html --url --title "Generated Report"
```

**Publish a built site:**
```bash
dropthis ./dist --url --title "Preview Deploy"
```

**Replace a drop's content (same URL, new deployment — settings unchanged):**
```bash
dropthis update-content drop_abc123 ./dist-v2 --url
```

**Edit loop (pull → edit → update-content):**
```bash
dropthis pull drop_abc123 -o ./site      # download what the drop serves
# edit ./site locally, then ship it back to the same URL:
dropthis update-content drop_abc123 ./site --url
```

**Change settings only (content unchanged):**
```bash
dropthis update-settings drop_abc123 --title "v2 Release" --visibility unlisted --json
```

> Content and settings are separate commands. `update-content <id> <input>` replaces the files
> at the URL; `update-settings <id> --title/--visibility/--password/--expires-at/…`
> changes settings only. To do both, run both — first `update-content` to ship new content,
> then `update-settings` for the settings.

**Low-discoverability sharing:**
```bash
dropthis ./report.html --visibility unlisted --noindex --url
```

> Password protection is Pro-only: setting `--password` on a Free account returns
> 403 `password_protection_unavailable` with an `upgrade_url`. Removing an existing
> password with `--no-password` is always allowed. Use `--visibility unlisted`
> for low-discoverability sharing on Free.

## Common Mistakes

| # | Mistake | Fix |
|---|---------|-----|
| 1 | **Forgetting `--url` or `--json`** | Without either flag, the CLI prints human-friendly output that's hard to parse. Always use `--url` for agents. |
| 2 | **Not checking exit code 3** | Exit 3 means auth required. Run `dropthis whoami` first, then prompt for login if needed. |
| 3 | **Assuming URLs aren't supported** | A bare `http(s)` URL IS a valid input: `dropthis https://example.com/page.html --url` publishes a server-fetched copy (source_url flow). Pass the URL directly -- do NOT fetch it yourself first. |
| 4 | **Relying on stdin auto-detection** | When piping content via stdin (`-`), set `--content-type` and `--path` explicitly for deterministic output. Without them the SDK auto-detects content type and entry filename. |
| 5 | **Using the slug/URL token where only an id works** | `deployments list/get` are strict `drop_…` id-only (the `.drop.id` field in publish `--json` output). `update-content`/`update-settings`/`delete` and the reads `get`/`pull` also accept a drop URL or slug — the CLI resolves it server-side, then mutates by id. Capture `.drop.id` from publish; if you only kept a URL/slug, `dropthis resolve <target>` (or `--json \| jq -r .drop.id`) recovers the id. |
| 6 | **Calling `publish` again to change a drop** | `publish` always creates a NEW drop and makes a duplicate. To change something you already published, use `update-content <id>` (the files at the URL) or `update-settings <id>` (title/visibility/password/expiry/metadata) with its `drop_…` id. |
| 7 | **Handing an agent the canonical URL when it wants the bytes** | For a single non-HTML file, the canonical `url` is the branded preview (HTML page with the badge), NOT the raw file. Give the agent `rawUrl` (the natural-path bytes, e.g. `…/abc123/notes.md`) instead. The canonical `url` stays the right link for a human. |
| 8 | **Looking for a `/_raw/` URL** | There is no `/_raw/` route. Raw bytes live at the file's natural path under the drop (`rawUrl` for single-file drops; per-file links in the branded index for collections). Append `?download=1` to force a download. |

## Custom domains

Serve drops at your own hostname instead of the shared `dropthis.app` pool. Two modes: `path` (many drops at `/{slug}/`) and `dedicated` (hostname = one drop at root).

```bash
dropthis domains connect reports.example.com --mode path   # connect
# → add CNAME reports.example.com → edge.dropthis.app at your DNS provider
dropthis domains verify reports.example.com --wait         # verify (non-blocking, re-call on retry_after)
dropthis publish ./page.html --domain reports.example.com --slug my-report --url  # publish
dropthis publish ./draft.html --shared                                           # deliberate off-domain publish → shared pool
```

Once a default domain is live, a plain `dropthis publish` lands on it automatically — `--shared` is the deliberate override to put a one-off drop on the shared pool instead.

See [../../references/domains.md](../../references/domains.md) for the full runbook (dedicated mode, 409 recovery, vanity slug rules, path-safe content).

## After Setup

Once authenticated, proactively offer:

> Want me to create a page and publish it with dropthis so you can see it in action?

If yes: generate a single HTML file with content relevant to the user or their project, write it to a temp file, publish it with `dropthis publish`, and return the URL.
