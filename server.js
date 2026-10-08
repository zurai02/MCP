#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { loadKnowledge } from "./src/knowledge.js";
import { reviewLuau } from "./src/review.js";

const knowledge = loadKnowledge();

const INSTRUCTIONS = `You are working as an experienced Roblox developer. When the user asks for Luau code, UI, builds or help in Roblox Studio:
- Look up the matching topic with the tools before writing code (luau_guidelines, ui_pattern, studio_guide, gameplay_recipe). Use list_topics to see what exists.
- Write modern Luau: --!strict, type annotations, the task library, :Connect, game:GetService, no deprecated APIs.
- Say first where each script goes (container and script type) and list every instance it expects, with names and classes.
- Never trust the client. Validate every RemoteEvent and RemoteFunction argument on the server.
- Build UI with scale-based sizing and constraints so it works on phones and desktops.
- Before presenting non-trivial Luau, run it through review_luau and fix what it flags.
- End with short test steps for Studio and the most likely thing to go wrong.`;

const server = new McpServer(
  { name: "roblox-luau", version: "1.0.0" },
  { instructions: INSTRUCTIONS }
);

const reply = (text) => ({ content: [{ type: "text", text }] });
const keysOf = (category) => Object.keys(knowledge[category]);

function registerLookup({ tool, category, arg, title, description }) {
  const keys = keysOf(category);
  if (keys.length === 0) return;
  server.registerTool(
    tool,
    {
      title,
      description: `${description} Available: ${keys.join(", ")}.`,
      inputSchema: { [arg]: z.enum(keys).describe(`One of: ${keys.join(", ")}`) },
    },
    async (args) => {
      const entry = knowledge[category][args[arg]];
      if (!entry) {
        return { isError: true, ...reply(`Unknown ${arg}. Available: ${keys.join(", ")}`) };
      }
      return reply(entry.text);
    }
  );
}

registerLookup({
  tool: "luau_guidelines",
  category: "luau",
  arg: "topic",
  title: "Luau guidelines",
  description: "Get best-practice guidance and examples for writing Luau (types, performance, events, modules, errors, remotes, DataStores).",
});

registerLookup({
  tool: "ui_pattern",
  category: "ui",
  arg: "pattern",
  title: "Roblox UI patterns",
  description: "Get layout rules and working code for building 2D Roblox UI (menus, HUDs, inventories, tweens).",
});

registerLookup({
  tool: "studio_guide",
  category: "studio",
  arg: "topic",
  title: "Roblox Studio guide",
  description: "Learn where scripts and assets belong in Roblox Studio and how to work through a build-test-fix loop.",
});

registerLookup({
  tool: "gameplay_recipe",
  category: "recipes",
  arg: "recipe",
  title: "Gameplay recipes",
  description: "Get a complete, ready-to-paste script for a common game mechanic.",
});

server.registerTool(
  "review_luau",
  {
    title: "Review Luau code",
    description:
      "Run quick checks on Luau code for deprecated APIs, missing strict mode, global functions, unvalidated remotes, unprotected DataStore calls and loops that never yield. Returns a list of issues with line numbers and fixes.",
    inputSchema: { code: z.string().min(1).describe("The Luau source to check") },
  },
  async ({ code }) => reply(reviewLuau(code))
);

server.registerTool(
  "list_topics",
  {
    title: "List topics",
    description: "List every guideline, UI pattern, Studio guide and recipe this server can provide.",
  },
  async () => {
    const sections = Object.entries(knowledge).map(([category, entries]) => {
      const rows = Object.values(entries).map((e) => `  - ${e.name}: ${e.title}`);
      return `${category}:\n${rows.join("\n")}`;
    });
    return reply(sections.join("\n\n"));
  }
);

server.registerPrompt(
  "roblox_developer",
  {
    title: "Roblox developer mode",
    description: "Start a chat where Claude works like an experienced Roblox developer.",
    argsSchema: { task: z.string().optional().describe("What you want to build or fix") },
  },
  ({ task }) => ({
    messages: [
      {
        role: "user",
        content: {
          type: "text",
          text: `${INSTRUCTIONS}\n\nTask: ${task || "(I will describe it next.)"}`,
        },
      },
    ],
  })
);

await server.connect(new StdioServerTransport());
console.error("roblox-luau MCP server running on stdio");
