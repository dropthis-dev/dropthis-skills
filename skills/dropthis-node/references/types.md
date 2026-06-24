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
  domain: string | null;
  rawUrl: string | null;
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

`domain` is the hostname of the custom domain the drop is mounted on (e.g. `"reports.example.com"`), or `null` for drops on the shared `dropthis.app` pool.

`rawUrl` is the natural-path URL serving the **raw bytes** of a **single non-HTML file** drop
(e.g. `https://dropthis.app/abc123/notes.md`) — hand it to agents that want the exact bytes.
It is `null` for HTML drops and collections. The canonical `url` is **always a branded view**
(the badge), so give `url` to humans and `rawUrl` to agents; to fetch a collection's bytes, use
the content read-back (`GET /v1/drops/{dropId}/content?path=<file>`, see [drops.md](drops.md)).
There is no `/_raw/` route.

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
type ListDropsParams = { cursor?: string | null; limit?: number; domain?: string };
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

The key's scopes are NOT here — they live on the API-key response (`ApiKeyResponse.scopes`),
not the account.

```typescript
type AccountResponse = {
  id: string;
  email: string;
  displayName: string | null;
  plan: string;
  status: string;
  createdAt: string;
  entitlements: Entitlements; // capability matrix + numeric limits for the active plan
  usage: AccountUsage;
  workspace: AccountWorkspace;
  upgradeUrl: string | null; // URL to upgrade; null on the top tier
};
```

### Entitlements

The full capability matrix for the active plan — one read to pre-check a feature gate before
attempting an operation. Enum caps (`ogPreview`, `analytics`) carry a value, so compare by value,
never truthiness (`"none"` is truthy).

```typescript
type Entitlements = {
  capabilities: Record<string, boolean | string>; // per-capability state
  requiredPlan: Record<string, string>;           // lowest plan that unlocks each gated capability
  limits: EntitlementLimits;
};

type EntitlementLimits = {
  maxSizeBytes: number;
  maxStorageBytes: number | null;        // null = no account-level cap
  defaultTtlSeconds: number | null;      // null = drops are permanent
  maxCustomHostnames: number;            // 0 on Free, 1 on Pro
  seatLimit: number;                     // max members the workspace may hold (owner included)
  maxActiveUploadSessions: number;
};
```

### AccountUsage

Current resource usage for the account's active workspace.

```typescript
type AccountUsage = {
  storageUsedBytes: number;   // total bytes across all active drops
  customDomainsUsed: number;
  seatsUsed: number;          // members currently in the workspace (owner included)
};
```

### AccountWorkspace

The workspace a principal acts within (ADR 0066). For an `sk_` API key, the workspace the key is
bound to.

```typescript
type AccountWorkspace = {
  id: string;
  name: string;
  slug: string;
  kind: string;   // "personal" or "team"
  role: string;   // "owner" | "admin" | "member"
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
  strategy: "single_put"; // always single_put — one signed PUT per file
  url: string;
  headers: Record<string, string>;
  expiresAt: string;
};
```

Staging always uses a single signed PUT per file. There is no multipart strategy and no `partSize`/`partCount` fields.

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

There is no `CompleteUploadSessionRequest` type — `uploads.complete(uploadId, options?)` sends no request body.

## Option types

### DropOptions

```typescript
type DropOptions = {
  title?: string;
  visibility?: "public" | "unlisted";
  password?: string | null;        // null clears the password
  noindex?: boolean | null;        // null allows indexing (default)
  expiresAt?: string | Date | null; // null clears expiry → permanent
  entry?: string;
  metadata?: Record<string, unknown>;
  domain?: string | null;          // custom-domain hostname to mount on, or "shared" (SHARED_POOL) to force the shared pool
  slug?: string | null;            // vanity slug — only valid on a path-mode custom domain
};
```

`updateSettings(id, patch)` takes `DropOptions & RequestControls`, so the same `domain` / `slug` /
`expiresAt: null` fields move a drop between domains, rename its slug, or clear its expiry.

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

Each file supplies its bytes via exactly one of `content`, `contentBase64`, `bytes`, or `sourceUrl`. `contentType` is optional (auto-detected if omitted). Use `sourceUrl` for remote assets (images, video, pdf, fonts) — each `sourceUrl` is fetched server-side into the drop. Never base64-inline an image. In the HTML/CSS, reference each bundled asset by its relative `path` (e.g. `assets/hero.jpg`) — put the remote URL in that file's `sourceUrl`, never in the markup.

```typescript
type PublishFileInput = {
  path: string;
  contentType?: string;
  content?: string;
  contentBase64?: string;
  bytes?: Uint8Array;
  sourceUrl?: string; // http(s) URL the server fetches — use for images/video/pdf/fonts
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
