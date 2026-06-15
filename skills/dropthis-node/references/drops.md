# Drops

Read and manage existing drops. Accessed via `dropthis.drops` — `list`, `get`, `resolve`, `updateSettings`, `delete` (plus `publish` and `updateContent`, covered in [publish.md](publish.md)).

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

### resolve(target)

Resolve a public locator back to the drop — the way to recover a lost `drop_…` id.
`get`/`updateContent`/`updateSettings`/`delete`/`getContent` all take the **id only**; when you
only have what a user pasted (a URL or slug), `resolve` is the single lenient on-ramp: resolve
once, then mutate strictly by `data.id`.

The lookup is **server-side and owner-scoped** (`POST /v1/drops/resolve`). The client sends
`target` verbatim — there is no client-side slug parsing or host allowlist, so it resolves every
URL face: shared-pool URLs, legacy `dropthis.app` URLs, and custom-domain URLs (path-mode
`/{slug}/`, dedicated-mode root, and deep links — all map to the drop at the mount).

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `target` | `string` | Yes | A drop's public URL, its slug, or a `drop_…` id (an id passes straight through) |

**Returns:** `DropthisResult<DropResponse \| null>` — the full drop, or `data: null` (no error)
when nothing of yours matches (unknown, foreign, deleted, or unparseable). A foreign or
unknown target returns the same `null` — no existence leak.

**Example:**

```typescript
const { data, error } = await dropthis.drops.resolve("https://abc123.listb.link/");
if (error) throw new Error(error.message);
if (data === null) {
  // No drop of yours matches — it may belong to another account or be deleted.
} else {
  await dropthis.drops.updateContent(data.id, "<h1>v2</h1>"); // mutate by the resolved id
}
```

> **Persist the `drop_…` id.** URLs, raw_url, and slugs are locators, not identifiers — a vanity
> slug is renameable and the pool host rotates, so a stored URL can drift; the id never moves.
> Treat `drop_…` as an opaque case-sensitive string. You already have the id after `publish` —
> reach for `resolve` only when recovering an id from a URL.

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

- The `drops` resource exposes `publish` / `updateContent` / `updateSettings` / `get` / `resolve` / `list` / `delete`. Publishing a NEW drop is `dropthis.drops.publish(input, options)`.
- `drops.updateSettings()` is settings-only — it changes title/visibility/password/expiry/metadata, never content. Setting a `password` is Pro-only (Free returns 403 `password_protection_unavailable` with `upgrade_url`); clearing one with `password: null` is always allowed.
- For updating content, use `dropthis.drops.updateContent(dropId, newContent)` which creates a new deployment and never changes settings.
- `idempotencyKey` and `ifRevision` are fields in the patch/options object. `get()` returns the drop's current `revision` — feed it back as `ifRevision` for optimistic locking.
- `delete()` gets a 204 No Content reply (every DELETE in the API returns 204), so `data` is `null` on success.
- URL/slug → id resolution: writes are id-only, so to act on a drop you only have the URL or slug for, call `drops.resolve(target)` (server-side, owner-scoped — see above), then mutate by the returned `data.id`. Do NOT parse the slug out of the URL yourself; the server owns the host inventory and resolves every URL face (shared pool, legacy, custom-domain path/dedicated/deep links).
- Content read-back (REST): `GET /v1/drops/{dropId}/content` returns a JSON manifest of the CURRENT deployment's files; add `?path=<file>` to download one file's exact stored bytes. `GET /v1/drops/{dropId}/deployments/{deploymentId}/content` does the same for any historical deployment (including SUPERSEDED ones) — downloading an old version's files and republishing them with `drops.updateContent()` is the rollback path. Owner-authenticated; works regardless of any viewer password.
