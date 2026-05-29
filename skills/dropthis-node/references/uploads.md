# Uploads

Low-level upload session management. Accessed via `dropthis.uploads`.

Most users should use `dropthis.publish()` or `dropthis.update()` instead, which handle
the entire staged upload flow (create session, upload files, complete, finalize) automatically.

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

The response includes presigned upload URLs for each file:

```typescript
const { data, error } = await dropthis.uploads.create({
  schemaVersion: 1,
  files: [
    { path: "index.html", contentType: "text/html", sizeBytes: 1024 },
  ],
});
if (!error) {
  // data.uploadId -- session ID
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

### createPartTargets(uploadId, body)

Request presigned URLs for multipart upload parts. Used when a file is too large for a single PUT.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `uploadId` | `string` | Yes | Upload session ID |
| `body` | `CreateUploadPartTargetsRequest` | Yes | Part target request |

`CreateUploadPartTargetsRequest` shape:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `fileId` | `string` | Yes | File ID from the create response |
| `partNumbers` | `number[]` | Yes | Part numbers to get URLs for |

**Returns:** `DropthisResult<CreateUploadPartTargetsResponse>`

**Example:**

```typescript
const { data, error } = await dropthis.uploads.createPartTargets("upl_abc123", {
  fileId: "file_xyz",
  partNumbers: [1, 2, 3],
});
if (!error) {
  for (const part of data.parts) {
    // PUT bytes to part.url with part.headers
  }
}
```

### complete(uploadId, body, options?)

Complete an upload session after all files have been uploaded.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `uploadId` | `string` | Yes | Upload session ID |
| `body` | `CompleteUploadSessionRequest` | Yes | Completion body with optional part ETags |
| `options.idempotencyKey` | `string` | No | Idempotency key |

`CompleteUploadSessionRequest` shape:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `files` | `Record<string, { parts?: Array<{ partNumber: number; etag: string }> \| null }>` | No | Map of fileId to part ETags (for multipart uploads) |

**Returns:** `DropthisResult<UploadSessionResponse>`

**Example:**

```typescript
const { data, error } = await dropthis.uploads.complete("upl_abc123", {
  files: {
    file_xyz: { parts: [{ partNumber: 1, etag: '"abc"' }] },
  },
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

- The full staged upload flow is: `create` -> upload files via presigned URLs -> `complete` -> use `uploadId` with `drops.create()` or `deployments.create()`.
- `dropthis.publish()` and `dropthis.update()` handle this entire flow automatically.
- For multipart uploads, the server sets the `strategy` to `"multipart"` and provides `partSize` and `partCount` in the upload target.
- Part target requests are batched in groups of up to 100 part numbers.
