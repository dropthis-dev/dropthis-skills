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
  uploadTimeoutMs?: number;
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
  title?: string;
  detail?: string | null;
  instance?: string | null;
  param?: string | null;
  currentRevision?: number;
  requestId?: string | null;
  suggestion?: string | null;
  retryable?: boolean | null;
  body?: unknown;
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
  noindex: boolean;
  passwordProtected: boolean;
  metadata: Record<string, unknown>;
  tier: TierInfo;
  limitations: Limitations;
};
```

Settings read-back: `noindex`, `passwordProtected`, and `metadata` reflect the drop's current
settings. The raw `password` is **never** returned — `passwordProtected` is the only signal of
whether one is set.

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

### Action

```typescript
type Action = {
  code: string;
  kind: string;
  method?: string | null;
  endpoint?: string | null;
  message: string;
};
```

### EmailOtpResponse

```typescript
type EmailOtpResponse = {
  ok: true;
  expiresIn: number;
  nextAction?: Action | null;
};
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
  limits: AccountLimits;
};
```

### AccountLimits

The active plan-tier limits — use them to size a publish before uploading.
`defaultTtlSeconds: null` means drops are permanent; `maxStorageBytes: null` means no
account-level storage cap.

```typescript
type AccountLimits = {
  name: string;
  maxSizeBytes: number;
  defaultTtlSeconds: number | null;
  maxStorageBytes: number | null;
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
  nextAction?: Action | null;
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
};
```

The SDK only uploads via `single_put`. There are no `partSize`/`partCount` fields.

### UploadSessionResponse

```typescript
type UploadSessionResponse = {
  uploadId: string;
  status: string;
  expiresAt: string;
  entry?: string | null;
  files: UploadSessionFileResponse[];
  nextAction?: Action | null;
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
type PublishInput =
  | string
  | string[]
  | URL
  | Uint8Array
  | { kind: "content"; content: string; contentType?: string; path?: string }
  | { kind: "source_url"; sourceUrl: string }
  | { kind: "files"; files: PublishFileInput[]; entry?: string };
```

### PublishFileInput

Each file supplies its bytes via exactly one of `content`, `contentBase64`, or `bytes`. `contentType` is optional (auto-detected if omitted).

```typescript
type PublishFileInput = {
  path: string;
  contentType?: string;
  content?: string;
  contentBase64?: string;
  bytes?: Uint8Array;
};
```

### PublishOptions

```typescript
type PublishOptions = DropOptions & PrepareOptions & RequestControls;
```

## Internal types (exported for advanced use)

These types are exported from `src/publish/core.ts` for advanced use cases such as inspecting what `prepare()` returns.

**`PreparedPublishRequest`** -- Returned by `dropthis.prepare()`. A discriminated union on `kind`:

```typescript
type PreparedPublishRequest =
  | {
      kind: "staged";
      manifest: CreateUploadSessionRequest;
      files: PreparedUploadFile[];
      options: Record<string, unknown>;
      metadata?: Record<string, unknown>;
    }
  | {
      kind: "source";
      sourceUrl: string;
      options: Record<string, unknown>;
      metadata?: Record<string, unknown>;
    };
```

**`PreparedUploadFile`** -- Individual file within a `staged` `PreparedPublishRequest`. Its bytes are lazy: call `getBody()` to read them.

```typescript
type PreparedUploadFile = {
  path: string;
  contentType: string;
  sizeBytes: number;
  checksumSha256?: string;
  getBody(): Promise<Uint8Array | Blob | ReadableStream>;
};
```
