# Workspaces

A workspace owns every resource in dropthis — drops, custom domains, API keys, and the plan.
Accounts are identity-only (email, OAuth). Every account gets exactly one personal workspace at
signup. Team workspaces (ADR 0066) are shared between multiple members; each member mints their
own `sk_` key bound to that workspace. Solo users have one personal workspace and never need to
think about it.

---

## Your key is your workspace

An `sk_` API key (used by the CLI, Node SDK, and MCP server) is **bound to exactly one workspace
at mint time**. Everything you publish with that key — drops, domains, uploads — lives in that
workspace. There is no per-call workspace selector and no workspace switch on the agent surfaces;
`sk_` keys 400 on a selector and 403 on every `/v1/workspaces*` management route.

If you need to act in a different workspace, get a key minted there.

---

## Reading your workspace

Call the account endpoint to see the workspace your key is bound to. The `workspace` block
contains exactly five fields: `id`, `name`, `slug`, `kind` (`personal` | `team`), and `role`
(`owner` | `admin` | `member`).

```bash
# CLI
dropthis account

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

Personal workspace example:
```json
{ "id": "ws_01jzz000personal", "name": "Personal", "slug": "personal-abc", "kind": "personal", "role": "owner" }
```

Team workspace example:
```json
{ "id": "ws_01jzz000team", "name": "Byrokko", "slug": "byrokko", "kind": "team", "role": "member" }
```

---

## Team publishing (the payoff)

When an admin mints your key inside a **team** workspace, your publishes automatically land under
the team's shared custom domain — no extra flag required. The workspace routes the drop; you
publish as normal.

Confirm first with an account read, then publish:

```bash
# CLI — verify workspace, then publish
dropthis account
# → Workspace: Byrokko (team) · your role: member
dropthis publish ./report.html --url
# → https://pages.byrokko.com/report-abc/  (team's shared domain, automatically)

# SDK
const { data: acct } = await client.account.get();
console.log(acct.workspace.name, acct.workspace.kind);  // "Byrokko", "team"
const { data } = await client.drops.publish("./report.html");
// → data.url: https://pages.byrokko.com/report-abc/

# MCP
dropthis_account
# → "Workspace: Byrokko (team), your role: member."
dropthis_publish { "content": "<html>…</html>" }
# → url lands under the team's shared custom domain automatically

# REST
GET /v1/account           # confirms workspace.kind == "team"
POST /v1/drops            # → drop.domain == "pages.byrokko.com" (team's default domain)
```

The workspace default domain is set by the team admin in the console. Publishing with an explicit
`domain` (or `--domain` / `domain:` on any surface) still works — it overrides the default.
`--shared` (CLI) / `domain: "shared"` (SDK) / `domain: "shared"` (MCP) forces the shared pool
even when the workspace has a default custom domain.

---

## What you cannot do from here (and where to do it)

Agent surfaces (SDK / CLI / MCP) are **read-aware** — they surface the workspace on the account
read — but **not workspace-managing**. The following are console-only and cannot be done with an
`sk_` key:

| Action | Why unavailable on agent surfaces | Where to do it |
|--------|-----------------------------------|----------------|
| Create a workspace | `POST /v1/workspaces` → 403 `console_session_required` | app.dropthis.app |
| Invite or remove members | `POST /v1/workspaces/{id}/members` → 403 | app.dropthis.app |
| Switch active workspace | `PUT /v1/account/active-workspace` → 403 | app.dropthis.app |
| List all workspaces | `GET /v1/workspaces` → 403 | app.dropthis.app |
| Pass a workspace selector per publish | Any publish with `options.workspace` → 400 `workspace_selector_not_allowed` | N/A — use a key minted in the target workspace |

To publish into a different workspace, get a key minted in that workspace from the console.

---

## Error reference

A well-behaved SDK / CLI / MCP never sends a workspace selector, so an agent should not normally
encounter these codes. They are listed here for completeness and for raw REST API users.

| HTTP | Code | Meaning | Fix |
|------|------|---------|-----|
| 400 | `workspace_selector_not_allowed` | The request included a per-call workspace selector; `sk_` keys are bound at mint time and do not accept a selector | Remove the `options.workspace` / `workspace_id` field from the request |
| 403 | `console_session_required` | The endpoint (`/v1/workspaces*`, active-workspace switch, member management) requires a console browser session — `sk_` and `at_` tokens are rejected | Use the console at app.dropthis.app |
| 409 | `workspace_mismatch` | The resource (drop, domain) belongs to a different workspace than the one the key is bound to | Use a key minted in the correct workspace |
| 409 | `seat_limit_reached` | The team workspace has reached its member seat limit | Upgrade the workspace plan or remove unused members in the console |
