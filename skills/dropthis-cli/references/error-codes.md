# Error Codes and Exit Codes

## Exit Codes

| Exit Code | Constant | Meaning |
|-----------|----------|---------|
| 0 | -- | Success |
| 1 | `api_error`, `generic_error`, `credential_storage_unavailable` | API error or generic failure |
| 2 | `invalid_usage` | Invalid usage (bad flags, conflicting options) |
| 3 | `auth_error` | Authentication required (no API key found) |
| 4 | `local_input_error` | Local input error (file not found, too many files, etc.) |
| 5 | `network_error` | Network error (cannot reach API) |

## Error Output Format

All errors are written to stderr as a single-line JSON object:

```json
{"ok":false,"error":{"code":"<error_code>","message":"<human-readable message>","next_action":"<suggested fix>"}}
```

### Fields

| Field | Type | Description |
|-------|------|-------------|
| `ok` | `false` | Always false for errors |
| `error.code` | string | Machine-readable error code |
| `error.message` | string | Human-readable error message |
| `error.next_action` | string | Suggested action to resolve the error |

### Additional fields for API errors

| Field | Type | Description |
|-------|------|-------------|
| `error.status` | number | HTTP status code from API |
| `error.detail` | string | Detailed error message from API |
| `error.param` | string | Which parameter caused the error |
| `error.current_revision` | number | Current revision (for revision_conflict errors) |
| `error.request_id` | string | API request ID for support |

## CLI Error Codes

| Code | Exit Code | Description |
|------|-----------|-------------|
| `auth_error` | 3 | No API key found |
| `invalid_usage` | 2 | Bad flags or conflicting options |
| `local_input_error` | 4 | File not found, directory error, file count exceeded |
| `network_error` | 5 | Cannot reach the API |
| `api_error` | 1 | API returned an error |
| `generic_error` | 1 | Catch-all for unexpected failures |
| `credential_storage_unavailable` | 1 | Cannot read/write credential store |

## API Error Codes (from server)

These appear in the `error.code` field when the API returns an error:

| Code | HTTP Status | Next Action |
|------|-------------|-------------|
| `missing_api_key` | 401 | Authenticate with `dropthis login` or set `DROPTHIS_API_KEY` |
| `revision_conflict` | 409 | Fetch the drop, merge your changes, and retry with the current revision |
| `upload_expired` | 410 | Create a new upload session and retry the publish |
| `upload_already_used` | 409 | Create a new upload session; upload sessions are single-use |
| `upload_verification_failed` | 422 | Re-upload the file bytes and complete the upload again |
| `too_many_active_uploads` | 429 | Cancel unused uploads or wait for expired uploads to be cleaned |
| `upload_not_complete` | 422 | Complete the upload session before publishing |
| `quota_exceeded` | 429 | Reduce the upload size or upgrade the account limit |
| `size_limit_exceeded` | 413 | Drop size exceeds the plan limit; reduce content size or upgrade to Pro |
| `storage_limit_exceeded` | 413 | Account storage cap reached; delete unused drops or upgrade to Pro |
| HTTP 422 | 422 | Fix the input shown in the error detail and retry |
| HTTP 5xx | 5xx | Retry the request with the same idempotency key, or contact support with the request id |

## Examples

### Auth error (exit 3)

```json
{"ok":false,"error":{"code":"auth_error","message":"No API key found.","next_action":"Set DROPTHIS_API_KEY or run dropthis login."}}
```

### Invalid usage (exit 2)

```json
{"ok":false,"error":{"code":"invalid_usage","message":"Use either <input> or --from-json, not both."}}
```

### Local input error (exit 4)

```json
{"ok":false,"error":{"code":"local_input_error","message":"File not found: ./missing.html"}}
```

### API error -- revision conflict (exit 1)

```json
{"ok":false,"error":{"code":"revision_conflict","message":"Revision mismatch","status":409,"current_revision":3,"next_action":"Fetch the drop, merge your changes, and retry with the current revision."}}
```

## Notes

- Errors are always written to stderr as single-line JSON.
- Success output goes to stdout.
- The `next_action` field provides actionable guidance for agents -- always use it to decide what to do next.
- For `revision_conflict`, the `current_revision` field tells you what revision to use in `--if-revision` on retry.
