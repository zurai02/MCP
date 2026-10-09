// End-to-end test: starts the real server over stdio and calls every tool.
// Needs `npm install` first. The SDK-free tests are in test/unit.mjs.
import assert from "node:assert/strict";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const transport = new StdioClientTransport({ command: process.execPath, args: ["server.js"] });
const client = new Client({ name: "smoke-test", version: "0.0.0" });
await client.connect(transport);

const text = (res, i = 0) => res.content[i].text;
const call = (name, args = {}) => client.callTool({ name, arguments: args });

// 1. Tools are registered
const { tools } = await client.listTools();
const names = tools.map((t) => t.name);
for (const expected of [
  "luau_guidelines", "ui_pattern", "studio_guide", "gameplay_recipe",
  "review_luau", "list_topics", "search_knowledge", "compress_luau",
]) {
  assert.ok(names.includes(expected), `missing tool: ${expected}`);
}

// 2. Lookups return knowledge
assert.match(text(await call("luau_guidelines", { topic: "types" })), /--!strict/);
assert.match(text(await call("ui_pattern", { pattern: "layout-rules" })), /UDim2/);
assert.match(text(await call("studio_guide", { topic: "placement" })), /ServerScriptService/);
assert.match(text(await call("studio_guide", { topic: "studio-mcp" })), /Manage MCP Servers/);
assert.match(text(await call("gameplay_recipe", { recipe: "kill-brick" })), /Touched/);
assert.match(text(await call("list_topics")), /gameplay_recipe\(recipe\):/);

// 3. Compression options
const full = text(await call("gameplay_recipe", { recipe: "round-system" }));
const brief = text(await call("gameplay_recipe", { recipe: "round-system", detail: "brief" }));
const outline = text(await call("gameplay_recipe", { recipe: "round-system", detail: "outline" }));
assert.ok(brief.length < full.length * 0.8, "brief should be clearly smaller than full");
assert.ok(outline.length < brief.length, "outline should be smaller than brief");
assert.match(brief, /omitted/);

const section = text(await call("luau_guidelines", { topic: "remotes", section: "Rules" }));
assert.match(section, /first argument on the server is always the `Player`/);
assert.doesNotMatch(section, /Server handler with validation/);

const capped = text(await call("ui_pattern", { pattern: "inventory-grid", detail: "raw", max_tokens: 200 }));
assert.match(capped, /Cut to about 200 tokens/);

const badSection = await call("luau_guidelines", { topic: "remotes", section: "does not exist" });
assert.equal(badSection.isError, true);

// 4. Search
assert.match(text(await call("search_knowledge", { query: "validate remote arguments" })), /luau_guidelines\(topic="remotes"/);
assert.match(text(await call("search_knowledge", { query: "zzzzqqq" })), /No match/);

// 5. compress_luau
const source = '--!strict\n-- a comment\nlocal s = "keep -- this"\n\n\nlocal x = 1 -- trailing\n';
const packed = await call("compress_luau", { code: source });
assert.equal(text(packed), '--!strict\nlocal s = "keep -- this"\nlocal x = 1');
assert.match(text(packed, 1), /read-only/);

// 6. Reviewer flags bad code, groups repeats, passes good code
const bad = await call("review_luau", { code: "function onTouch(hit)\n  wait(1)\nend\npart.Touched:connect(onTouch)" });
assert.match(text(bad), /task\.wait/);
assert.match(text(bad), /:Connect/);
assert.match(text(bad), /Global function/);

const repeated = text(await call("review_luau", { code: "--!strict\nwait(1)\nwait(2)\nwait(3)" }));
assert.equal(repeated.split("\n").filter((l) => l.startsWith("- ")).length, 1);

const good = await call("review_luau", {
  code: [
    "--!strict",
    'local Players = game:GetService("Players")',
    "local part = script.Parent :: BasePart",
    "part.Touched:Connect(function(hit: BasePart)",
    "\tlocal character = hit.Parent :: Model?",
    "\tlocal player = character and Players:GetPlayerFromCharacter(character)",
    "\tif not player then return end",
    "end)",
  ].join("\n"),
});
assert.match(text(good), /No issues/);

await client.close();
console.log("All smoke tests passed.");
