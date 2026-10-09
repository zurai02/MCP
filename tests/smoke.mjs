import assert from "node:assert/strict";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const transport = new StdioClientTransport({ command: process.execPath, args: ["server.js"] });
const client = new Client({ name: "smoke-test", version: "0.0.0" });
await client.connect(transport);

const text = (res) => res.content[0].text;

// 1. Tools are registered
const { tools } = await client.listTools();
const names = tools.map((t) => t.name);
for (const expected of ["luau_guidelines", "ui_pattern", "studio_guide", "gameplay_recipe", "review_luau", "list_topics"]) {
  assert.ok(names.includes(expected), `missing tool: ${expected}`);
}

// 2. Lookups return knowledge
const guide = await client.callTool({ name: "luau_guidelines", arguments: { topic: "types" } });
assert.match(text(guide), /--!strict/);

const ui = await client.callTool({ name: "ui_pattern", arguments: { pattern: "layout-rules" } });
assert.match(text(ui), /UDim2/);

const place = await client.callTool({ name: "studio_guide", arguments: { topic: "placement" } });
assert.match(text(place), /ServerScriptService/);

const recipe = await client.callTool({ name: "gameplay_recipe", arguments: { recipe: "kill-brick" } });
assert.match(text(recipe), /Touched/);

const topics = await client.callTool({ name: "list_topics", arguments: {} });
assert.match(text(topics), /recipes:/);

// 3. Reviewer flags bad code
const bad = await client.callTool({
  name: "review_luau",
  arguments: { code: "function onTouch(hit)\n  wait(1)\nend\npart.Touched:connect(onTouch)" },
});
assert.match(text(bad), /task\.wait/);
assert.match(text(bad), /:Connect/);
assert.match(text(bad), /Global function/);

// 4. Reviewer passes good code
const good = await client.callTool({
  name: "review_luau",
  arguments: {
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
  },
});
assert.match(text(good), /No issues/);

await client.close();
console.log("All smoke tests passed.");
