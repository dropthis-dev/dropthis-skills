# Error Handling

All SDK methods return `DropthisResult<T>` -- a discriminated union. Errors never throw; they are
always returned in the `error` field.

## Pattern

```typescript
const { data, error, headers } = await dropthis.drops.publish("<h1>Hello</h1>");

if (error) {
  console.error(error.code, error.message);
  console.error("Status:", error.statusCode);
  console.error("Request ID:", error.requestId);
  return;
}

// data is guaranteed non-null here
console.log(data.url);
```

## DropthisErrorResponse fields

| Field | Type | Description |
|-------|------|-------------|
| `code` | `string` | Machine-readable error code (e.g. `"missing_api_key"`, `"http_404"`) |
| `message` | `string` | Human-readable error message |
| `statusCode` | `number \| null` | HTTP status code, or `null` for client-side errors |
| `type` | `string \| undefined` | problem+json type URI |
| `title` | `string \| undefined` | problem+json title |
| `detail` | `string \| null \| undefined` | problem+json detail string |
| `instance` | `string \| null \| undefined` | problem+json instance URI |
| `param` | `string \| null \| undefined` | Which parameter caused the error |
| `currentRevision` | `number \| undefined` | Server's current revision (for concurrency conflicts) |
| `requestId` | `string \| null \| undefined` | Server request ID for support |
| `suggestion` | `string \| null \| undefined` | Server-provided suggestion for resolving the error |
| `retryable` | `boolean \| null \| undefined` | Whether the operation can be safely retried |
| `body` | `unknown` | Raw response body from the server |

## Common error codes

| Code | Status | Cause |
|------|--------|-------|
| `missing_api_key` | `null` | No API key provided and `DROPTHIS_API_KEY` env var not set |
| `timeout` | `null` | Request exceeded `timeoutMs` |
| `network_error` | `null` | DNS failure, connection refused, or other network issue |
| `http_400` | `400` | Invalid request body |
| `http_401` | `401` | Invalid or expired API key |
| `http_403` | `403` | Insufficient permissions (notably `feature_not_in_plan`: setting a drop password is Pro-only — Free returns 403 with `upgrade_url`; clearing with `null` is always allowed) |
| `http_404` | `404` | Resource not found |
| `http_409` | `409` | Revision conflict -- use `error.currentRevision` to retry |
| `http_413` | `413` | Drop size exceeds plan limit (5 MB Free, 100 MB Pro) or the account storage cap (500 MB Free, 10 GB Pro) |
| `http_429` | `429` | Rate limited |
| `upload_target_missing` | `null` | Server did not return an upload target for a file |
| `unsupported_upload_strategy` | `null` | Server returned a non-`single_put` strategy (the SDK uploads via single PUT only) |
| `signed_upload_*` | varies | Presigned URL upload (PUT) failed; the suffix is the HTTP status |

## Workspace & capability-scope error codes

For workspace/team operations the server `code` rides on `error.code` (with the matching
`http_*` status). See [../../references/workspaces.md](../../references/workspaces.md) for the full
runbook.

| Code | Status | Cause / fix |
|------|--------|-------------|
| `insufficient_scope` | `403` | The key lacks the scope for a team op (a publish-only key tried to create/invite). Mint a team-scoped key: `client.apiKeys.create({ scopes: ["team"] })`, or re-login `--scope team` |
| `quota_exceeded` | `413`/`403` | Account storage cap (`413`) or team seat cap (`403`) reached; delete unused drops, `client.members.remove(...)` a member, or upgrade |
| `workspace_pinned` | `400` | A service key tried to switch workspace; service keys cannot switch — use a delegated key |
| `workspace_choice_required` | `409` | Publish couldn't resolve a workspace; body carries `choices[]` — call `client.workspaces.use(slug)` |
| `workspace_not_found` | `404` | Slug/id doesn't match an accessible workspace; `client.workspaces.list()` for valid slugs |
| `workspace_mismatch` | `409` | The resource belongs to a different workspace than the key targets; `client.workspaces.use(slug)` or pass `workspace` per call |

## Optimistic concurrency

Use `ifRevision` to prevent overwriting concurrent changes:

```typescript
const { data } = await dropthis.drops.get("drop_abc123");
const { error } = await dropthis.drops.updateSettings("drop_abc123", {
  title: "Updated",
  ifRevision: data.revision,
});

if (error?.code === "http_409") {
  console.log("Conflict! Server revision:", error.currentRevision);
  // Re-fetch and retry
}
```

## Idempotency

Pass `idempotencyKey` for safe retries of create/publish operations:

```typescript
const { data, error } = await dropthis.drops.publish("<h1>Hello</h1>", {
  idempotencyKey: "my-unique-key-123",
});
// Safe to retry with the same key -- will return the same result
```

## Helper utilities

The SDK exports two helper functions for advanced use:

**`createErrorResult(code, message, statusCode, extra?)`** -- Factory function for creating error results. Exported for SDK extension use.

```typescript
import { createErrorResult } from "@dropthis/node";

const result = createErrorResult("custom_error", "Something went wrong", null);
```

**`redactSecrets(message)`** -- Redacts API keys (strings matching `sk_*`) from error messages. Exported for logging use.

```typescript
import { redactSecrets } from "@dropthis/node";

console.log(redactSecrets("Key sk_abc123 failed")); // "Key sk_[redacted] failed"
```
