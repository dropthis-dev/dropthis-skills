# Deployments

Deployment history for a drop. Each time the content is updated, a new deployment is created.
The `dropthis.deployments` resource is **read-only** -- it lists and fetches deployment history.

To publish a NEW content version, call `dropthis.drops.updateContent(dropId, input, options)`.
`updateContent()` is **content-only** — it ships a new content version and never changes drop settings.
To update settings only, call `dropthis.drops.updateSettings(dropId, patch)` (settings-only; never content).

## Methods

### list(dropId, params?)

List deployments for a drop, newest first.

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

## Creating a new deployment (update the content)

`dropthis.deployments` does not create deployments. To publish a new content version to an
existing drop -- keeping its URL and slug -- call `dropthis.drops.updateContent(dropId, input, options)`.
It accepts the same `PublishInput` as `dropthis.drops.publish()` and handles the full staged upload
flow automatically. `updateContent()` is **content-only**: its `options` are `DeployOptions`
(content-prep fields + `entry` + `idempotencyKey`/`ifRevision` only) — it carries no drop
settings. Settings (title, visibility, password, noindex, slug, expiry, metadata) are managed
separately via `dropthis.drops.updateSettings()`.

```typescript
const { data, error } = await dropthis.drops.updateContent(
  "drop_abc123",
  "<h1>v2</h1>",
  { ifRevision: 1 },
);
if (!error) {
  console.log(data.url, data.revision);
}
```

To change settings (title, visibility, password, noindex, slug, expiry, metadata) WITHOUT
changing content, use `dropthis.drops.updateSettings("drop_abc123", { title: "New title" })` -- it is
settings-only and never creates a content deployment.

## Notes

- Deployments are immutable once created. You cannot update or delete individual deployments.
- `dropthis.deployments.list/get` are read-only. Use `dropthis.drops.updateContent(dropId, input, options)` to create a new content version.
- The `ListDeploymentsResponse` does not use `CursorPage`. Pagination must be handled manually using `nextCursor`.
