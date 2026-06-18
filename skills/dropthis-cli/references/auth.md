# Authentication Commands

Commands for managing authentication: login, logout, whoami, api-keys, account, and doctor.

## Auth Resolution Order

Credentials are resolved in this order:
1. `--api-key sk_...` flag on the command
2. `DROPTHIS_API_KEY` environment variable
3. Stored credential from `dropthis login`

### Inline auth on publish

If you run `dropthis publish` (or the `dropthis ./file` shorthand) without credentials in an interactive terminal, the CLI prompts for email OTP login inline — no separate `dropthis login` step needed. Use `--no-interactive` to disable this behavior.

---

## login

Authenticate with email OTP. In interactive mode (TTY), prompts for email and code with up to 3 OTP attempts (codes must be 4-8 characters). In non-interactive mode, use the two-step `request` + `verify` subcommands.

### Usage

```bash
# Interactive (TTY)
dropthis login

# Non-interactive (two-step)
dropthis login --email <email> --otp <code>

# Step 1: Request OTP
dropthis login request --email <email>

# Step 2: Verify OTP
dropthis login verify --email <email> --otp <code>
```

### Flags

#### login (top-level)

| Flag | Required | Description |
|------|----------|-------------|
| `--email` `<email>` | No* | Email address (required for non-interactive) |
| `--otp` `<otp>` | No* | One-time passcode (required for non-interactive) |
| `--json` | No | Force JSON output |

*When both `--email` and `--otp` are provided, login runs non-interactively (equivalent to `login verify`).

#### login request

| Flag | Required | Description |
|------|----------|-------------|
| `--email` `<email>` | Yes | Email address to send OTP to |
| `--json` | No | Force JSON output |

#### login verify

| Flag | Required | Description |
|------|----------|-------------|
| `--email` `<email>` | Yes | Email address |
| `--otp` `<otp>` | Yes | One-time passcode from email |
| `--json` | No | Force JSON output |

### Output

#### login request

```json
{"ok":true,"email":"user@example.com","expires_in":300}
```

#### login verify

```json
{"ok":true,"account_id":"acc_abc123","key_id":"key_xyz","key_last4":"ab12","is_new_account":false}
```

### Examples

```bash
# Interactive login (humans)
dropthis login

# Non-interactive login (agents) -- step 1
dropthis login request --email user@example.com

# Non-interactive login (agents) -- step 2
dropthis login verify --email user@example.com --otp 123456

# One-shot non-interactive login
dropthis login --email user@example.com --otp 123456
```

---

## logout

Remove stored credentials. Optionally revokes the saved API key on the server.

### Usage

```bash
dropthis logout [flags]
```

### Flags

| Flag | Required | Description |
|------|----------|-------------|
| `--revoke` | No | Best-effort revoke the saved API key on the server |
| `--json` | No | Force JSON output |

### Output

```json
{"ok":true}
```

### Examples

```bash
# Remove local credentials
dropthis logout

# Remove and revoke the key on the server
dropthis logout --revoke
```

---

## whoami

Show current authentication status. Always exits 0 (even when not authenticated).

### Usage

```bash
dropthis whoami [flags]
```

### Flags

| Flag | Required | Description |
|------|----------|-------------|
| `--json` | No | Force JSON output |

### Output (authenticated)

```json
{"ok":true,"authenticated":true,"source":"env","masked_key":"sk_...ab12","key_id":"key_xyz","key_last4":"ab12","account_id":"acc_abc123","email":"user@example.com"}
```

### Output (not authenticated)

```json
{"ok":true,"authenticated":false}
```

The `source` field indicates where the credential came from: `"env"` (environment variable), `"flag"` (--api-key), or `"storage"` (from login).

### Examples

```bash
# Check auth status
dropthis whoami

# Check auth as JSON
dropthis whoami --json
```

---

## api-keys

Manage API keys.

### api-keys create

```bash
dropthis api-keys create [flags]
```

| Flag | Required | Description |
|------|----------|-------------|
| `--label` `<label>` | No | API key label (default: "CLI") |
| `--json` | No | Force JSON output |

#### Output

```json
{"ok":true,"api_key":{"id":"key_xyz","key":"sk_live_...","keyLast4":"ab12"}}
```

### api-keys list

```bash
dropthis api-keys list [flags]
```

| Flag | Required | Description |
|------|----------|-------------|
| `--json` | No | Force JSON output |

#### Output

```json
{"ok":true,"api_keys":[{"id":"key_xyz","label":"CLI","keyLast4":"ab12"}]}
```

### api-keys delete

```bash
dropthis api-keys delete <keyId> [flags]
```

| Flag | Required | Description |
|------|----------|-------------|
| `--yes` | No* | Confirm deletion (required in non-interactive mode) |
| `--json` | No | Force JSON output |

*In non-interactive mode, `--yes` is required.

#### Output

```json
{"ok":true,"deleted":true,"id":"key_xyz"}
```

---

## account

Show account details (`dropthis account`), or update your display name with the `account update` subcommand.

### Usage

```bash
dropthis account [flags]
```

### Flags

| Flag | Required | Description |
|------|----------|-------------|
| `--json` | No | Force JSON output |

### Output

```json
{"ok":true,"account":{"id":"acc_abc123","email":"user@example.com","displayName":null,"plan":"free","status":"active","createdAt":"2026-05-23T12:00:00Z","limits":{"name":"free","maxSizeBytes":5242880,"defaultTtlSeconds":604800,"maxStorageBytes":524288000,"maxCustomHostnames":0}}}
```

The `limits` block carries the active plan-tier limits — use them to size a publish before
uploading: `maxSizeBytes` is the per-drop size cap; `defaultTtlSeconds` is the drop lifetime
before expiry (`null` = drops are permanent); `maxStorageBytes` is the account-wide storage
cap; `maxCustomHostnames` is the custom hostname cap (0 on Free, 1 on Pro). The account also
acts within a workspace; the `workspace` block (`id`, `name`, `slug`, `kind`, `role`) in the
account response identifies the workspace this key is bound to.

### Examples

```bash
# Show account details
dropthis account

# Machine-readable account info
dropthis account --json
```

### account update

Update your account display name.

```bash
dropthis account update --display-name "New Name"
```

| Flag | Required | Description |
|------|----------|-------------|
| `--display-name` | Yes | New display name |

---

## doctor

Report CLI diagnostics including version, auth source, and storage backend.

### Usage

```bash
dropthis doctor [flags]
```

### Flags

| Flag | Required | Description |
|------|----------|-------------|
| `--json` | No | Force JSON output |

### Output

```json
{"ok":true,"version":"0.4.1","auth":{"source":"env"},"storage":{"backend":"secure"}}
```

The `auth.source` field will be `"env"`, `"flag"`, `"storage"`, or `"missing"`. The `storage.backend` field will be `"secure"`, `"insecure"`, or `"none"`.

### Examples

```bash
# Check CLI health
dropthis doctor
```

## Notes

- `whoami` always exits 0, even when not authenticated. Check the `authenticated` field.
- For agents: always use `DROPTHIS_API_KEY` env var or `--api-key` flag instead of interactive login.
- The two-step `login request` / `login verify` flow is designed for agents that need to help a user authenticate.

**Verify errors.** `login verify` surfaces the server's message: `otp_expired` ("Your code has expired" — request a new code, e.g. re-run `login request`) vs `otp_invalid` ("That code is incorrect" — re-check the digits). Both exit non-zero with the message on stderr; the JSON envelope carries the `code`.
