# Error Codes and Exit Codes

## Exit Codes

| Exit Code | Constant | Meaning |
|-----------|----------|---------|
| 0 | -- | Success |
| 1 | `api_error`, `generic_error`, `credential_storage_unavailable` | API error or generic failure |
| 2 | `invalid_usage` | Invalid usage (bad flags, conflicting options, command-like typo guard) |
| 3 | `auth_error` | Authentication required (no API key found) |
| 4 | `local_input_error` | Local input error (file or directory not found — including the SDK's `file_not_found` on publish inputs — or too many files) |
| 5 | `network_error` | Network error (cannot reach the API; the SDK's `network_error` code maps here) |
| 6 | `verify_pending` | Domain verification pending (`domains verify` one-shot while DNS/TLS is not live yet) |
| 7 | `verify_timeout` | Domain verification timeout (`domains verify --wait` exceeded `--timeout`) |

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
| `verify_pending` | 6 | Domain verification not yet live (one-shot `domains verify`) |
| `verify_timeout` | 7 | `domains verify --wait` timed out |
| `api_error` | 1 | API returned an error |
| `generic_error` | 1 | Catch-all for unexpected failures |
| `credential_storage_unavailable` | 1 | Cannot read/write credential store |

Two SDK-side codes keep their own `error.code` in the envelope but map onto the
exit-code contract: `file_not_found` (a publish input that names a missing
file/directory) exits 4, and `network_error` (transport failure) exits 5.

## API Error Codes (from server)

These appear in the `error.code` field when the API returns an error:

| Code | HTTP Status | Next Action |
|------|-------------|-------------|
| `missing_api_key` | 401 | Authenticate with `dropthis login` or set `DROPTHIS_API_KEY` |
| `revision_conflict` | 409 | Fetch the drop, merge your changes, and retry with the current revision |
| `publish_conflict` | 409 | The drop changed state mid-publish (likely deleted); run the publish again to create a fresh drop |
| `upload_expired` | 410 | Create a new upload session and retry the publish |
| `upload_already_used` | 409 | Create a new upload session; upload sessions are single-use |
| `upload_verification_failed` | 422 | Re-upload the file bytes and complete the upload again |
| `too_many_active_uploads` | 429 | Cancel unused uploads or wait for expired uploads to be cleaned |
| `upload_not_complete` | 422 | Complete the upload session before publishing |
| `quota_exceeded` | 429 | Reduce the upload size or upgrade the account limit |
| `size_limit_exceeded` | 413 | Drop size exceeds the plan limit (5 MB Free, 100 MB Pro); reduce content size or upgrade |
| `quota_exceeded` | 413 | Account storage cap reached (500 MB Free, 10 GB Pro); delete unused drops or upgrade |
| `feature_not_in_plan` | 403 | Password protection is Pro-only; remove `--password` or upgrade (clearing with `--no-password` is always allowed) |
| `insufficient_scope` | 403 | The credential lacks the scope for a team op (a publish-only login tried to create/invite). Re-authenticate team-scoped: `dropthis login request --email <you>` then `dropthis login verify --email <you> --otp <code> --scope team` (use `--scope team-admin` for delete/role/remove) |
| `quota_exceeded` | 403 | The team workspace hit its member seat limit (seats are a quota; storage quota is `413`); upgrade the workspace plan or `dropthis members remove` an unused member |
| `workspace_pinned` | 400 | A service key tried to switch workspace; service keys cannot switch — use a delegated key |
| `workspace_choice_required` | 409 | Publish couldn't resolve a workspace; body carries `choices[]` — `dropthis workspace use <slug>` |
| `workspace_not_found` | 404 | Slug/id doesn't match an accessible workspace; `dropthis workspace list` for valid slugs |
| `workspace_mismatch` | 409 | The resource belongs to a different workspace than the key targets; `dropthis workspace use <slug>` or pass `--workspace` |
| HTTP 422 | 422 | Fix the input shown in the error detail and retry |
| HTTP 5xx | 5xx | Retry the request with the same idempotency key, or contact support with the request id |

## Examples

### Auth error (exit 3)

```json
{"ok":false,"error":{"code":"auth_error","message":"No API key found.","next_action":"Set DROPTHIS_API_KEY or run dropthis login."}}
```

### Invalid usage (exit 2)

```json
{"ok":false,"error":{"code":"invalid_usage","message":"--url and --dry-run cannot be combined."}}
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
