# Custom domains

Custom domains let you serve drops at your own hostname instead of the shared `dropthis.app` pool.
Two modes: **path** (one domain, many drops at `/{slug}/`) and **dedicated** (one domain, exactly one drop at the root).

DNS target: `CNAME <your-hostname> → edge.dropthis.app`

---

## Lifecycle

### 1. Connect

```bash
# CLI
dropthis domains connect reports.example.com --mode path

# SDK
const { data } = await client.domains.connect({ hostname: "reports.example.com", mode: "path" });

# MCP
dropthis_domains_connect { hostname: "reports.example.com", mode: "path" }

# REST
POST /v1/domains  { "hostname": "reports.example.com", "mode": "path" }
```

Response includes `dns` instructions:

| Field | Value |
|-------|-------|
| type | CNAME |
| name | reports.example.com |
| value | edge.dropthis.app |
| status | missing |

Create the CNAME at your DNS provider pointing `reports.example.com → edge.dropthis.app`. Apex domains may require ANAME/ALIAS or a www fallback — the `dns[].hint` field notes this.

### 2. Verify

Verification is **non-blocking**. Call verify; if propagation is still in progress, re-call after `retry_after` seconds.

```bash
# CLI (one-shot)
dropthis domains verify reports.example.com

# CLI (wait loop, max 5 min)
dropthis domains verify reports.example.com --wait --timeout 300

# SDK
const { data } = await client.domains.verify("reports.example.com");
// data.status: "pending_dns" | "verifying" | "live" | "failed"
// data.dns[0].retryAfter: seconds to wait before re-calling

# MCP
dropthis_domains_verify { domain: "reports.example.com" }

# REST
POST /v1/domains/reports.example.com/verify
```

Status progression: `pending_dns` → `verifying` → `live`. On `failed`, `failure_reason` explains why.

When a path-mode domain first reaches `live` and the account has no default domain, it is automatically set as the default publish target for that account.

### 3. Publish to the domain

Once `live`, `publish` with `domain` to land on your hostname.

```bash
# CLI — path mode (lands at https://reports.example.com/<slug>/)
dropthis publish ./report.html --domain reports.example.com --slug q4-summary --url

# CLI — dedicated mode (lands at https://mybio.example.com/)
dropthis publish ./bio/index.html --domain mybio.example.com --url

# SDK
const { data } = await client.drops.publish("./report.html", {
  domain: "reports.example.com",
  slug: "q4-summary",
});

# MCP
dropthis_publish { content: "<html>…</html>", domain: "reports.example.com", slug: "q4-summary" }
```

If `domain` is omitted, the account default path-domain is used (if set); otherwise the drop lands on the shared pool.

---

## Modes

### path mode

- One domain, many drops. Each drop lives at `https://{hostname}/{slug}/`.
- Vanity slugs are per-domain. Collision → auto-suffix with warning: `slug_suffixed`.
- `slug` must match `^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$`, no leading/trailing/double hyphens.
- `updateSettings({ slug: "new-name" })` renames the drop on the same domain. Collision → 409, never auto-suffixed.
- `updateSettings({ domain: null })` moves the drop back to the shared pool; `slug` is cleared.
- **Path-safe content required.** Root-relative refs (e.g. `href="/about"`) break under a subpath. The server scans and rejects with 422 if violations found.

### dedicated mode

- One domain, one drop. Drop served at the root `https://{hostname}/`.
- Only one drop can occupy a dedicated domain at a time.
- Vanity slugs do NOT apply (there is no slug in a dedicated URL).
- Publishing onto an already-occupied dedicated domain → **409** carrying `drop_id` (the existing occupant) and recovery hints:
  - Replace content: `update_content(existingDropId, newContent)`
  - Repoint domain to a new drop: `domains.update(hostname, { dropId: newDropId })`

---

## Path-safe content (path-mode requirement)

Generates a 422 with `violations` list when path-unsafe content is published to a path-mode domain.

```json
{
  "code": "validation_error",
  "violations": [
    { "path": "index.html", "line": 12, "ref": "/styles/app.css", "attr": "href" }
  ]
}
```

Fix: change root-relative refs to relative (`styles/app.css` or `./styles/app.css`), then re-publish.
Protocol-relative refs (`//cdn.example.com/…`) are safe.

---

## Vanity slugs

Path-mode only. Supplied on publish via `--slug` flag / `slug` option.

| Case | Behavior |
|------|----------|
| Slug available | Used as-is |
| Slug taken on same domain | Auto-suffixed (e.g. `q4-summary-4xk2`), `slug_suffixed` warning in response |
| Slug on shared pool | 422 — vanity slugs require a path-mode custom domain |
| Explicit rename collision | 409 — never auto-suffixed on `updateSettings` |

---

## Domain management

### List

```bash
dropthis domains list
# SDK: client.domains.list()
# MCP: dropthis_domains_list
# REST: GET /v1/domains
```

### Get / status

```bash
dropthis domains status reports.example.com --json
# SDK: client.domains.get("reports.example.com")
# MCP: (no dedicated get tool — use dropthis_domains_list and filter)
# REST: GET /v1/domains/reports.example.com
```

### Update

Only `dropId` (dedicated — repoint to a different drop) and `default` (path-mode — set as account default) are mutable.
Mode is immutable — delete and reconnect to change mode.

```bash
# Repoint a dedicated domain to a new drop
dropthis domains update mybio.example.com --drop drop_abc123

# Set a path domain as default
dropthis domains update reports.example.com --default

# SDK
await client.domains.update("mybio.example.com", { dropId: "drop_abc123" });
await client.domains.update("reports.example.com", { default: true });

# MCP
dropthis_domains_update { domain: "mybio.example.com", drop_id: "drop_abc123" }

# REST: PATCH /v1/domains/mybio.example.com  { "drop_id": "drop_abc123" }
```

Repointing a dedicated domain unmounts the previous occupant (drop status → `unmounted`).

### Delete

```bash
dropthis domains remove reports.example.com

# SDK: await client.domains.delete("reports.example.com")
# MCP: dropthis_domains_delete { domain: "reports.example.com", confirm: true }
# REST: DELETE /v1/domains/reports.example.com
```

**After deleting:** remove the CNAME from your DNS provider. The delete response carries an explicit warning: "Remove your DNS record for reports.example.com: while your CNAME still points at edge.dropthis.app, the hostname could be re-connected by another dropthis account." Drops mounted on the domain are unmounted (status → `unmounted`). The `is_default` flag is cleared; no auto-promotion of another domain.

---

## Error reference

| HTTP | Code | Discriminator | Meaning | Fix |
|------|------|---------------|---------|-----|
| 409 | `conflict` | `extra.drop_id` present | Dedicated domain occupied — `extra.drop_id` is the current occupant | Call `update_content(extra.drop_id, …)` to replace its content, or `domains.update(hostname, { drop_id: newDropId })` to repoint |
| 409 | `conflict` | No `extra.drop_id` | Hostname already connected to a different account | Use a different hostname |
| 422 | `validation_error` | `violations[]` present | Path-safe content gate failed — `violations[{path, line, ref, attr}]` lists root-relative refs | Change root-relative refs to relative (`./styles.css`, not `/styles.css`), then re-publish |
| 422 | `validation_error` | `detail` contains "mode is immutable" | Tried to change mode on an existing domain | Delete the domain and reconnect with the desired mode |
| 422 | `validation_error` | Other | Request field invalid (see `param`) | Fix the named field and retry |
| 404 | `not_found` | — | Domain id or hostname not found | Check the id/hostname and retry |

---

## List the drops on a domain

```bash
dropthis list --domain reports.example.com --json
# REST: GET /v1/drops?domain=reports.example.com
# curl: curl -H "Authorization: Bearer $DROPTHIS_API_KEY" "https://api.dropthis.app/v1/drops?domain=reports.example.com"
# SDK: await client.drops.list({ domain: "reports.example.com" })
# MCP: dropthis_list with domain="reports.example.com"
```

The recovery path when you have a custom-domain URL but lost the `drop_…` id.

---

## Complete flow example (path mode)

```bash
# 1. Connect
dropthis domains connect reports.example.com --mode path

# 2. Add CNAME at your DNS provider:
#    reports.example.com  CNAME  edge.dropthis.app

# 3. Verify (retry if still propagating)
dropthis domains verify reports.example.com --wait

# 4. Publish with vanity slug
dropthis publish ./q4.html --domain reports.example.com --slug q4-summary --url
# → https://reports.example.com/q4-summary/

# 5. Update content (same URL)
dropthis update-content drop_abc123 ./q4-v2.html --url

# 6. List drops on this domain
dropthis list --domain reports.example.com --json
```
