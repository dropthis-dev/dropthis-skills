---
name: dropthis-cli
description: >
  Publish anything online from the terminal — HTML files, directories, or generated
  content — and get a permanent URL back. One command in, one URL out. Use when the
  user wants to publish, update, or manage drops via the `dropthis` CLI, or when an
  AI agent generates content that should be viewable at a URL. Always load this skill
  before running `dropthis` commands — it contains the non-interactive flag contract
  and auth resolution order.
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
| 4 | Local input error (file not found, etc.) |
| 5 | Network error |

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

| Command | What it does |
|---------|-------------|
| `<input>` | Publish content, get a URL (default command) |
| `publish <input>` | Same as above, explicit form |
| `drops list` | List your drops |
| `drops get <id>` | Get drop details |
| `drops update <id> [input]` | Update content, metadata, or both |
| `drops delete <id>` | Delete a drop |
| `deployments list <drop-id>` | List deployments |
| `deployments get <drop-id> <dep-id>` | Get deployment details |
| `login` | Authenticate with email OTP |
| `logout` | Remove stored credentials |
| `whoami` | Show current auth status |
| `account` | Account details |
| `api-keys create` | Create an API key |
| `api-keys list` | List API keys |
| `api-keys delete <id>` | Delete an API key |
| `doctor` | Report CLI diagnostics |
| `commands` | Print machine-readable command metadata |

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

> Capture the drop **id** from publish output for later edits: `ID=$(dropthis ./page.html --json | jq -r '.drop.id')` — then `dropthis drops update "$ID" ...` / `dropthis deployments list "$ID"`. Follow-up commands need the `drop_…` id, not the slug.

### Publish Options

| Flag | Description |
|------|-------------|
| `--title <title>` | Drop title |
| `--visibility <public\|unlisted>` | Drop visibility |
| `--password <password>` | Set password protection |
| `--noindex` | Prevent search engine indexing |
| `--entry <path>` | Entry file for directories |
| `--content-type <mime>` | Content type (recommended for stdin; auto-detected if omitted) |
| `--path <path>` | File path for stdin or byte input |
| `--expires-at <datetime>` | Expiration datetime |
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

**Update existing content:**
```bash
dropthis drops update drop_abc123 ./dist-v2 --url
```

**Password-protected drop:**
```bash
dropthis ./report.html --password s3cret --url
```

## Common Mistakes

| # | Mistake | Fix |
|---|---------|-----|
| 1 | **Forgetting `--url` or `--json`** | Without either flag, the CLI prints human-friendly output that's hard to parse. Always use `--url` for agents. |
| 2 | **Not checking exit code 3** | Exit 3 means auth required. Run `dropthis whoami` first, then prompt for login if needed. |
| 3 | **Assuming URLs aren't supported** | A bare `http(s)` URL IS a valid input: `dropthis https://example.com/page.html --url` publishes a server-fetched copy (source_url flow). Pass the URL directly -- do NOT fetch it yourself first. |
| 4 | **Relying on stdin auto-detection** | When piping content via stdin (`-`), set `--content-type` and `--path` explicitly for deterministic output. Without them the SDK auto-detects content type and entry filename. |
| 5 | **Using the slug/URL token as the drop id** | `drops get/update/delete` and `deployments list/get` take the full `drop_…` id (the `id` field in publish `--json` output), NOT the slug or URL token. Capture `.drop.id` from publish; if you only have the slug, run `dropthis drops list --json` to find the id. |

## After Setup

Once authenticated, proactively offer:

> Want me to create a page and publish it with dropthis so you can see it in action?

If yes: generate a single HTML file with content relevant to the user or their project, write it to a temp file, publish it with `dropthis publish`, and return the URL.
