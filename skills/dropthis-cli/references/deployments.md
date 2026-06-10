# deployments

Deployment commands for listing and inspecting deployment history of a drop. Each time content is published or replaced via `dropthis update-content`, a new deployment is created.

## deployments

### deployments list

List deployments for a drop with pagination.

#### Usage

```bash
dropthis deployments list <dropId> [flags]
```

`<dropId>` is the full `drop_…` id (the `id` from publish `--json`), NOT the slug or URL token.

#### Flags

| Flag | Required | Description |
|------|----------|-------------|
| `--limit` `<n>` | No | Page size (integer) |
| `--cursor` `<cursor>` | No | Pagination cursor from previous response |
| `--json` | No | Force JSON output |

#### Output

```json
{"ok":true,"deployments":[{"id":"dep_xyz789","dropId":"drop_abc123","revision":2,"status":"published","createdAt":"2025-01-15T10:30:00Z"}],"nextCursor":null}
```

#### Examples

```bash
# List deployments for a drop
dropthis deployments list drop_abc123

# List with page size
dropthis deployments list drop_abc123 --limit 5

# Paginate
dropthis deployments list drop_abc123 --cursor "eyJsYXN0X2lkIjoiZGVwXzEyMyJ9"
```

---

### deployments get

Get details for a single deployment.

#### Usage

```bash
dropthis deployments get <dropId> <deploymentId> [flags]
```

`<dropId>` is the full `drop_…` id (the `id` from publish `--json`), NOT the slug or URL token.

#### Flags

| Flag | Required | Description |
|------|----------|-------------|
| `--json` | No | Force JSON output |

#### Output

```json
{"ok":true,"deployment":{"id":"dep_xyz789","dropId":"drop_abc123","revision":2,"status":"published","createdAt":"2025-01-15T10:30:00Z"}}
```

#### Examples

```bash
# Get deployment details
dropthis deployments get drop_abc123 dep_xyz789
```

## Notes

- `<dropId>` is the full `drop_…` id (the `id` from publish `--json`), NOT the slug or URL token.
- All `deployments` subcommands require authentication.
- Deployments are immutable snapshots. Each `dropthis update-content` creates a new one.
- The `revision` field is useful with `dropthis update-content --if-revision` for optimistic concurrency. On a `revision_conflict` (409) error, `error.current_revision` carries the value to retry with.
- Content read-back (REST): `GET /v1/drops/{dropId}/deployments/{deploymentId}/content` returns a JSON manifest of that deployment's files (paths, sizes, content types, entry); add `?path=<file>` to download one file's exact stored bytes with its stored content type. Works for SUPERSEDED deployments too. Owner-authenticated with your `sk_` key.
- Rollback: there is no rollback verb. Download an old deployment's files via the content read-back route and republish them with `dropthis update-content` -- that IS the rollback path.
