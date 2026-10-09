# Roblox Luau MCP

An MCP server that gives Claude the working habits of an experienced Roblox developer: strict, modern Luau, clean 2D UI, sensible Studio structure, and ready-to-paste gameplay scripts.

Site: https://zurai02.github.io/MCP/
Install guide: https://zurai02.github.io/MCP/mcp.html

## What it gives Claude

| Tool | What it does |
| --- | --- |
| `luau_guidelines` | Best practice for types, events and tasks, modules, remotes, DataStores, performance |
| `ui_pattern` | Layout rules and working code for menus, HUDs, inventories and tweens |
| `studio_guide` | Where scripts and assets go in Studio, and how to debug from the Output |
| `gameplay_recipe` | Complete scripts: kill brick, coin pickup, checkpoints, round system |
| `review_luau` | Quick checks for deprecated APIs, missing `--!strict`, unvalidated remotes, unprotected DataStore calls, loops that never yield |
| `list_topics` | Lists everything above |

It also provides a `roblox_developer` prompt that starts a chat in "experienced Roblox developer" mode, and server instructions that tell Claude to look things up, validate remotes, and say where each script goes.

The server reads guidance from the Markdown files in `knowledge/`. It does not edit Roblox Studio directly. Claude writes the code and tells you where to put it.

## Install

You need Node.js 18 or newer.

**Claude Desktop:** open Settings, Developer, Edit Config, and add this to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "roblox-luau": {
      "command": "npx",
      "args": ["-y", "github:zurai02/MCP"]
    }
  }
}
```

Quit and reopen Claude fully.

**Claude Code:**

```bash
claude mcp add --transport stdio roblox-luau -- npx -y github:zurai02/MCP
```

**From a local clone:**

```bash
git clone https://github.com/zurai02/MCP.git
cd MCP
npm install
npm test
```

Then point `command` at `node` and `args` at the full path of `server.js`.

## Add your own knowledge

Drop a `.md` file into one of the folders. No code changes needed. Start the file with a `# Title` line, which becomes its entry in `list_topics`.

```
knowledge/
  luau/       -> luau_guidelines
  ui/         -> ui_pattern
  studio/     -> studio_guide
  recipes/    -> gameplay_recipe
```

Restart the server to pick up new files.

## Tests

```bash
npm test
```

Starts the server over stdio and calls every tool.

## Hosting the website

`index.html` in the repo root is the project site. In the repo's Settings, Pages, deploy from the `main` branch, root folder.

## Notes

Independent project. Not affiliated with Roblox Corporation.
