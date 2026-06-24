# Auth, API Keys, and Account

Authentication, API key management, and account operations.

## Auth

Accessed via `dropthis.auth`. Used for email OTP login flows and session management.

### requestEmailOtp(input)

Request a one-time password sent to the given email address.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `input.email` | `string` | Yes | Email address to send OTP to |

**Returns:** `DropthisResult<EmailOtpResponse>`

`EmailOtpResponse`: `{ ok: true; expiresIn: number; nextAction?: Action | null }`

**Example:**

```typescript
const { data, error } = await dropthis.auth.requestEmailOtp({
  email: "user@example.com",
});
if (!error) console.log("OTP sent, expires in", data.expiresIn, "seconds");
```

### verifyEmailOtp(input)

Verify the OTP code and receive a session token.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `input.email` | `string` | Yes | Email address |
| `input.code` | `string` | Yes | OTP code received via email |

**Returns:** `DropthisResult<SessionResponse>`

`SessionResponse`: `{ object: "session"; token: string; accountId: string; isNewAccount: boolean; expiresIn: number }`

**Example:**

```typescript
const { data, error } = await dropthis.auth.verifyEmailOtp({
  email: "user@example.com",
  code: "123456",
});
if (!error) console.log("Session token:", data.token);
```

**Verify errors.** On a failed verify the `error.code` distinguishes:
- `otp_expired` — no active code (the 5-minute code lapsed or was already used). Safe to call `requestEmailOtp` again automatically and prompt for the fresh code.
- `otp_invalid` — the code is wrong. Ask the user to re-check and retype; do **not** auto-resend (that would email on every wrong digit).
Both are HTTP 401. A burst of attempts returns `rate_limit_exceeded` (429).

### logout()

Destroy the current session. The server replies 204 No Content.

**Returns:** `DropthisResult<null>`

**Example:**

```typescript
const { error } = await dropthis.auth.logout();
```

## API Keys

Accessed via `dropthis.apiKeys`. Manage API keys for programmatic access.

### list()

List all API keys for the authenticated account.

**Returns:** `DropthisResult<{ object: "list"; data: ApiKeyResponse[] }>`

`ApiKeyResponse`: `{ object: "api_key"; id: string; keyLast4: string; label: string; createdAt: string }`

**Example:**

```typescript
const { data, error } = await dropthis.apiKeys.list();
if (!error) {
  for (const key of data.data) {
    console.log(key.id, key.label, key.keyLast4);
  }
}
```

### create(input)

Create a new API key. The full key is only returned once in the response.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `input.label` | `string` | Yes | Human-readable label for the key |
| `input.type` | `KeyType` | No | `"delegated"` (default, switchable active workspace) or `"service"` (pinned to one workspace, CI) |
| `input.workspace` | `string` | No | Pin a `service` key to this workspace slug or id (required for `service`) |
| `input.allowedWorkspaces` | `string[]` | No | Restrict a `delegated` key to these workspace slugs or ids |
| `input.scopes` | `string[]` | No | Capability scopes (ADR 0068). Bundle names (`publish`, `team`, `team-admin`, `service`) or fine-grained scopes (`members:admin`). Downscope-only: granted = requested ∩ your own scopes. Omit for the default `publish` bundle; pass `["team"]` to mint a credential that can create + manage teams |

**Returns:** `DropthisResult<ApiKeyCreatedResponse>`

`ApiKeyCreatedResponse` extends `ApiKeyResponse` with: `{ key: string; accountId?: string | null; isNewAccount?: boolean }`. `ApiKeyResponse.scopes` carries the scopes actually granted to this key.

**Example:**

```typescript
const { data, error } = await dropthis.apiKeys.create({ label: "CI" });
if (!error) {
  console.log("New key:", data.key); // Only shown once!
  console.log("Key ID:", data.id);
}

// Mint a team-capable credential (downscoped to your own scopes)
await dropthis.apiKeys.create({ label: "team agent", scopes: ["team"] });

// Pin a service key to one workspace for CI
await dropthis.apiKeys.create({ label: "CI deploy", type: "service", workspace: "prod-team" });
```

### delete(keyId)

Delete an API key. The server replies 204 No Content (every DELETE in the API returns 204).

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `keyId` | `string` | Yes | API key ID to delete |

**Returns:** `DropthisResult<null>`

**Example:**

```typescript
const { error } = await dropthis.apiKeys.delete("key_abc123");
```

## Account

Accessed via `dropthis.account`. Manage the authenticated account.

### get()

Get the current account details, including the active plan-tier limits.

**Returns:** `DropthisResult<AccountResponse>`

`AccountResponse`: `{ id: string; email: string; displayName: string | null; plan: string; status: string; createdAt: string; entitlements: Entitlements; usage: AccountUsage; workspace: AccountWorkspace; upgradeUrl: string | null }`

The account acts within a workspace; `workspace` identifies the workspace this key is bound to. The
key's scopes are on the API-key response (`ApiKeyResponse.scopes`), NOT on the account.

`entitlements` carries the active plan's capability matrix + numeric limits (use the limits to size
a publish before uploading): `entitlements.limits` = `{ maxSizeBytes; maxStorageBytes: number | null;
defaultTtlSeconds: number | null; maxCustomHostnames; seatLimit; maxActiveUploadSessions }`
— `maxSizeBytes` is the per-drop size cap; `defaultTtlSeconds` is the drop lifetime before expiry
(`null` = permanent); `maxStorageBytes` is the workspace storage cap (`null` = no cap);
`maxCustomHostnames` is the custom hostname cap (0 on Free, 1 on Pro); `seatLimit` is the team member
cap. `usage` = `{ storageUsedBytes; customDomainsUsed; seatsUsed }`. See
[types.md](references/types.md) for the full shape.

`AccountWorkspace`: `{ id: string; name: string; slug: string; kind: string; role: string }`
— `kind` is `"personal"` for a solo workspace or `"team"` when shared with other members; `role` is your role in it (`"owner"`, `"admin"`, or `"member"`). A key minted in a team workspace publishes to the team's shared custom domain automatically.

**Example:**

```typescript
const { data, error } = await dropthis.account.get();
if (!error) console.log(data.email, data.plan, data.limits.maxSizeBytes);
```

### update(input)

Update account settings.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `input.displayName` | `string \| null` | Yes | New display name, or `null` to clear |

**Returns:** `DropthisResult<AccountResponse>`

**Example:**

```typescript
const { data, error } = await dropthis.account.update({
  displayName: "Jane Doe",
});
```

### delete()

Permanently delete the account. The server replies 204 No Content.

**Returns:** `DropthisResult<null>`

**Example:**

```typescript
const { error } = await dropthis.account.delete();
if (error) console.error("Delete failed:", error.message);
```

## Notes

- `auth.requestEmailOtp()` and `auth.verifyEmailOtp()` do **not** require authentication (no API key needed).
- `auth.logout()`, all `apiKeys.*` methods, and all `account.*` methods require authentication.
- The full API key string is only returned from `apiKeys.create()`. Store it securely -- it cannot be retrieved again.
