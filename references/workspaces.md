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
for (const ws of data.workspaces) console.log(ws.slug, ws.kind, ws.isActive);

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

## Managing a team from an agent (ADR 0068 — capability scopes)

Capability follows the **credential's scopes**, not the surface. A plain `dropthis login` / OAuth
grant is **publish-only** — it can create drops and switch workspaces but cannot create or manage
teams (`403 insufficient_scope`). To run a team from an agent, get a **team-scoped credential**:

```bash
# CLI — mint a team-capable login key (the scope rides on the non-interactive verify step)
dropthis login request --email you@example.com
dropthis login verify --email you@example.com --otp <code> --scope team
dropthis whoami                      # shows: Scopes: …, workspaces:write, members:write
```

```typescript
// SDK — downscope-only: granted = requested ∩ your own scopes
const { data } = await client.apiKeys.create({ label: "team agent", scopes: ["team"] });
```

A session (`team`) bundles `workspaces:write` + `members:write`; destructive ops (delete workspace,
remove member, **transfer ownership**) need the `team-admin` bundle. `account:delete`,
`credentials:admin`, and `domains:admin` are never bundled.

### Create + manage a workspace

```bash
# CLI — create returns the ws_… id; rename/delete/members take that id (NOT the slug)
dropthis workspace create "Acme" --slug acme           # → { "id": "ws_team123", "slug": "acme", … }
dropthis members invite ws_team123 --email teammate@acme.com --role member
dropthis members list ws_team123
dropthis members role ws_team123 acc_123 --role admin   # role changes need team-admin (members:admin)
dropthis members remove ws_team123 acc_123 --yes        # removing others needs team-admin
dropthis workspace rename ws_team123 --name "Acme Inc"
dropthis workspace delete ws_team123 --yes              # delete needs team-admin (workspaces:admin)
```

```
# MCP
dropthis_create_workspace { "name": "Acme", "slug": "acme" }
dropthis_invite_member { "workspace": "ws_…", "email": "teammate@acme.com", "role": "member" }
dropthis_members { "workspace": "ws_…" }
dropthis_update_member_role { "workspace": "ws_…", "account_id": "acc_123", "role": "owner", "confirm": true }
dropthis_remove_member { "workspace": "ws_…", "account_id": "acc_123", "confirm": true }
dropthis_delete_workspace { "workspace": "ws_…", "confirm": true }
```

```typescript
// SDK
await client.workspaces.create({ name: "Acme", slug: "acme" });
await client.members.invite("ws_…", { email: "teammate@acme.com", role: "member" });
await client.members.list("ws_…");
await client.members.updateRole("ws_…", "acc_123", { role: "admin" });
await client.workspaces.delete("ws_…");
```

### Accept an invite (the teammate's join path)

The invited teammate, authenticated as their own account (their email), accepts and is switched
into the workspace — no raw token needed when they go by id:

```bash
# CLI
dropthis invitations                              # list your pending invites
dropthis invitations accept --token <raw-token>   # by the email's token
dropthis invitations accept-by-id inv_123         # by id (already authenticated as the invited email)
```

```
# MCP
dropthis_invitations
dropthis_accept_invitation { "invitation_id": "inv_123" }   # or { "token": "…" }
```

```typescript
// SDK
await client.invitations.list();
await client.invitations.acceptById({ invitationId: "inv_123" });   // or .accept({ token })
```

Acceptance reuses the OTP login proof and switches the active workspace, so the next publish lands
in the shared team workspace.

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
| 403 | `insufficient_scope` | The credential lacks the scope for a team operation (e.g. a publish-only key tried to create/invite) | Re-authenticate with a team-scoped credential: `dropthis login request --email <you>` then `dropthis login verify --email <you> --otp <code> --scope team`, or `apiKeys.create({ scopes: ["team"] })` |
| 409 | `seat_limit_reached` | The team workspace has reached its member seat limit | Upgrade the workspace plan, or remove unused members (`dropthis members remove` / `dropthis_remove_member`) |
