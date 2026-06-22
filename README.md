<p align="center"><img src="https://dropthis.app/icon-512.png" width="76" height="76" alt="dropthis" /></p>

# Dropthis Skills

AI agent skills for the [Dropthis](https://dropthis.app) platform — the publish layer between AI and the internet. One API call in, one URL out.

## Install

```bash
npx skills add dropthis-dev/dropthis-skills
```

## Available skills

| Skill | Description |
|-------|-------------|
| [dropthis-node](skills/dropthis-node/SKILL.md) | Integrate Dropthis using the `@dropthis/node` SDK. Publish HTML, files, or directories to a permanent URL from Node.js code. |
| [dropthis-cli](skills/dropthis-cli/SKILL.md) | Operate Dropthis from the terminal, CI, or agent shell using the `@dropthis/cli`. |
| [dropthis-mcp](skills/dropthis-mcp/SKILL.md) | Publish and manage drops through the dropthis MCP server (Claude Code/Desktop, Cursor, Windsurf, ChatGPT, n8n) — local stdio or the hosted remote connector. |

## Links

- [Dropthis](https://dropthis.app)
- [Node SDK](https://github.com/dropthis-dev/dropthis-node) — `npm install @dropthis/node`
- [CLI](https://github.com/dropthis-dev/dropthis-cli) — `npm install -g @dropthis/cli`
- [MCP server](https://github.com/dropthis-dev/dropthis-mcp) — `npx @dropthis/mcp` or `https://mcp.dropthis.app/mcp`
- [OpenAPI spec](https://api.dropthis.app/openapi.json)
- [AI discovery](https://dropthis.app/llms.txt)
- [Skills discovery](https://dropthis.app/.well-known/agent-skills/index.json)

## License

MIT
