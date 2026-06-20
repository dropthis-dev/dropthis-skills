# Workspaces

A workspace owns every resource in dropthis — drops, custom domains, API keys, and the plan.
Accounts are identity-only (email, OAuth). Every account gets exactly one personal workspace at
signup. Team workspaces (ADR 0066) are shared between multiple members; each member can use their
own credential that targets that workspace. Solo users have one personal workspace and never need
to think about it.

---

## Credential modes

dropthis has two `KeyType` values that behave differently around workspace routing:

### Delegated key (`"delegated"`)

Minted by `dropthis login` (interactive) or `apiKeys.create({ type: "delegated" })`. Account-scoped:
the key has a **server-side switchable active workspace** stored on the `api_keys` row.

- The active workspace starts at the personal workspace (or whichever was active when the key was
  minted) and can be changed at any time without re-minting.
- An optional `allowedWorkspaces` allowlist restricts which workspaces the key can target.
- This is the **default** type — use it for interactive login, agent sessions, and any flow that
  may need to switch teams.

### Service key (`"service"`)

Minted via `apiKeys.create({ type: "service", workspace: "<slug-or-id>" })`. Pinned to one
workspace for the lifetime of the key.

- `workspace` is **required** at creation and cannot be changed.
- Sending a workspace switch request with a service key → 400 `workspace_pinned`.
- Use for CI/automation where the target must be stable and explicit.

### Browser clients (web console + extension) — session principals

The dropthis web console and browser extension sign in as **session** principals (email → a
short-lived `at_` access token + a rotating `rt_` refresh token), not delegated keys. Their active
workspace lives on the **account** (`account.active_workspace_id`), so the two share one "current
context" — switching the workspace in the extension is reflected in the console, and vice versa.
Delegated keys (CLI / MCP) keep a **per-credential** active workspace, so an agent's context is
independent of the human's browser. Both feed the **same** resolution precedence (per-call override →
the credential's active workspace → ask only when genuinely unresolvable), and every drop response
names its workspace. (ADR 0067.)

---

## The switch endpoint

`PUT /v1/account/active-workspace { "workspace": "<slug-or-id>" }` — principal-aware:

- **Delegated key** → switches the key's active workspace server-side. Persists across
  reconnects. The next publish (on any surface) lands in the new workspace.
- **Service key** → 400 `workspace_pinned` (pinned keys cannot switch).

---

## Reading your workspace

```bash
# CLI
dropthis account
# → Workspace: Byrokko (team) · your role: member

# SDK
const { data } = await client.account.get();
// data.workspace → { id, name, slug, kind, role }

# MCP
dropthis_account
# → structuredContent.workspace + text: "Workspace: Byrokko (team), your role: member"

# REST
GET /v1/account
# → { ..., "workspace": { "id": "ws_…", "name": "Byrokko", "slug": "byrokko", "kind": "team", "role": "member" } }
```

Every drop response also echoes `workspace: { id, name, slug, kind }` — you always know which
workspace a publish landed in without a separate account read.

Personal workspace example:
```json
{ "id": "ws_01jzz000personal", "name": "Personal", "slug": "personal-abc", "kind": "personal", "role": "owner" }
```

Team workspace example:
```json
{ "id": "ws_01jzz000team", "name": "Byrokko", "slug": "byrokko", "kind": "team", "role": "member" }
```

---

## Switching workspace (per surface)

### MCP

```
# Step 1: see what workspaces are available (isActive marks the current one)
dropthis_workspaces

# Step 2: switch
dropthis_use_workspace { "workspace": "byrokko" }
# → "Switched to workspace: Byrokko (byrokko, team)"

# Subsequent publishes land in byrokko
dropthis_publish { "content": "<html>…</html>" }
```

`dropthis_use_workspace` is delegated-key only. The choice persists server-side across
reconnects — you do NOT need to re-switch on every session.

### CLI

```bash
dropthis workspace list          # list workspaces; * marks the active one
dropthis workspace use byrokko   # switch active workspace (delegated keys only)
dropthis account                 # verify: "Workspace: Byrokko (team)"

# Per-publish override (does NOT change the active workspace)
dropthis publish ./report.html --workspace byrokko --url

# CI: mint a service key pinned to prod-team
dropthis api-keys create --service --workspace prod-team --label "CI deploy"
```

### SDK

```typescript
// List workspaces; isActive marks the current one
const { data } = await dropthis.workspaces.list();
for (const ws of data.data) console.log(ws.slug, ws.kind, ws.isActive);

// Switch active workspace server-side (persists on the credential)
await dropthis.workspaces.use("byrokko");   // slug or id

// The currently active workspace
const { data: active } = await dropthis.workspaces.active();

// Per-call override (does NOT change the active workspace)
const { data } = await dropthis.drops.publish("<h1>Report</h1>", {
  workspace: "byrokko",
});

// Client-level default
const dropthis = new Dropthis({ apiKey: "sk_...", workspace: "byrokko" });
```

---

## Team publishing (the payoff)

Once the active workspace (or the per-call `workspace` option) targets a **team** workspace, your
publishes automatically land under the team's shared custom domain — no extra flag required.

```bash
# CLI — switch once, then publish as normal
dropthis workspace use byrokko
dropthis publish ./report.html --url
# → https://pages.byrokko.com/report-abc/  (team's shared domain)

# MCP
dropthis_use_workspace { "workspace": "byrokko" }
dropthis_publish { "content": "<html>…</html>" }
# → url lands under the team's shared custom domain

# SDK
await dropthis.workspaces.use("byrokko");
const { data } = await dropthis.drops.publish("./report.html");
// → data.url: https://pages.byrokko.com/report-abc/
```

Publishing with an explicit `domain` (or `--domain`) still overrides the workspace default.
`--shared` (CLI) / `domain: "shared"` (SDK/MCP) forces the shared pool even when the workspace
has a default custom domain.

---

## Default-to-personal

A fresh delegated key (including right after `dropthis login`) starts with the personal workspace
active. A plain `dropthis publish` will land there — there is **no** 409 `workspace_choice_required`
in the common case. That error only fires for a genuinely unresolvable situation (e.g., the key's
allowedWorkspaces excludes all default candidates). When it does fire, its body carries `choices[]`
— pick one and switch.

---

## What you cannot do from agent surfaces (console-only)

Agent surfaces (SDK / CLI / MCP) handle publishing and active-workspace switching. The following
require a console browser session:

| Action | Why unavailable on agent surfaces | Where to do it |
|--------|-----------------------------------|----------------|
| Create a workspace | `POST /v1/workspaces` → 403 `console_session_required` | app.dropthis.app |
| Invite or remove members | `POST /v1/workspaces/{id}/members` → 403 | app.dropthis.app |
| List all workspaces (admin view) | `GET /v1/workspaces` → 403 | app.dropthis.app |

To publish into a workspace the key does not have access to, get a delegated key that includes
it in its `allowedWorkspaces`, or switch to it via `workspaces.use()` / `workspace use` / `dropthis_use_workspace`.

---

## Error reference

| HTTP | Code | Meaning | Fix |
|------|------|---------|-----|
| 400 | `workspace_pinned` | A service key tried to switch workspace | Service keys cannot switch; use a delegated key or mint a new service key for the target workspace |
| 400 | `workspace_selector_not_allowed` | A service key included a per-call `workspace` selector | Service keys are pinned; remove the `workspace` option, or use a delegated key |
| 401 | `invalid_api_key` | The API key is invalid or expired | Run `dropthis login` to get a fresh delegated key |
| 404 | `workspace_not_found` | The slug or id does not match any accessible workspace | Use `dropthis_workspaces` / `workspace list` / `workspaces.list()` to see valid slugs |
| 409 | `workspace_choice_required` | Publish couldn't resolve a workspace automatically | Body carries `choices[]` — call `dropthis_use_workspace` / `workspace use` / `workspaces.use()` with one of the slugs |
| 409 | `workspace_mismatch` | The resource belongs to a different workspace than the key targets | Target the correct workspace with `workspaces.use()` or a per-call `workspace` option |
| 409 | `seat_limit_reached` | The team workspace has reached its member seat limit | Upgrade the workspace plan or remove unused members in the console |
