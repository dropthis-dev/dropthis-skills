---
name: dropthis-node
description: >
  Use when the user wants to publish, share, post, put online, make public, host, or get a
  shareable link for content — HTML, files, or directories — from Node.js or TypeScript code
  with the official dropthis SDK (`@dropthis/node`), even if they don't say "drop". Also use to
  update, edit, rename, password-protect, list, or delete published drops via
  `client.drops.publish`, `client.drops.updateContent`, `client.drops.updateSettings`,
  `client.drops.get/list/delete`, `client.deployments.*`, and `client.account.*`.
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
  - ../../references/domains.md
  - ../../references/workspaces.md
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
const { data, error } = await dropthis.drops.publish("<h1>Hello world</h1>");
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
const { data, error } = await dropthis.drops.publish("<h1>Hello</h1>");
if (error) {
  // error.code, error.message, error.statusCode
  throw new Error(error.message);
}
console.log(data.url);
```

## Available resources

The SDK uses Stripe-style resource namespaces — every lifecycle method hangs off a resource
(there are no top-level `publish`/`deploy`/`update` methods).

| Method | Does | Reference |
|--------|------|-----------|
| `client.drops.publish(input, opts?)` | Create a NEW drop → URL. Never takes an id | [publish.md](references/publish.md) |
| `client.drops.updateContent(id, input, opts?)` | Update a drop's content, same URL (new deployment). Partial by default — provided files upsert, the rest are kept; `mode: "replace"` swaps the whole set. Settings unchanged | [publish.md](references/publish.md) |
| `client.drops.updateSettings(id, patch)` | Change title/visibility/password/expiry/metadata. Content unchanged | [drops.md](references/drops.md) |
| `client.drops.get(id)` | Fetch one drop (settings round-trip back into `updateSettings`) | [drops.md](references/drops.md) |
| `client.drops.resolve(target)` | Resolve a public URL/slug (or id) → the drop, to recover a lost `drop_…` id | [drops.md](references/drops.md) |
| `client.drops.list(params?)` | List drops (cursor-paginated, auto-paging iterable) | [drops.md](references/drops.md) |
| `client.drops.delete(id)` | Delete a drop | [drops.md](references/drops.md) |
| `client.deployments.list(dropId, params?)` | Content history for a drop | [deployments.md](references/deployments.md) |
| `client.deployments.get(dropId, depId)` | One deployment's details | [deployments.md](references/deployments.md) |
| `client.account.get()` / `client.account.update(patch)` / `client.account.delete()` | Account read/update/delete | [auth.md](references/auth.md) |
| `client.apiKeys` | Create, list, delete API keys | [auth.md](references/auth.md) |
| `client.auth` | Email OTP login and logout | [auth.md](references/auth.md) |
| `client.uploads` | Low-level upload session management (rarely needed) | [uploads.md](references/uploads.md) |
| — | All exported TypeScript types | [types.md](references/types.md) |
| — | Error codes and handling | [error-handling.md](references/error-handling.md) |

**Contract:** `client.drops.publish` creates a NEW drop and never takes an id; updating an
existing drop needs its full `drop_…` id (the `data.id` from the publish response — not
`data.slug` or the URL token). `updateContent` ships a new **deployment** (a content version);
`updateSettings` never touches content.

**Persist the `drop_…` id.** URLs, `raw_url`, and slugs are locators, not identifiers — a vanity
slug is renameable and the pool host rotates, so a stored URL can drift; the id never moves. Treat
`drop_…` as an opaque case-sensitive string. You already have the id after `publish`; if you only
kept a URL or slug, recover the id with `client.drops.resolve(target)` (server-side, owner-scoped),
then mutate by the returned `data.id`. Do NOT parse the slug out of a URL yourself.

## What a drop URL serves (canonical view vs raw bytes)

Every drop's canonical `data.url` is **always a branded view** carrying the dropthis badge —
there is no user-agent detection and no `/_raw/` route:

- **HTML** → the page renders as-is (badge injected).
- **Single non-HTML file** (one `.md`, `.json`, `.csv`, `.png`, …) → a **branded preview** page
  at `data.url` (image inline; markdown/JSON/CSV/text/code as escaped **source**; opaque binary
  as a download affordance). The file's **raw bytes** live at the **natural path** under the
  drop and come back as `data.rawUrl` (e.g. `https://dropthis.app/abc123/notes.md`).
- **Collection** (multiple files, no HTML entry) → a **branded index** at `data.url` linking
  each file's natural path; a `README.md`/`index.md` is shown atop the index.

Give the canonical `data.url` to **humans** (badge) and `data.rawUrl` to **agents** (exact
bytes). `rawUrl` is `null` for HTML drops and collections — for a collection's bytes, use the
content read-back (`GET /v1/drops/{dropId}/content?path=<file>`, see
[drops.md](references/drops.md)). Append `?download=1` to any natural-path URL to force a
download.

dropthis publishes **agent-readable artifacts**, not files-for-transfer. The dividing line is
**publish vs transfer**, gated only by the per-drop size cap (5 MB Free / 100 MB Pro) — there is
no content/extension policy. A `handoff.md` or several JSON/CSV files publish fine; very large
binaries are blocked by size, not type.

## Common patterns

### Publish a string

```typescript
const { data } = await dropthis.drops.publish("<h1>Hello</h1>");
console.log(data.url);
```

### Publish a file

```typescript
const { data } = await dropthis.drops.publish("./report.html");
```

### Publish a directory

```typescript
const { data } = await dropthis.drops.publish("./dist");
```

### Publish with options

```typescript
const { data } = await dropthis.drops.publish("./dist", {
  title: "Q4 Report",
  visibility: "unlisted",
  expiresAt: "2026-12-31T00:00:00Z",
});
```

### Publish bytes

```typescript
const { data } = await dropthis.drops.publish(new Uint8Array([...]), {
  contentType: "application/pdf",
  path: "report.pdf",
});
```

### Publish explicit files (multi-file bundle)

Each file is inline `content`/`content_base64`, or a `source_url` the server fetches — use `source_url` for images/video/pdf/fonts (never base64-inline an image) — and in the HTML/CSS reference each bundled asset by its relative `path` (e.g. `assets/hero.jpg`), with the remote URL in that file's `source_url`, never hot-linked in the markup.

```typescript
const { data } = await dropthis.drops.publish({
  kind: "files",
  files: [
    { path: "index.html", content: "<h1>Hi</h1>" },
    { path: "style.css", content: "body{}" },
    { path: "logo.png", sourceUrl: "https://example.com/logo.png" }, // server fetches it
  ],
  entry: "index.html",
});
```

### Publish a public URL (server fetches it)

```typescript
const { data } = await dropthis.drops.publish("https://example.com/page.html");
// or: await dropthis.drops.publish({ kind: "source_url", sourceUrl: "https://example.com/page.html" });
```

### Update a drop's content (same URL, new deployment)

```typescript
const created = await dropthis.drops.publish("./dist", { title: "v1" });

// Patch (default): upsert only the file you changed; everything else is carried forward.
const updated = await dropthis.drops.updateContent(created.data.id, "<h1>v2</h1>", {
  path: "index.html",
  ifRevision: created.data.revision,
});

// Replace: the files you send become the drop's entire content set.
await dropthis.drops.updateContent(created.data.id, "./dist-v2", { mode: "replace" });

// Patch + delete a couple of files that are no longer needed.
await dropthis.drops.updateContent(created.data.id, "./changed", {
  deletePaths: ["old/legacy.css"],
});
// updateContent is partial by default (mode: "patch") and content-only.
// It is NOT idempotent — pass idempotencyKey to make retries safe.
```

### Change settings only (no new content)

```typescript
await dropthis.drops.updateSettings("drop_abc123", { title: "New title" });
```

### Delete a drop

```typescript
await dropthis.drops.delete("drop_abc123");
```

### Resolve a URL/slug back to a drop (recover a lost id)

```typescript
// Writes are id-only; resolve once, then mutate by data.id.
const { data, error } = await dropthis.drops.resolve("https://abc123.listb.link/");
if (error) throw new Error(error.message);
if (data === null) {
  // No drop of yours matches (foreign, deleted, or unknown URL).
} else {
  await dropthis.drops.updateContent(data.id, "<h1>v2</h1>");
}
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

// Filter to a custom domain
const domainPage = await dropthis.drops.list({ domain: "reports.example.com" });
```

## Custom domains

Serve drops at your own hostname via `client.domains.*`. Two modes: `path` (many drops at `/{slug}/`) and `dedicated` (hostname = one drop at root).

```typescript
// Connect → verify → publish loop
const { data: dom } = await client.domains.connect({ hostname: "reports.example.com", mode: "path" });
// → add CNAME reports.example.com → edge.dropthis.app
const { data: verified } = await client.domains.verify("reports.example.com");
// if verified.status !== "live", wait verified.dns[0].retryAfter seconds and re-call verify
const { data: drop } = await client.drops.publish("./report.html", {
  domain: "reports.example.com", slug: "q4-summary",
});
// → https://reports.example.com/q4-summary/
```

Dedicated domain already occupied → 409; use `updateContent(existingId, …)` or `domains.update(hostname, { dropId: newDropId })`. Path-mode content must use relative asset refs (root-relative `/…` → 422 with violations). See [../../references/domains.md](../../references/domains.md) for the full runbook.

## Workspaces

dropthis has two credential modes expressed as `KeyType`:

- **`"delegated"`** (default) — account-scoped. The key has a server-side switchable active
  workspace (`workspaces.use()`) and an optional `allowedWorkspaces` allowlist. Interactive
  login mints this type.
- **`"service"`** — pinned to one workspace at creation for CI/automation. Cannot switch
  workspace; requires `workspace` at creation.

**`client.workspaces.*`** (delegated keys only):

```typescript
// List workspaces; isActive marks the current one
const { data } = await dropthis.workspaces.list();
for (const ws of data.data) console.log(ws.slug, ws.kind, ws.isActive);

// The currently active workspace
const { data: active } = await dropthis.workspaces.active();

// Switch active workspace server-side (persists on the credential across reconnects)
await dropthis.workspaces.use("team-slug");  // slug or id
```

**Targeting a workspace on publish** (per-call override, delegated keys only):

```typescript
const { data } = await dropthis.drops.publish("<h1>Team report</h1>", {
  workspace: "team-slug",
});
console.log(data.workspace); // { id, name, slug, kind } — owning workspace echoed on every drop
```

**Client-level workspace default** (all publishes go to that workspace):

```typescript
const dropthis = new Dropthis({ apiKey: "sk_...", workspace: "team-slug" });
const { data } = await dropthis.drops.publish("./dist");
// → always targets team-slug
```

**Minting API keys:**

```typescript
// Delegated key — account-scoped, follows the active workspace (default)
await dropthis.apiKeys.create({ label: "My key" });

// Delegated key restricted to specific workspaces
await dropthis.apiKeys.create({
  label: "Dev only",
  type: "delegated",
  allowedWorkspaces: ["dev-team", "staging"],
});

// Service key pinned to one workspace — for CI/automation
await dropthis.apiKeys.create({
  label: "CI deploy",
  type: "service",
  workspace: "prod-team",
});
```

`KeyType` is `"delegated" | "service"`. Service keys: `workspace` is required at creation;
`workspaces.use()` returns 400 `workspace_pinned`.

**Reading the current workspace:** `client.account.get()` returns `data.workspace`
(`id`, `name`, `slug`, `kind`, `role`). Every drop response also echoes its owning workspace.

**Default-to-personal:** a fresh delegated login defaults to the personal workspace — no
`workspace_choice_required` 409 in the common case. That error carries `choices[]` — call
`workspaces.use(choices[n].slug)` to resolve it.

**Console is for team/member CRUD** (create workspace, invite/remove members). The SDK handles
publishing and active-workspace switching.

See [../../references/workspaces.md](../../references/workspaces.md) for the full runbook.

## Common mistakes

| Mistake | Fix |
|---------|-----|
| Accessing `data` without checking `error` | Always check `if (error)` first |
| Calling `drops.publish()` again to change a drop | `publish` always creates a NEW drop (a duplicate). Use `drops.updateContent(id, newContent)` for content or `drops.updateSettings(id, patch)` for settings |
| Using `drops.updateSettings()` to push new content | `updateSettings` is settings-only and never touches content; use `drops.updateContent(id, newContent)` to replace the files at the URL |
| Fetching a URL before publishing | Pass the `http(s)` URL straight to `drops.publish()` (or `{ kind: "source_url", sourceUrl }`) — the server fetches it. Do NOT download it yourself first. For remote assets in a multi-file drop, use `sourceUrl` on individual file entries in the `files` array instead of base64-encoding the bytes. |
| Passing the slug/URL token as `dropId` | `drops.updateContent(dropId, …)`, `drops.updateSettings(dropId, …)`, `drops.get/delete(dropId)` take the `drop_…` id — the `data.id` returned by `drops.publish()`, NOT `data.slug` or the URL token. If you only have a URL/slug, call `drops.resolve(target)` first to get the id |
| Forgetting `ifRevision` on concurrent updates | Pass `ifRevision` from the previous response to get optimistic concurrency |
| Setting `password` on publish or `updateSettings` | Pro-only — Free returns 403 `password_protection_unavailable` with `upgrade_url`. Clearing one with `password: null` is always allowed |
| Retrying `updateContent` after a timeout | `updateContent` is not idempotent — a blind retry stacks a duplicate deployment. Pass the same `idempotencyKey` to make retries safe |
| Using `uploads.*` directly for simple publishes | Use `dropthis.drops.publish()` which handles the staged upload flow automatically |
| Handing an agent `data.url` when it wants the bytes | For a single non-HTML file, `data.url` is the branded preview (HTML page with the badge), NOT the raw file. Give the agent `data.rawUrl` (the natural-path bytes); `data.url` stays the right link for a human |
| Looking for a `/_raw/` URL | There is no `/_raw/` route. Raw bytes live at the file's natural path (`data.rawUrl` for single-file drops; per-file links in the branded index, or the content read-back, for collections). Append `?download=1` to force a download |
| Importing from subpaths | Import everything from `"@dropthis/node"` -- there are no public subpath exports |
