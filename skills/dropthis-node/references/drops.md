# Drops

Read and manage existing drops. Accessed via `dropthis.drops` — `list`, `get`, `update`, `delete`.

This resource does **not** create drops. To publish a NEW drop, call `dropthis.publish(input, options)`.
To redeploy new content to an existing drop, call `dropthis.deploy(dropId, input, options)`. See
[publish.md](publish.md).

## Methods

### list(params?)

List drops with cursor-based pagination.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `params.cursor` | `string \| null` | No | Pagination cursor from a previous response |
| `params.limit` | `number` | No | Number of drops per page |

**Returns:** `DropthisResult<CursorPage<DropResponse>>`

The returned `CursorPage` supports auto-pagination:

```typescript
const page = await dropthis.drops.list({ limit: 20 });
if (page.error) throw new Error(page.error.message);

// Collect all into an array (with safety limit)
const all = await page.data.autoPagingToArray({ limit: 100 });

// Or async iterate
for await (const drop of page.data) {
  console.log(drop.id, drop.url);
}
```

### get(dropId)

Get a single drop by ID.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `dropId` | `string` | Yes | Drop ID (e.g. `"drop_abc123"`) |

**Returns:** `DropthisResult<DropResponse>`

**Example:**

```typescript
const { data, error } = await dropthis.drops.get("drop_abc123");
if (!error) console.log(data.title, data.url);
```

### update(dropId, options?)

Update drop metadata (title, visibility, password, etc.). Does **not** change content --
use `dropthis.deploy(dropId, newContent)` for content changes.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `dropId` | `string` | Yes | Drop ID |
| `options` | `DropOptions & RequestControls` | No | Fields to update |

**Returns:** `DropthisResult<DropResponse>`

**Example:**

```typescript
const { data, error } = await dropthis.drops.update("drop_abc123", {
  title: "Updated title",
  visibility: "unlisted",
  ifRevision: 3,
});
```

### delete(dropId)

Permanently delete a drop.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `dropId` | `string` | Yes | Drop ID |

**Returns:** `DropthisResult<null>`

**Example:**

```typescript
const { error } = await dropthis.drops.delete("drop_abc123");
if (error) console.error("Delete failed:", error.message);
```

## Notes

- The `drops` resource is `list` / `get` / `update` / `delete` only — there is no `drops.create()`. Publishing a NEW drop is `dropthis.publish(input, options)`.
- `drops.update()` is metadata-only. `dropthis.update(dropId, options)` is a convenience wrapper that delegates to `drops.update()` — both are metadata-only.
- For updating content, use `dropthis.deploy(dropId, newContent)` which creates a new deployment.
- `idempotencyKey` and `ifRevision` are fields in the options object.
