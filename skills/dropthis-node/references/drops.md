# Drops

Read and manage existing drops. Accessed via `dropthis.drops` — `list`, `get`, `updateSettings`, `delete` (plus `publish` and `updateContent`, covered in [publish.md](publish.md)).

This resource is where drops are created and changed. To publish a NEW drop, call `dropthis.drops.publish(input, options)`.
To update the content of an existing drop, call `dropthis.drops.updateContent(dropId, input, options)`. See
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

`DropResponse` includes settings read-back fields: `noindex` (boolean), `passwordProtected`
(boolean — the raw password is never returned), and `metadata` (object). It also carries
`rawUrl` — the natural-path raw-bytes URL for a single non-HTML file drop (`null` for HTML
drops and collections); `url` is always the branded view for humans, `rawUrl` is the bytes for
agents. See [types.md](types.md).

**Example:**

```typescript
const { data, error } = await dropthis.drops.get("drop_abc123");
if (!error) console.log(data.title, data.url, data.noindex, data.passwordProtected);
```

### updateSettings(dropId, patch?)

Update drop settings (title, visibility, password, noindex, expiry, metadata). Does
**not** change content -- use `dropthis.drops.updateContent(dropId, newContent)` for content changes
(`updateContent()` is content-only and never touches settings).

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `dropId` | `string` | Yes | Drop ID |
| `patch` | `DropOptions & RequestControls` | No | Fields to update |

**Returns:** `DropthisResult<DropResponse>`

**Example:**

```typescript
const { data, error } = await dropthis.drops.updateSettings("drop_abc123", {
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

- The `drops` resource exposes `publish` / `updateContent` / `updateSettings` / `get` / `list` / `delete`. Publishing a NEW drop is `dropthis.drops.publish(input, options)`.
- `drops.updateSettings()` is settings-only — it changes title/visibility/password/expiry/metadata, never content. Setting a `password` is Pro-only (Free returns 403 `password_protection_unavailable` with `upgrade_url`); clearing one with `password: null` is always allowed.
- For updating content, use `dropthis.drops.updateContent(dropId, newContent)` which creates a new deployment and never changes settings.
- `idempotencyKey` and `ifRevision` are fields in the patch/options object. `get()` returns the drop's current `revision` — feed it back as `ifRevision` for optimistic locking.
- `delete()` gets a 204 No Content reply (every DELETE in the API returns 204), so `data` is `null` on success.
- Slug→id resolution: each drop carries its `slug` (the URL token). If you only have a drop's URL, extract the slug and match it against `drops.list()` results — or resolve directly against the REST API: `GET /v1/drops?slug=<slug>` (owner-scoped, returns 0 or 1 drops).
- Content read-back (REST): `GET /v1/drops/{dropId}/content` returns a JSON manifest of the CURRENT deployment's files; add `?path=<file>` to download one file's exact stored bytes. `GET /v1/drops/{dropId}/deployments/{deploymentId}/content` does the same for any historical deployment (including SUPERSEDED ones) — downloading an old version's files and republishing them with `drops.updateContent()` is the rollback path. Owner-authenticated; works regardless of any viewer password.
