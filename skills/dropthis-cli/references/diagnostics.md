# diagnostics

Diagnostic and introspection commands for verifying CLI health and discovering available commands.

## doctor

Report CLI diagnostics: version, auth source, and credential storage backend.

### Usage

```bash
dropthis doctor [flags]
```

### Flags

| Flag | Required | Description |
|------|----------|-------------|
| `--json` | No | Force JSON output |

### Output

#### Human-friendly (TTY without `--json`)

Key-value pairs printed one per line:

```
Version  0.2.4
Auth     env
Storage  keyring
```

The `Auth` field shows where the current credential was resolved from:
- `env` -- from `DROPTHIS_API_KEY` environment variable
- `flag` -- from `--api-key` flag
- `stored` -- from `dropthis login` credential
- `missing` -- no credential found

The `Storage` field shows the credential storage backend:
- `keyring` -- OS keychain (macOS Keychain, Windows Credential Manager, etc.)
- `file` -- file-based fallback (`~/.config/dropthis/`)
- `none` -- no stored credential

#### JSON output

```json
{
  "ok": true,
  "version": "0.2.4",
  "auth": { "source": "env" },
  "storage": { "backend": "keyring" }
}
```

### Examples

```bash
# Quick health check
dropthis doctor

# Machine-readable diagnostics
dropthis doctor --json
```

---

## commands

Print machine-readable command metadata. Always outputs JSON (regardless of TTY).

### Usage

```bash
dropthis commands [flags]
```

### Flags

| Flag | Required | Description |
|------|----------|-------------|
| `--json` | No | Force JSON output (default behavior) |

### Output

A single JSON object with the full command tree:

```json
{
  "ok": true,
  "output": "JSON by default in CI, pipes, non-TTY, --json, or --quiet.",
  "commands": [
    {
      "name": "publish",
      "description": "Publish an input and return a Dropthis URL.",
      "arguments": ["input"],
      "options": ["--json", "--url", "--dry-run", "--title", "--metadata"],
      "examples": [
        "dropthis publish ./site --json",
        "dropthis publish ./site --url",
        "dropthis publish ./dist --dry-run"
      ]
    }
  ]
}
```

Each command entry contains:

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Command name (may include subcommand path, e.g. `"deployments list <dropId>"`) |
| `description` | string | Human-readable description |
| `arguments` | string[] | Positional argument names (optional) |
| `options` | string[] | Available flags (optional, subset of most-used flags) |
| `auth` | string | Auth requirement, e.g. `"required"` (optional) |
| `examples` | string[] | Example invocations |

### Examples

```bash
# Discover all available commands
dropthis commands

# Parse command metadata in a script
dropthis commands --json | jq '.commands[].name'
```

### Notes

- Output is always JSON, even without `--json`.
- The `options` arrays are curated subsets of the most important flags, not exhaustive lists. Refer to individual command references for complete flag documentation.
- Use this command for agent self-discovery: parse the output to determine which commands and flags are available.
