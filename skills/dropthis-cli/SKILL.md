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
| `publish <input>` | Publish content, get a URL |
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

```bash
# Single file
dropthis publish ./page.html --url

# Directory (static site)
dropthis publish ./dist --url

# Multiple files
dropthis publish index.html styles.css app.js --url

# Stdin
echo "<h1>Hello</h1>" | dropthis publish - --content-type text/html --path index.html --url
```

### Publish Options

| Flag | Description |
|------|-------------|
| `--title <title>` | Drop title |
| `--visibility <public\|unlisted>` | Drop visibility |
| `--password <password>` | Set password protection |
| `--no-password` | Clear password |
| `--noindex` | Prevent search engine indexing |
| `--index` | Allow indexing |
| `--entry <path>` | Entry file for directories |
| `--content-type <mime>` | Content type (required for stdin) |
| `--path <path>` | File path for stdin or byte input |
| `--expires-at <datetime>` | Expiration datetime |
| `--metadata <json>` | Metadata as JSON string |
| `--metadata-file <path>` | Metadata from a JSON file |
| `--idempotency-key <key>` | Idempotency key |
| `--from-json <path>` | Read exact POST /drops JSON request body from file |
| `--url` | Print only the URL |
| `--json` | Print full JSON response |
| `--dry-run` | Validate without publishing |

## Common Patterns

**Agent generates HTML and publishes it:**
```bash
# Write generated content to temp file, publish, return URL
dropthis publish /tmp/generated-page.html --url --title "Generated Report"
```

**Publish a built site:**
```bash
dropthis publish ./dist --url --title "Preview Deploy"
```

**Update existing content:**
```bash
dropthis drops update drop_abc123 ./dist-v2 --url
```

**Password-protected drop:**
```bash
dropthis publish ./report.html --password s3cret --url
```

## Common Mistakes

| # | Mistake | Fix |
|---|---------|-----|
| 1 | **Forgetting `--url` or `--json`** | Without either flag, the CLI prints human-friendly output that's hard to parse. Always use `--url` for agents. |
| 2 | **Not checking exit code 3** | Exit 3 means auth required. Run `dropthis whoami` first, then prompt for login if needed. |
| 3 | **Passing a URL as input** | URL inputs are not supported. Fetch the content first, save to a file, then publish the file. |
| 4 | **Missing `--content-type` with stdin** | When piping content via stdin (`-`), `--content-type` and `--path` are required. |

## After Setup

Once authenticated, proactively offer:

> Want me to create a page and publish it with dropthis so you can see it in action?

If yes: generate a single HTML file with content relevant to the user or their project, write it to a temp file, publish it with `dropthis publish`, and return the URL.
