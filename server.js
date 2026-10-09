#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { loadKnowledge } from "./src/knowledge.js";
import { reviewLuau } from "./src/review.js";
import { approxTokens, compactLuau, formatSearch, listTopics, render, search } from "./src/compress.js";

const knowledge = loadKnowledge();

// Sent to Claude once per session, so it is kept short on purpose.
const INSTRUCTIONS = `You are an experienced Roblox developer (Luau, 2D UI, Studio).
Save tokens: use search_knowledge, or a lookup with detail="brief" or an outline, then fetch only the section you need. Use detail="full" when you need the code. compress_luau output is for reading only: never save it over a user's script.
- Look up the matching topic before writing code (luau_guidelines, ui_pattern, studio_guide, gameplay_recipe, list_topics).
- Write modern Luau: --!strict, types, task library, :Connect, game:GetService, no deprecated APIs.
- Say where each script goes (container, script type) and which instances it expects.
- Never trust the client: validate every remote argument on the server.
- Build UI with scale sizing and constraints so it works on phones and desktops.
- Run non-trivial Luau through review_luau and fix what it flags.
- If Roblox Studio's own MCP tools are connected, make the change there instead of pasting: read the existing script first, change the smallest part, use the right container, then check Output or playtest. Confirm which Studio is active. Ask before deleting or overwriting anything the user did not mention. Details: studio_guide topic "studio-mcp".
- If Studio is not connected, give paste-ready code and say where it goes.
- End with short test steps and the most likely thing to go wrong.`;

const server = new McpServer(
  { name: "roblox-luau", version: "1.1.0" },
  { instructions: INSTRUCTIONS }
);

const reply = (text) => ({ content: [{ type: "text", text }] });
const fail = (text) => ({ isError: true, ...reply(text) });
const keysOf = (category) => Object.keys(knowledge[category]);

// Short parameter descriptions: every word here is sent to Claude in every session.
const detailParam = z.enum(["outline", "brief", "full", "raw"]).optional().describe("outline | brief (no code) | full (default) | raw");
const sectionParam = z.string().optional().describe("Only the section with this heading");
const budgetParam = z.number().int().min(100).max(20000).optional().describe("Approx token cap");

function registerLookup({ tool, category, arg, title, description }) {
  const keys = keysOf(category);
  if (keys.length === 0) return;
  server.registerTool(
    tool,
    {
      title,
      description,
      inputSchema: {
        [arg]: z.enum(keys),
        detail: detailParam,
        section: sectionParam,
        max_tokens: budgetParam,
      },
    },
    async (args) => {
      const entry = knowledge[category][args[arg]];
      if (!entry) return fail(`Unknown ${arg}. Available: ${keys.join(", ")}`);
      const out = render(entry.text, {
        detail: args.detail ?? "full",
        section: args.section,
        maxTokens: args.max_tokens,
      });
      return out.error ? fail(out.text) : reply(out.text);
    }
  );
}

registerLookup({
  tool: "luau_guidelines",
  category: "luau",
  arg: "topic",
  title: "Luau guidelines",
  description: "Luau best practice: types, events, modules, remotes, DataStores, performance.",
});

registerLookup({
  tool: "ui_pattern",
  category: "ui",
  arg: "pattern",
  title: "Roblox UI patterns",
  description: "2D UI layout rules and working code: menus, HUD, inventory, tweens.",
});

registerLookup({
  tool: "studio_guide",
  category: "studio",
  arg: "topic",
  title: "Roblox Studio guide",
  description: "Where scripts go, debugging, and editing Studio directly through its own MCP.",
});

registerLookup({
  tool: "gameplay_recipe",
  category: "recipes",
  arg: "recipe",
  title: "Gameplay recipes",
  description: "Complete scripts for common mechanics.",
});

server.registerTool(
  "search_knowledge",
  {
    title: "Search knowledge",
    description: "Find the best-matching sections across all guides. Cheaper than reading whole topics. Returns the exact lookup call for each hit.",
    inputSchema: {
      query: z.string().min(2),
      limit: z.number().int().min(1).max(8).optional().describe("Default 3"),
    },
  },
  async ({ query, limit }) => reply(formatSearch(search(knowledge, query, { limit: limit ?? 3 })))
);

server.registerTool(
  "review_luau",
  {
    title: "Review Luau code",
    description: "Quick checks for deprecated APIs, missing --!strict, global functions, unvalidated remotes, unprotected DataStore calls, loops with no yield.",
    inputSchema: { code: z.string().min(1) },
  },
  async ({ code }) => reply(reviewLuau(code))
);

server.registerTool(
  "compress_luau",
  {
    title: "Compress Luau for reading",
    description: "Strips comments, blank lines and trailing spaces so a long script costs fewer tokens to read. Read-only view: never write it back over a user's script.",
    inputSchema: {
      code: z.string().min(1),
      level: z.enum(["light", "aggressive"]).optional().describe("aggressive also shrinks indentation"),
    },
  },
  async ({ code, level }) => {
    const r = compactLuau(code, level ?? "light");
    const saved = Math.max(0, approxTokens(code) - approxTokens(r.code));
    return {
      content: [
        { type: "text", text: r.code },
        { type: "text", text: `(read-only view, about ${saved} tokens saved)` },
      ],
    };
  }
);

server.registerTool(
  "list_topics",
  {
    title: "List topics",
    description: "Every topic, grouped by the tool that serves it.",
  },
  async () => reply(listTopics(knowledge))
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
