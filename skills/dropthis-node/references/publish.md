# Publish

High-level methods on the `Dropthis` class for publishing and updating content.
These handle the full staged upload flow (create upload session, upload files via presigned URLs, complete session, finalize drop) transparently.

## Methods

### publish(input, options?)

Publish new content and get a URL back.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `input` | `PublishInput` | Yes | Content to publish (see Input types below) |
| `options` | `PublishOptions` | No | Publish options (title, visibility, password, noindex, expiresAt, etc.). `slug` is NOT settable here — `publish()` ignores it; set the vanity slug afterward via `update(dropId, { slug })`. |

**Returns:** `DropthisResult<DropResponse>`

**Example:**

```typescript
const { data, error } = await dropthis.publish("<h1>Hello</h1>");
if (!error) console.log(data.url);

// Set a vanity slug AFTER publishing (slug is update-only):
await dropthis.update(data.id, { slug: "my-slug" });
```

### deploy(dropId, input, options?)

Deploy new content to an existing drop, creating a new deployment.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `dropId` | `string` | Yes | The drop ID (e.g. `"drop_abc123"`) |
| `input` | `PublishInput` | Yes | New content to deploy |
| `options` | `PublishOptions` | No | Publish options |

**Returns:** `DropthisResult<DropResponse>`

**Example:**

```typescript
const { data, error } = await dropthis.deploy("drop_abc123", "./dist-v2", {
  ifRevision: 3,
});
```

### update(dropId, options?)

Update drop metadata only (title, slug, visibility, etc.). Does not create a new deployment.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `dropId` | `string` | Yes | The drop ID |
| `options` | `DropOptions & RequestControls` | No | Fields to update |

**Returns:** `DropthisResult<DropResponse>`

**Example:**

```typescript
await dropthis.update("drop_abc123", { title: "New title", ifRevision: 3 });
```

### prepare(input, options?)

Prepare a publish request without executing it. Returns the upload manifest and prepared files.
Useful for inspecting what would be uploaded.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `input` | `PublishInput` | Yes | Content to prepare |
| `options` | `PublishOptions` | No | Publish options |

**Returns:** `Promise<PreparedPublishRequest>` — a discriminated union on `kind`:
- `kind: "staged"` — has `manifest` (the upload manifest) and `files` (prepared files).
- `kind: "source"` — has `sourceUrl` (server-fetched URL); no files to upload.

**Example:**

```typescript
const prepared = await dropthis.prepare("./dist");
if (prepared.kind === "staged") {
  console.log(prepared.manifest.files); // files that would be uploaded
}
```

## Input types

`PublishInput` accepts:

| Input | Type | Description |
|-------|------|-------------|
| HTML/text string | `string` | `"<h1>Hello</h1>"` -- auto-detected as inline content |
| File path | `string` | `"./report.html"` -- detected via filesystem stat |
| Directory path | `string` | `"./dist"` -- all files collected recursively |
| File path list | `string[]` | `["index.html", "style.css"]` -- bundled into one drop |
| Public URL | `string` \| `URL` | `"https://example.com/page.html"` -- server fetches it (source_url flow) |
| Raw bytes | `Uint8Array` | Binary content |
| Inline content | `{ kind: "content"; content; contentType?; path? }` | Explicit inline content |
| Source URL | `{ kind: "source_url"; sourceUrl }` | Explicit server-fetched URL |
| Explicit files | `{ kind: "files"; files: PublishFileInput[]; entry? }` | Multi-file bundle (do NOT inline assets into one file) |

## PublishOptions

`PublishOptions = DropOptions & PrepareOptions & RequestControls`

**DropOptions** -- drop metadata fields:

| Option | Type | Description |
|--------|------|-------------|
| `slug` | `string` | Change the vanity slug (update only) |
| `title` | `string` | Drop title |
| `visibility` | `"public" \| "unlisted"` | public (default) or unlisted |
| `password` | `string \| null` | Require password to view (`null` to remove) |
| `noindex` | `boolean \| null` | Prevent search-engine indexing (`null` to allow, default) |
| `expiresAt` | `string \| Date \| null` | Auto-delete after this ISO 8601 date |
| `entry` | `string` | Entry file for multi-file bundles (default: index.html) |
| `metadata` | `Record<string, unknown>` | Attach JSON key-value pairs, e.g. `{ source: "ci" }` |

**PrepareOptions** -- content preparation fields:

| Option | Type | Description |
|--------|------|-------------|
| `ignore` | `string[]` | Glob patterns to ignore when publishing directories |
| `ignoreDefaults` | `boolean` | Disable default ignore patterns |
| `contentType` | `string` | Override MIME type (auto-detected from extension) |
| `path` | `string` | Set filename when publishing from stdin or bytes |

**RequestControls** -- request-level controls:

| Option | Type | Description |
|--------|------|-------------|
| `idempotencyKey` | `string` | Prevent duplicate publishes on retry (auto-generated by CLI) |
| `ifRevision` | `number` | Fail if current revision doesn't match -- optimistic lock (update only) |

## Resource accessors

The `Dropthis` class exposes the following resource accessors as lazy-initialized getters:

### drops

Access the Drops resource for CRUD operations on drops. See [drops.md](drops.md).

```typescript
dropthis.drops.list();
dropthis.drops.get("drop_abc123");
```

### deployments

Access the Deployments resource for deployment history. See [deployments.md](deployments.md).

```typescript
dropthis.deployments.list("drop_abc123");
```

### uploads

Access the Uploads resource for low-level upload session management. See [uploads.md](uploads.md).

```typescript
dropthis.uploads.create({ schemaVersion: 1, files: [...] });
```

### auth

Access the Auth resource for email OTP login flows. See [auth.md](auth.md).

```typescript
dropthis.auth.requestEmailOtp({ email: "user@example.com" });
```

### apiKeys

Access the API Keys resource for managing API keys. See [auth.md](auth.md).

```typescript
dropthis.apiKeys.create({ label: "CI" });
```

### account

Access the Account resource for managing the authenticated account. See [auth.md](auth.md).

```typescript
dropthis.account.get();
```

## Notes

- String inputs are auto-detected in priority order: an `http(s)` URL → server-fetched (source_url); multiline/oversized → inline content; otherwise stat the path (file/dir) → staged upload; a path-shaped miss → `file_not_found`; else inline prose.
- A bare `http(s)` URL string (or a `URL` object, or `{ kind: "source_url" }`) publishes a server-fetched copy. Pass the URL directly -- do NOT fetch it yourself.
- To publish multiple files, pass `string[]` paths or `{ kind: "files", files: [...] }`. Do NOT inline CSS/JS into one HTML blob.
- `publish()` returns BOTH `data.id` (the `drop_…` id) and `data.slug` (the URL token). Pass `data.id` to `deploy(dropId, …)`, `update(dropId, …)`, and `drops.get/update/delete(dropId)` — the slug is NOT accepted as a drop id. Retain `data.id` for all follow-up operations.
- The staged upload flow uses presigned URLs for direct-to-R2 uploads (single PUT per file). The SDK handles this entirely.
- For files larger than 10 MB, SHA-256 checksums are computed automatically for integrity verification.
- The public API is `prepare` / `publish` / `deploy` / `update` plus the resource getters. There is no generic `request()` escape hatch and no `requestSignedUpload()` — those low-level methods are not part of the public surface.
