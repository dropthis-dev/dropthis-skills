# Drops

CRUD operations on drops. Accessed via `dropthis.drops`.

## Methods

### create(body, options?)

Create a drop using a raw request body (low-level). Keys are automatically converted to snake_case.
Most users should use `dropthis.publish()` instead.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `body` | `unknown` | Yes | Request body (camelCase keys auto-converted to snake_case) |
| `options.idempotencyKey` | `string` | No | Idempotency key for safe retries |

**Returns:** `DropthisResult<DropResponse>`

**Example:**

```typescript
const { data, error } = await dropthis.drops.create({
  uploadId: "upl_abc123",
  options: { title: "My Drop" },
});
```

### createRaw(body, options?)

Create a drop using a raw request body without snake_case conversion.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `body` | `unknown` | Yes | Request body (sent as-is) |
| `options.idempotencyKey` | `string` | No | Idempotency key for safe retries |

**Returns:** `DropthisResult<DropResponse>`

**Example:**

```typescript
const { data, error } = await dropthis.drops.createRaw({
  upload_id: "upl_abc123",
  options: { title: "My Drop" },
});
```

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
use `dropthis.deploy(dropId, newContent)` or `deployments.create()` for content changes.

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

- `drops.update()` is metadata-only.
- For updating content, use `dropthis.deploy(dropId, newContent)` which creates a new deployment.
- `idempotencyKey` and `ifRevision` are fields in the options object.
