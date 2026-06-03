# Uploads

Low-level upload session management. Accessed via `dropthis.uploads` — `create`, `get`, `complete`, `cancel`.

**Most users never call this directly.** `dropthis.drops.publish()` and `dropthis.drops.updateContent()` handle the
entire staged upload flow (create session, upload files, complete, finalize) internally. Reach for
`dropthis.uploads.*` only if you are building a custom upload pipeline.

Staging uploads to a single object via a presigned **single PUT**. There is no multipart / part-target
flow in this SDK.

## Methods

### create(body, options?)

Create a new upload session with a file manifest.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `body` | `CreateUploadSessionRequest` | Yes | Upload manifest with files array |
| `options.idempotencyKey` | `string` | No | Idempotency key for safe retries |

`CreateUploadSessionRequest` shape:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `schemaVersion` | `1` | No | Schema version (defaults to 1) |
| `files` | `UploadManifestFile[]` | Yes | Array of files to upload |
| `entry` | `string \| null` | No | Entry file path |

Each `UploadManifestFile`:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `path` | `string` | Yes | File path within the upload |
| `contentType` | `string` | Yes | MIME content type |
| `sizeBytes` | `number` | Yes | File size in bytes |
| `checksumSha256` | `string \| null` | No | SHA-256 checksum for integrity |

**Returns:** `DropthisResult<CreateUploadSessionResponse>`

The response includes a presigned single-PUT upload target for each file:

```typescript
const { data, error } = await dropthis.uploads.create({
  schemaVersion: 1,
  files: [
    { path: "index.html", contentType: "text/html", sizeBytes: 1024 },
  ],
});
if (!error) {
  // data.uploadId -- session ID
  // data.files[0].upload.strategy -- always "single_put"
  // data.files[0].upload.url -- presigned PUT URL
  // data.files[0].upload.headers -- headers to include in PUT
}
```

### get(uploadId)

Get the current status of an upload session.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `uploadId` | `string` | Yes | Upload session ID |

**Returns:** `DropthisResult<UploadSessionResponse>`

**Example:**

```typescript
const { data, error } = await dropthis.uploads.get("upl_abc123");
if (!error) {
  console.log(data.status, data.files.length);
}
```

### complete(uploadId, body, options?)

Complete an upload session after all files have been uploaded to their presigned URLs.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `uploadId` | `string` | Yes | Upload session ID |
| `body` | `CompleteUploadSessionRequest` | Yes | Completion body |
| `options.idempotencyKey` | `string` | No | Idempotency key |

`CompleteUploadSessionRequest` shape:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `files` | `Record<string, { parts?: Array<{ partNumber: number; etag: string }> \| null }>` | No | Reserved; the single-PUT flow sends an empty object (`{ files: {} }`) |

**Returns:** `DropthisResult<UploadSessionResponse>`

**Example:**

```typescript
const { data, error } = await dropthis.uploads.complete("upl_abc123", {
  files: {},
});
```

### cancel(uploadId)

Cancel an upload session and discard uploaded files.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `uploadId` | `string` | Yes | Upload session ID |

**Returns:** `DropthisResult<null>`

**Example:**

```typescript
const { error } = await dropthis.uploads.cancel("upl_abc123");
```

## Notes

- The staged upload flow is: `create` → PUT each file to its presigned `single_put` URL → `complete` → finalize the drop with the `uploadId`.
- `dropthis.drops.publish()` and `dropthis.drops.updateContent()` run this entire flow internally — they finalize the drop for you using the resulting `uploadId`. You don't pass an `uploadId` anywhere yourself.
- `dropthis.drops.updateSettings()` is settings-only (title, visibility, etc.) and does **not** touch the upload flow.
- Staging always uses a single PUT per file (`strategy: "single_put"`). There is no multipart / part-target API and no `partSize`/`partCount` — those were removed.
