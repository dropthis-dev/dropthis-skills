# deployments

Deployment commands for listing and inspecting deployment history of a drop. Each time content is published or updated via `dropthis drops update`, a new deployment is created.

## deployments

### deployments list

List deployments for a drop with pagination.

#### Usage

```bash
dropthis deployments list <dropId> [flags]
```

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

- All `deployments` subcommands require authentication.
- Deployments are immutable snapshots. Each `dropthis drops update` with content creates a new one.
- The `revision` field is useful with `dropthis drops update --if-revision` for optimistic concurrency.
