# Deployments

Deployment history for a drop. Each time content is updated, a new deployment is created.
Accessed via `dropthis.deployments`.

## Methods

### create(dropId, body, options?)

Create a new deployment for an existing drop (low-level). Keys are automatically converted to snake_case.
Most users should use `dropthis.update(dropId, newContent)` instead.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `dropId` | `string` | Yes | Drop ID |
| `body` | `Record<string, unknown>` | Yes | Deployment body (camelCase keys auto-converted to snake_case) |
| `options.idempotencyKey` | `string` | No | Idempotency key for safe retries |
| `options.ifRevision` | `number` | No | Optimistic concurrency revision |

**Returns:** `DropthisResult<DropResponse>`

**Example:**

```typescript
const { data, error } = await dropthis.deployments.create("drop_abc123", {
  uploadId: "upl_xyz789",
  options: { title: "v2" },
}, { ifRevision: 1 });
```

### createRaw(dropId, body, options?)

Create a new deployment using a raw request body without snake_case conversion.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `dropId` | `string` | Yes | Drop ID |
| `body` | `unknown` | Yes | Request body (sent as-is) |
| `options.idempotencyKey` | `string` | No | Idempotency key |
| `options.ifRevision` | `number` | No | Optimistic concurrency revision |

**Returns:** `DropthisResult<DropResponse>`

### list(dropId, params?)

List deployments for a drop.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `dropId` | `string` | Yes | Drop ID |
| `params.cursor` | `string \| null` | No | Pagination cursor |
| `params.limit` | `number` | No | Number of results per page |

**Returns:** `DropthisResult<ListDeploymentsResponse>`

The response contains:
- `deployments` -- array of `DropDeploymentResponse`
- `nextCursor` -- cursor for next page, or `null`

**Example:**

```typescript
const { data, error } = await dropthis.deployments.list("drop_abc123", {
  limit: 10,
});
if (!error) {
  for (const dep of data.deployments) {
    console.log(dep.id, dep.status, dep.createdAt);
  }
}
```

### get(dropId, deploymentId)

Get a specific deployment.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `dropId` | `string` | Yes | Drop ID |
| `deploymentId` | `string` | Yes | Deployment ID |

**Returns:** `DropthisResult<DropDeploymentResponse>`

**Example:**

```typescript
const { data, error } = await dropthis.deployments.get(
  "drop_abc123",
  "dep_xyz789",
);
if (!error) {
  console.log(data.status, data.sizeBytes, data.files);
}
```

## Notes

- Deployments are immutable once created. You cannot update or delete individual deployments.
- `deployments.create()` and `deployments.createRaw()` are low-level. Prefer `dropthis.update(dropId, newContent)` which handles the full staged upload flow.
- The `ListDeploymentsResponse` does not use `CursorPage`. Pagination must be handled manually using `nextCursor`.
