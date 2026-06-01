---
name: dropthis-node
description: >
  Official Node.js SDK for dropthis -- publish content online and get a URL back.
  Use when the user wants to publish HTML, files, or directories to a permanent URL
  from Node.js code. Covers publish, update, delete, auth, and all API resources.
license: MIT
metadata:
  author: dropthis
  homepage: https://dropthis.app
  source: https://github.com/dropthis-dev/dropthis-node
  openclaw:
    primaryEnv: DROPTHIS_API_KEY
    requires:
      env:
        - DROPTHIS_API_KEY
    install:
      - kind: node
        package: "@dropthis/node"
        label: dropthis Node.js SDK
    links:
      repository: https://github.com/dropthis-dev/dropthis-node
inputs:
  - name: DROPTHIS_API_KEY
    description: "API key (sk_ prefix) for authenticating SDK calls."
    required: true
references:
  - references/publish.md
  - references/drops.md
  - references/deployments.md
  - references/uploads.md
  - references/auth.md
  - references/types.md
  - references/error-handling.md
---

# @dropthis/node -- Agent Skill

Official Node.js SDK for dropthis -- the publish layer between AI and the internet.
One API call in, one URL out.

## Installation

```bash
npm install @dropthis/node
```

Requires Node.js >= 20.

## Authentication

The SDK reads the API key from the `DROPTHIS_API_KEY` environment variable by default.
You can also pass it explicitly:

```typescript
import { Dropthis } from "@dropthis/node";

// From env (recommended in CI/production)
const dropthis = new Dropthis();

// Explicit options object
const dropthis = new Dropthis({ apiKey: "sk_..." });

// String shorthand
const dropthis = new Dropthis("sk_...");
```

All API keys use the `sk_` prefix.

## Quick start

```typescript
import { Dropthis } from "@dropthis/node";

const dropthis = new Dropthis();
const { data, error } = await dropthis.publish("<h1>Hello world</h1>");
if (!error) console.log(data.url);
```

## Agent protocol

Every SDK method returns `DropthisResult<T>`:

```typescript
type DropthisResult<T> =
  | { data: T; error: null; headers: Record<string, string> }
  | { data: null; error: DropthisErrorResponse; headers: Record<string, string> };
```

Always check `error` before accessing `data`:

```typescript
const { data, error } = await dropthis.publish("<h1>Hello</h1>");
if (error) {
  // error.code, error.message, error.statusCode
  throw new Error(error.message);
}
console.log(data.url);
```

## Available resources

| Resource | Accessor | Reference | Description |
|----------|----------|-----------|-------------|
| Publish | `dropthis.publish()` | [publish.md](references/publish.md) | High-level publish and update |
| Drops | `dropthis.drops` | [drops.md](references/drops.md) | CRUD operations on drops |
| Deployments | `dropthis.deployments` | [deployments.md](references/deployments.md) | Deployment history per drop |
| Uploads | `dropthis.uploads` | [uploads.md](references/uploads.md) | Low-level upload session management |
| Auth | `dropthis.auth` | [auth.md](references/auth.md) | Email OTP login and logout |
| API Keys | `dropthis.apiKeys` | [auth.md](references/auth.md) | Create, list, delete API keys |
| Account | `dropthis.account` | [auth.md](references/auth.md) | Get, update, delete account |
| Types | -- | [types.md](references/types.md) | All exported TypeScript types |
| Deploy | `dropthis.deploy()` | [publish.md](references/publish.md) | Deploy new content to existing drop |
| Errors | -- | [error-handling.md](references/error-handling.md) | Error codes and handling |

## Common patterns

### Publish a string

```typescript
const { data } = await dropthis.publish("<h1>Hello</h1>");
console.log(data.url);
```

### Publish a file

```typescript
const { data } = await dropthis.publish("./report.html");
```

### Publish a directory

```typescript
const { data } = await dropthis.publish("./dist");
```

### Publish with options

```typescript
const { data } = await dropthis.publish("./dist", {
  title: "Q4 Report",
  visibility: "unlisted",
  password: "s3cret",
  expiresAt: "2026-12-31T00:00:00Z",
});
```

### Set a vanity slug

`slug` is NOT a `publish()` option — `publish()` ignores it. Publish first, then set the slug via `update(dropId, { slug })`:

```typescript
const { data } = await dropthis.publish("./dist");
await dropthis.update(data.id, { slug: "q4-report" });
```

### Publish bytes

```typescript
const { data } = await dropthis.publish(new Uint8Array([...]), {
  contentType: "application/pdf",
  path: "report.pdf",
});
```

### Publish explicit files (multi-file bundle)

```typescript
const { data } = await dropthis.publish({
  kind: "files",
  files: [
    { path: "index.html", content: "<h1>Hi</h1>" },
    { path: "style.css", content: "body{}" },
  ],
  entry: "index.html",
});
```

### Publish a public URL (server fetches it)

```typescript
const { data } = await dropthis.publish("https://example.com/page.html");
// or: await dropthis.publish({ kind: "source_url", sourceUrl: "https://example.com/page.html" });
```

### Deploy new content to an existing drop

```typescript
const created = await dropthis.publish("./dist", { title: "v1" });
const updated = await dropthis.deploy(created.data.id, "./dist-v2", {
  ifRevision: created.data.revision,
});
```

### Update metadata only (no new content)

```typescript
await dropthis.update("drop_abc123", { title: "New title" });
```

### Delete a drop

```typescript
await dropthis.drops.delete("drop_abc123");
```

### List drops with pagination

```typescript
const page = await dropthis.drops.list({ limit: 20 });
if (page.error) throw new Error(page.error.message);

// Auto-paginate to array
const allDrops = await page.data.autoPagingToArray({ limit: 100 });

// Or async iterate
for await (const drop of page.data) {
  console.log(drop.url);
}
```

## Common mistakes

| Mistake | Fix |
|---------|-----|
| Accessing `data` without checking `error` | Always check `if (error)` first |
| Using `drops.update()` to push new content | Use `dropthis.deploy(id, newContent)` for content changes; `drops.update()` and `dropthis.update()` are both metadata-only |
| Fetching a URL before publishing | Pass the `http(s)` URL straight to `publish()` (or `{ kind: "source_url", sourceUrl }`) -- the server fetches it. Do NOT download it yourself first. |
| Passing the slug/URL token as `dropId` | `deploy(dropId, …)`, `drops.update(dropId, …)`, `drops.get/delete(dropId)` take the `drop_…` id — the `data.id` returned by `publish()`, NOT `data.slug` or the URL token |
| Forgetting `ifRevision` on concurrent updates | Pass `ifRevision` from the previous response to get optimistic concurrency |
| Using `uploads.*` directly for simple publishes | Use `dropthis.publish()` which handles the staged upload flow automatically |
| Importing from subpaths | Import everything from `"@dropthis/node"` -- there are no public subpath exports |
