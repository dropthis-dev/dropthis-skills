# Types

All TypeScript types exported from `@dropthis/node`. Import them as type-only imports:

```typescript
import type { DropResponse, TierInfo, Limitations, DropthisResult } from "@dropthis/node";
```

## Client configuration

### DropthisClientOptions

```typescript
type DropthisClientOptions = {
  apiKey?: string;
  baseUrl?: string;
  timeoutMs?: number;
  fetch?: typeof globalThis.fetch;
};
```

### RequestOptions

```typescript
type RequestOptions = {
  authenticated?: boolean;
  idempotencyKey?: string;
  ifRevision?: number;
  timeoutMs?: number;
};
```

## Result types

### DropthisResult\<T\>

Discriminated union returned by all SDK methods.

```typescript
type DropthisResult<T> =
  | { data: T; error: null; headers: Record<string, string> }
  | { data: null; error: DropthisErrorResponse; headers: Record<string, string> };
```

### DropthisErrorResponse

```typescript
type DropthisErrorResponse = {
  code: string;
  message: string;
  statusCode: number | null;
  type?: string;
  detail?: unknown;
  param?: string | null;
  currentRevision?: number;
  requestId?: string | null;
};
```

## Drop types

### DropResponse

```typescript
type DropResponse = {
  object: string;
  id: string;
  slug: string;
  url: string;
  canonicalHost: string;
  deploymentId: string | null;
  title: string;
  contentType: string;
  visibility: string;
  status: string;
  revision: number;
  contentRevision: number;
  accessRevision: number;
  sizeBytes: number;
  renderMode: string;
  warnings: Array<Record<string, unknown>>;
  createdAt: string;
  expiresAt: string | null;
  accessible: boolean;
  persistent: boolean;
  badgeApplied: boolean;
  tier: TierInfo;
  limitations: Limitations;
};
```

### TierInfo

```typescript
type TierInfo = {
  name: string;
  maxSizeBytes: number;
  ttlDays: number | null;
  persistent: boolean;
  badge: boolean;
};
```

### Limitations

```typescript
type Limitations = {
  actions: DropAction[];
};
```

### DropAction

```typescript
type DropAction = {
  code: string;
  kind: "api" | "human";
  priority: "required" | "suggested";
  message: string;
  resolve?: ActionResolve | null;
};
```

### ActionResolve

```typescript
type ActionResolve = {
  method: string;
  url?: string | null;
  endpoint?: string | null;
};
```

### DropDeploymentResponse

```typescript
type DropDeploymentResponse = {
  id: string;
  dropId: string;
  revision: number;
  status: string;
  storagePrefix: string;
  entry: string | null;
  contentType: string;
  renderMode: string;
  files: Array<Record<string, unknown>>;
  warnings: Array<Record<string, unknown>>;
  sizeBytes: number;
  classificationVersion: number;
  classificationReason: string;
  errorCode: string | null;
  errorMessage: string | null;
  createdAt: string;
  readyAt: string | null;
  publishedAt: string | null;
};
```

## Pagination types

### ListPage\<T\>

```typescript
type ListPage<T> = {
  object: "list";
  data: T[];
  hasMore: boolean;
  nextCursor: string | null;
  autoPagingToArray(options?: { limit?: number }): Promise<T[]>;
  [Symbol.asyncIterator](): AsyncIterableIterator<T>;
};
```

Concrete implementation of `ListPage<T>` in `src/pagination.ts`. Returned by `drops.list()`.

### ListDropsParams

```typescript
type ListDropsParams = { cursor?: string | null; limit?: number };
```

### ListDeploymentsParams

```typescript
type ListDeploymentsParams = { cursor?: string | null; limit?: number };
```

### ListDeploymentsResponse

```typescript
type ListDeploymentsResponse = {
  deployments: DropDeploymentResponse[];
  nextCursor: string | null;
};
```

## Auth types

### EmailOtpResponse

```typescript
type EmailOtpResponse = { ok: true; expiresIn: number };
```

### SessionResponse

```typescript
type SessionResponse = {
  object: "session";
  token: string;
  accountId: string;
  isNewAccount: boolean;
  expiresIn: number;
};
```

### ApiKeyResponse

```typescript
type ApiKeyResponse = {
  object: "api_key";
  id: string;
  keyLast4: string;
  label: string;
  createdAt: string;
};
```

### ApiKeyCreatedResponse

```typescript
type ApiKeyCreatedResponse = ApiKeyResponse & {
  key: string;
  accountId?: string | null;
  isNewAccount?: boolean;
};
```

### AccountResponse

```typescript
type AccountResponse = {
  id: string;
  email: string;
  displayName: string | null;
  plan: string;
  status: string;
  createdAt: string;
};
```

## Upload types

### UploadManifestFile

```typescript
type UploadManifestFile = {
  path: string;
  contentType: string;
  sizeBytes: number;
  checksumSha256?: string | null;
};
```

### CreateUploadSessionRequest

```typescript
type CreateUploadSessionRequest = {
  schemaVersion?: 1;
  files: UploadManifestFile[];
  entry?: string | null;
};
```

### CreateUploadSessionResponse

```typescript
type CreateUploadSessionResponse = {
  uploadId: string;
  expiresAt: string;
  files: CreateUploadSessionFileResponse[];
};
```

### CreateUploadSessionFileResponse

```typescript
type CreateUploadSessionFileResponse = {
  fileId: string;
  path: string;
  objectKey: string;
  upload: UploadTarget;
};
```

### UploadTarget

```typescript
type UploadTarget = {
  strategy: "single_put" | "multipart";
  url: string;
  headers: Record<string, string>;
  expiresAt: string;
  partSize?: number;
  partCount?: number;
};
```

### UploadSessionResponse

```typescript
type UploadSessionResponse = {
  uploadId: string;
  status: string;
  expiresAt: string;
  entry?: string | null;
  files: UploadSessionFileResponse[];
};
```

### UploadSessionFileResponse

```typescript
type UploadSessionFileResponse = {
  fileId: string;
  path: string;
  contentType: string;
  sizeBytes: number;
  objectKey: string;
  verified: boolean;
};
```

### CreateUploadPartTargetsRequest

```typescript
type CreateUploadPartTargetsRequest = {
  fileId: string;
  partNumbers: number[];
};
```

### CreateUploadPartTargetsResponse

```typescript
type CreateUploadPartTargetsResponse = {
  fileId: string;
  urlExpiresAt?: string | null;
  parts: UploadPartTarget[];
};
```

### UploadPartTarget

```typescript
type UploadPartTarget = {
  partNumber: number;
  url: string;
  headers: Record<string, string>;
  expiresAt: string;
};
```

### CompleteUploadSessionRequest

```typescript
type CompleteUploadSessionRequest = {
  files?: Record<
    string,
    { parts?: Array<{ partNumber: number; etag: string }> | null }
  >;
};
```

## Option types

### DropOptions

```typescript
type DropOptions = {
  slug?: string;
  title?: string;
  visibility?: "public" | "unlisted";
  password?: string | null;
  noindex?: boolean | null;
  expiresAt?: string | Date | null;
  entry?: string;
  metadata?: Record<string, unknown>;
};
```

### PrepareOptions

```typescript
type PrepareOptions = {
  ignore?: string[];
  ignoreDefaults?: boolean;
  contentType?: string;
  path?: string;
};
```

### RequestControls

```typescript
type RequestControls = {
  idempotencyKey?: string;
  ifRevision?: number;
};
```

## Publish input types

### PublishInput

```typescript
type PublishInput = string | Uint8Array | ExplicitPublishInput;
```

### ExplicitPublishInput

```typescript
type ExplicitPublishInput =
  | {
      content: string;
      contentType?: string;
      title?: string;
      visibility?: "public" | "unlisted";
      metadata?: Record<string, unknown>;
      entry?: string;
    }
  | {
      files: Array<{
        path: string;
        content?: string;
        contentBase64?: string;
        bytes?: Uint8Array;
        contentType: string;
      }>;
      title?: string;
      visibility?: "public" | "unlisted";
      metadata?: Record<string, unknown>;
      entry?: string;
    };
```

### PublishOptions

```typescript
type PublishOptions = DropOptions & PrepareOptions & RequestControls;
```

### UpdateOptions

Deprecated alias for `DropOptions & RequestControls`.

## Internal types (exported for advanced use)

These types are exported from `src/publish/prepare.ts` for advanced use cases such as inspecting what `prepare()` returns. They are not part of `src/types.ts`.

**`PreparedPublishRequest`** -- Returned by `dropthis.prepare()`. Contains the upload manifest, prepared files, and options.

```typescript
type PreparedPublishRequest = {
  kind: "staged";
  manifest: CreateUploadSessionRequest;
  files: PreparedUploadFile[];
  options: Record<string, unknown>;
  metadata?: Record<string, unknown>;
};
```

**`PreparedUploadFile`** -- Individual file within a `PreparedPublishRequest`.

```typescript
type PreparedUploadFile = {
  path: string;
  contentType: string;
  sizeBytes: number;
  checksumSha256?: string;
  source: { kind: "path"; path: string } | { kind: "bytes"; bytes: Uint8Array };
};
```
