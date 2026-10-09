// Tests for everything that does not need the MCP SDK. Run with: node test/unit.mjs
import assert from "node:assert/strict";
import { loadKnowledge } from "../src/knowledge.js";
import { reviewLuau } from "../src/review.js";
import {
  approxTokens, compactLuau, parseSections, render, search, formatSearch, listTopics,
} from "../src/compress.js";

let passed = 0;
const test = (name, fn) => {
  try { fn(); passed++; } catch (e) { console.error(`FAIL: ${name}\n`, e.message); process.exitCode = 1; }
};

/* ---------- compactLuau ---------- */
test("strips line and block comments, blank lines, trailing spaces", () => {
  const src = "--!strict\n-- hello\nlocal a = 1   -- trailing\n\n\n--[[ block\nspans lines ]]\nlocal b = 2  \n--[==[ x ]==]\n";
  assert.equal(compactLuau(src).code, "--!strict\nlocal a = 1\nlocal b = 2");
});

test("leaves comment markers inside strings alone", () => {
  const src = 'local s = "a -- not a comment"\nlocal t = \'--[[ nope ]]\' -- real comment\nlocal u = `x -- {1 + 1} --`';
  assert.equal(
    compactLuau(src).code,
    'local s = "a -- not a comment"\nlocal t = \'--[[ nope ]]\'\nlocal u = `x -- {1 + 1} --`'
  );
});

test("keeps long strings exactly, including blank lines and dashes", () => {
  const src = "local s = [[\nline one\n\n-- keep me\n]]\n-- gone\nlocal t = [==[ ]] -- still inside ]==]";
  assert.equal(
    compactLuau(src).code,
    "local s = [[\nline one\n\n-- keep me\n]]\nlocal t = [==[ ]] -- still inside ]==]"
  );
});

test("handles escaped quotes and unterminated strings without crashing", () => {
  assert.equal(compactLuau('local s = "say \\"hi\\" -- x"').code, 'local s = "say \\"hi\\" -- x"');
  assert.doesNotThrow(() => compactLuau('local s = "oops\nlocal x = 1 -- c'));
  assert.doesNotThrow(() => compactLuau("--[[ never closed\nlocal x = 1"));
});

test("is idempotent and keeps CRLF input working", () => {
  const once = compactLuau("local a = 1 -- c\r\n\r\nlocal b = 2\r\n").code;
  assert.equal(once, "local a = 1\nlocal b = 2");
  assert.equal(compactLuau(once).code, once);
});

test("aggressive shrinks space indentation to one tab per level", () => {
  const src = "if x then\n    if y then\n        run()\n    end\nend";
  assert.equal(compactLuau(src, "aggressive").code, "if x then\n\tif y then\n\t\trun()\n\tend\nend");
  assert.equal(compactLuau(src, "light").code, src);
});

/* ---------- sections and render ---------- */
const DOC = [
  "# Title", "Intro line.", "",
  "## Rules", "- one", "- two", "",
  "```lua", "-- a comment", "local x = 1", "", "", "print(x)", "```", "",
  "### Sub rule", "Nested text.", "",
  "## Other", "Other text.", "",
  "```lua", "# not a heading", "```",
].join("\n");

test("parseSections ignores # inside code fences", () => {
  assert.deepEqual(parseSections(DOC).map((s) => s.heading), ["Title", "Rules", "Sub rule", "Other"]);
});

test("brief drops code blocks, full compacts them, raw keeps them", () => {
  assert.match(render(DOC, { detail: "brief" }).text, /\[lua omitted, 5 lines\]/);
  assert.doesNotMatch(render(DOC, { detail: "brief" }).text, /local x/);
  const full = render(DOC, { detail: "full" }).text;
  assert.match(full, /local x = 1\nprint\(x\)/);
  assert.doesNotMatch(full, /a comment/);
  assert.match(render(DOC, { detail: "raw" }).text, /a comment/);
});

test("outline lists headings with one line each", () => {
  const o = render(DOC, { detail: "outline" }).text;
  assert.match(o, /^# Title: Intro line\./);
  assert.match(o, /- Rules: one \[1 code\]/);
});

test("section returns the match plus its sub-sections only", () => {
  const t = render(DOC, { section: "rules" }).text;
  assert.match(t, /## Rules/);
  assert.match(t, /### Sub rule/);
  assert.doesNotMatch(t, /Other text/);
});

test("unknown section is an error that lists the real headings", () => {
  const r = render(DOC, { section: "nope" });
  assert.equal(r.error, true);
  assert.match(r.text, /Rules \| Sub rule \| Other/);
});

test("max tokens truncates, closes open code fences, and says how to get more", () => {
  const big = "# T\n\n```lua\n" + "local line = 1\n".repeat(400) + "```";
  const r = render(big, { detail: "raw", maxTokens: 100 });
  assert.equal(r.truncated, true);
  assert.ok(approxTokens(r.text) < 200);
  assert.equal((r.text.match(/```/g) || []).length % 2, 0);
  assert.match(r.text, /Cut to about 100 tokens/);
});

/* ---------- search ---------- */
const K = loadKnowledge();

test("search finds the right file for natural questions", () => {
  assert.match(search(K, "validate remote event arguments on the server")[0].call, /luau_guidelines\(topic="remotes"/);
  assert.match(search(K, "kill brick")[0].call, /gameplay_recipe\(recipe="kill-brick"/);
  assert.match(search(K, "datastore retry pcall")[0].call, /topic="datastores"/);
  assert.match(search(K, "where do scripts go ServerScriptService")[0].call, /studio_guide\(topic="placement"/);
  assert.match(search(K, "UDim2 scale phone")[0].call, /ui_pattern\(pattern="layout-rules"/);
});

test("search caps results per topic and respects the limit", () => {
  const r = search(K, "script", { limit: 5 });
  assert.ok(r.length <= 5);
  const perTopic = {};
  for (const x of r) perTopic[x.call.split(",")[0]] = (perTopic[x.call.split(",")[0]] || 0) + 1;
  assert.ok(Object.values(perTopic).every((n) => n <= 2));
});

test("search handles empty and unmatched queries", () => {
  assert.deepEqual(search(K, "the a of"), []);
  assert.match(formatSearch(search(K, "zzzzqqq")), /No match/);
});

test("listTopics groups topics under the tool that serves them", () => {
  const t = listTopics(K);
  assert.match(t, /luau_guidelines\(topic\):/);
  assert.match(t, /- kill-brick:/);
});

/* ---------- review output ---------- */
test("review groups repeated findings into one row", () => {
  const out = reviewLuau("--!strict\nwait(1)\nwait(2)\nwait(3)");
  assert.equal(out.split("\n").filter((l) => l.startsWith("- ")).length, 1);
  assert.match(out, /lines 2, 3, 4/);
  assert.match(out, /task\.wait/);
});

test("review still flags the basics and passes clean code", () => {
  const bad = reviewLuau("function f()\nend\npart.Touched:connect(f)");
  assert.match(bad, /Global function/);
  assert.match(bad, /:Connect/);
  assert.match(reviewLuau("--!strict\nlocal x = 1"), /^No issues/);
});

/* ---------- knowledge base integrity ---------- */
test("every knowledge file has a title, balanced code fences, and a unique name", () => {
  const seen = new Set();
  for (const [cat, entries] of Object.entries(K)) {
    for (const e of Object.values(entries)) {
      assert.match(e.text, /^# .+/, `${cat}/${e.name} must start with a # title`);
      assert.equal((e.text.match(/^\s*```/gm) || []).length % 2, 0, `${cat}/${e.name} has an unclosed code fence`);
      assert.ok(!seen.has(`${cat}/${e.name}`));
      seen.add(`${cat}/${e.name}`);
    }
  }
  assert.ok(seen.size >= 15);
});

test("compression levels actually get smaller across the whole knowledge base", () => {
  let raw = 0, full = 0, brief = 0, outline = 0;
  for (const entries of Object.values(K)) {
    for (const e of Object.values(entries)) {
      raw += approxTokens(render(e.text, { detail: "raw" }).text);
      full += approxTokens(render(e.text, { detail: "full" }).text);
      brief += approxTokens(render(e.text, { detail: "brief" }).text);
      outline += approxTokens(render(e.text, { detail: "outline" }).text);
    }
  }
  assert.ok(full < raw && brief < full && outline < brief, JSON.stringify({ raw, full, brief, outline }));
  console.log(`  approx tokens for the whole knowledge base: raw ${raw}, full ${full}, brief ${brief}, outline ${outline}`);
});

console.log(process.exitCode ? "\nSome unit tests FAILED." : `All ${passed} unit tests passed.`);
