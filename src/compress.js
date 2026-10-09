// Token-saving helpers. Pure functions with no dependencies, so they can be
// tested without the MCP SDK (see test/unit.mjs).

// Rough estimate: about 4 characters per token for English text and code.
// Good enough to compare sizes. It is not an exact tokenizer.
export const approxTokens = (s) => Math.ceil(String(s).length / 4);

// Which lookup tool serves which knowledge category, and its argument name.
export const TOOL_FOR = {
  luau: ["luau_guidelines", "topic"],
  ui: ["ui_pattern", "pattern"],
  studio: ["studio_guide", "topic"],
  recipes: ["gameplay_recipe", "recipe"],
};

/* ------------------------------------------------------------------ */
/* Luau compaction                                                     */
/* ------------------------------------------------------------------ */

const NUL = "\u0000";

/**
 * Shrinks Luau source for READING. Removes comments, blank lines and trailing
 * spaces. Strings are copied untouched, so "--" inside a string survives.
 * Directives such as --!strict are kept. Never renames anything.
 * level "aggressive" also shrinks indentation to one tab per level.
 *
 * The output is for reading only. Do not save it over someone's script, because
 * their comments are gone.
 */
export function compactLuau(code, level = "light") {
  const src = String(code).replace(/\r\n?/g, "\n").split(NUL).join("");
  const n = src.length;
  const literals = [];
  const stash = (s) => {
    literals.push(s);
    return `${NUL}${literals.length - 1}${NUL}`;
  };
  // End index just after the matching "]=*]", or end of file if unclosed.
  const closeLong = (from, eq) => {
    const close = "]" + "=".repeat(eq) + "]";
    const idx = src.indexOf(close, from);
    return idx === -1 ? n : idx + close.length;
  };
  const lineEnd = (from) => {
    const e = src.indexOf("\n", from);
    return e === -1 ? n : e;
  };

  let out = "";
  let i = 0;
  while (i < n) {
    const c = src[i];

    // Comments
    if (c === "-" && src[i + 1] === "-") {
      if (src[i + 2] === "!") {
        const end = lineEnd(i); // directive: keep
        out += src.slice(i, end);
        i = end;
        continue;
      }
      const long = /^--\[(=*)\[/.exec(src.slice(i, i + 40));
      i = long ? closeLong(i + long[0].length, long[1].length) : lineEnd(i);
      continue;
    }

    // Quoted strings
    if (c === '"' || c === "'") {
      let j = i + 1;
      while (j < n && src[j] !== c && src[j] !== "\n") {
        if (src[j] === "\\") j++;
        j++;
      }
      const end = j < n && src[j] === c ? j + 1 : Math.min(j, n);
      out += stash(src.slice(i, end));
      i = end;
      continue;
    }

    // Interpolated strings: `text {expr} text`
    if (c === "`") {
      let j = i + 1;
      let depth = 0;
      while (j < n) {
        const d = src[j];
        if (d === "\\") {
          j += 2;
          continue;
        }
        if (d === "{") depth++;
        else if (d === "}" && depth > 0) depth--;
        else if (d === "`" && depth === 0) {
          j++;
          break;
        }
        j++;
      }
      const end = Math.min(j, n);
      out += stash(src.slice(i, end));
      i = end;
      continue;
    }

    // Long strings: [[ ... ]] or [=[ ... ]=]
    if (c === "[") {
      const m = /^\[(=*)\[/.exec(src.slice(i, i + 40));
      if (m) {
        const end = closeLong(i + m[0].length, m[1].length);
        out += stash(src.slice(i, end));
        i = end;
        continue;
      }
    }

    out += c;
    i++;
  }

  // Strings are now placeholders without newlines, so line cleanup is safe.
  let lines = out
    .split("\n")
    .map((l) => l.replace(/[ \t]+$/, ""))
    .filter((l) => l.trim() !== "");

  if (level === "aggressive") {
    const spaceOnly = lines.filter((l) => /^ +\S/.test(l));
    const unit = spaceOnly.reduce((min, l) => Math.min(min, /^ +/.exec(l)[0].length), Infinity);
    if (Number.isFinite(unit)) {
      lines = lines.map((l) => {
        const m = /^( +)(\S.*)$/.exec(l);
        return m ? "\t".repeat(Math.max(1, Math.round(m[1].length / unit))) + m[2] : l;
      });
    }
  }

  const result = lines
    .join("\n")
    .replace(new RegExp(`${NUL}(\\d+)${NUL}`, "g"), (_, k) => literals[Number(k)]);
  return { code: result, before: String(code).length, after: result.length };
}

/* ------------------------------------------------------------------ */
/* Markdown sections                                                   */
/* ------------------------------------------------------------------ */

const FENCE = /```([^\n]*)\n([\s\S]*?)```/g;
const tidy = (s) => s.replace(/\n{3,}/g, "\n\n").trim();

/** Splits markdown into sections by heading. Headings inside code fences are ignored. */
export function parseSections(text) {
  const sections = [];
  let cur = null;
  let inFence = false;
  const start = (heading, level) => {
    if (cur) sections.push(cur);
    cur = { heading, level, lines: [] };
  };
  for (const line of String(text).split("\n")) {
    if (/^\s*```/.test(line)) {
      inFence = !inFence;
      if (!cur) start("", 0);
      cur.lines.push(line);
      continue;
    }
    const m = inFence ? null : /^(#{1,6})\s+(.+?)\s*$/.exec(line);
    if (m) {
      start(m[2], m[1].length);
      cur.lines.push(line);
    } else {
      if (!cur) start("", 0);
      cur.lines.push(line);
    }
  }
  if (cur) sections.push(cur);
  return sections.map((s) => ({ heading: s.heading, level: s.level, text: s.lines.join("\n").trim() }));
}

function renderSection(text, detail) {
  if (detail === "brief") {
    return tidy(
      text.replace(FENCE, (_, lang, body) => {
        const kind = lang.trim() || "code";
        const count = body.trim().split("\n").length;
        return `[${kind} omitted, ${count} ${count === 1 ? "line" : "lines"}]`;
      })
    );
  }
  if (detail === "raw") return tidy(text);
  // "full": same content, with Luau code compacted
  return tidy(
    text.replace(FENCE, (match, lang, body) =>
      /^(lua|luau)$/i.test(lang.trim()) ? "```" + lang + "\n" + compactLuau(body, "light").code + "\n```" : match
    )
  );
}

function renderOutline(sections) {
  return sections
    .map((s) => {
      const body = s.text.split("\n").slice(s.heading ? 1 : 0).join("\n");
      const blocks = Math.floor((body.match(/^\s*```/gm) || []).length / 2);
      const first =
        body
          .replace(FENCE, "")
          .split("\n")
          .map((l) => l.trim())
          .find((l) => l && !l.startsWith("|") && !/^[-*_]{3,}$/.test(l)) || "";
      const short = first.replace(/^[-*]\s+/, "").replace(/\*\*/g, "").slice(0, 110);
      if (s.level === 1) return `# ${s.heading}${short ? ": " + short : ""}`;
      return `- ${s.heading}${short ? ": " + short : ""}${blocks ? ` [${blocks} code]` : ""}`;
    })
    .join("\n");
}

// Picks the matching section plus its sub-sections.
function pickSections(all, query) {
  const q = query.toLowerCase();
  let starts = all.map((s, i) => (s.heading.toLowerCase() === q ? i : -1)).filter((i) => i >= 0);
  if (starts.length === 0) {
    starts = all.map((s, i) => (s.heading.toLowerCase().includes(q) ? i : -1)).filter((i) => i >= 0);
  }
  const keep = new Set();
  for (const i of starts) {
    keep.add(i);
    for (let j = i + 1; j < all.length && all[j].level > all[i].level; j++) keep.add(j);
  }
  return all.filter((_, i) => keep.has(i));
}

function applyBudget(parts, headings, maxTokens) {
  const text = parts.join("\n\n");
  if (!maxTokens || approxTokens(text) <= maxTokens) return { text };

  const limit = maxTokens * 4;
  let acc = "";
  let used = 0;
  for (const p of parts) {
    const next = acc ? acc.length + 2 + p.length : p.length;
    if (next > limit) break;
    acc = acc ? acc + "\n\n" + p : p;
    used++;
  }
  if (used === 0) {
    // One section alone is too big: cut at a line boundary.
    const cut = parts[0].slice(0, limit);
    const nl = cut.lastIndexOf("\n");
    acc = nl > limit * 0.4 ? cut.slice(0, nl) : cut;
    if ((acc.match(/```/g) || []).length % 2 === 1) acc += "\n```";
  }
  const names = headings.length ? ` Sections: ${headings.join(" | ")}.` : "";
  return {
    text: `${acc}\n\n[Cut to about ${maxTokens} tokens. Ask for a section by name, or raise max_tokens.${names}]`,
    truncated: true,
  };
}

/**
 * Renders one knowledge file at a chosen level of detail.
 *   detail: "outline" headings and one line each
 *           "brief"   text without code blocks
 *           "full"    everything, Luau code compacted (default)
 *           "raw"     everything, untouched
 *   section: only the section whose heading matches (plus sub-sections)
 *   maxTokens: approximate cap on the reply size
 */
export function render(text, { detail = "full", section, maxTokens } = {}) {
  const all = parseSections(text);
  const headings = all.filter((s) => s.heading).map((s) => s.heading);
  let chosen = all;
  if (section) {
    chosen = pickSections(all, section);
    if (chosen.length === 0) {
      return { text: `No section matching "${section}". Sections: ${headings.join(" | ")}`, error: true };
    }
  }
  const parts =
    detail === "outline"
      ? [renderOutline(chosen)]
      : chosen.map((s) => renderSection(s.text, detail)).filter(Boolean);
  return applyBudget(parts, headings, maxTokens);
}

/* ------------------------------------------------------------------ */
/* Search                                                              */
/* ------------------------------------------------------------------ */

const STOP = new Set(
  "a an the to of in on for and or with how do i my me make write create build add use using it is are be can you want need please".split(" ")
);

// Light stemming so "phones" matches "phone" and "scripts" matches "script".
const stem = (t) => (t.length > 3 && t.endsWith("s") && !t.endsWith("ss") ? t.slice(0, -1) : t);
const words = (s) => String(s).toLowerCase().split(/[^a-z0-9_]+/).filter((t) => t.length > 1);
const tokenize = (s) => words(s).map(stem);
const queryTerms = (q) => [...new Set(words(q).filter((t) => !STOP.has(t)).map(stem))];

// Splits every file into sections once and remembers word counts for ranking.
const corpusCache = new WeakMap();
function corpusOf(knowledge) {
  const cached = corpusCache.get(knowledge);
  if (cached) return cached;
  const docs = [];
  for (const [category, entries] of Object.entries(knowledge)) {
    for (const entry of Object.values(entries)) {
      const topicTokens = tokenize(`${entry.name} ${entry.title}`);
      for (const s of parseSections(entry.text)) {
        const tf = new Map();
        const add = (tokens, weight = 1) => {
          for (const t of tokens) tf.set(t, (tf.get(t) || 0) + weight);
        };
        add(tokenize(s.text));
        add(tokenize(s.heading), 3); // heading words count extra
        add(topicTokens, 1); // so does the file's own name
        let len = 0;
        for (const v of tf.values()) len += v;
        docs.push({ category, topic: entry.name, heading: s.heading, level: s.level, text: s.text, tf, len });
      }
    }
  }
  const df = new Map();
  for (const d of docs) for (const t of d.tf.keys()) df.set(t, (df.get(t) || 0) + 1);
  const avgLen = docs.reduce((a, d) => a + d.len, 0) / Math.max(docs.length, 1);
  const corpus = { docs, df, avgLen };
  corpusCache.set(knowledge, corpus);
  return corpus;
}

function snippetOf(sectionText, terms, max) {
  const lines = sectionText
    .split("\n")
    .slice(1)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("```"));
  const hit = lines.find((l) => terms.some((t) => l.toLowerCase().includes(t))) || lines[0] || "";
  const clean = hit.replace(/^[-*]\s+/, "").replace(/\*\*/g, "");
  return clean.length > max ? clean.slice(0, max - 1) + "…" : clean;
}

/**
 * Finds the best matching sections across all knowledge (BM25 ranking).
 * Returns at most 2 sections per topic so one big file cannot fill the list.
 */
export function search(knowledge, query, { limit = 3, snippet = 160 } = {}) {
  const terms = queryTerms(query);
  if (terms.length === 0) return [];
  const { docs, df, avgLen } = corpusOf(knowledge);
  const N = docs.length;
  const k1 = 1.2;
  const b = 0.75;

  const scored = [];
  for (const d of docs) {
    let score = 0;
    for (const t of terms) {
      const tf = d.tf.get(t);
      if (!tf) continue;
      const n = df.get(t) || 0;
      const idf = Math.log(1 + (N - n + 0.5) / (n + 0.5));
      score += (idf * (tf * (k1 + 1))) / (tf + k1 * (1 - b + (b * d.len) / avgLen));
    }
    if (score > 0) scored.push({ d, score });
  }
  scored.sort((x, y) => y.score - x.score || x.d.topic.localeCompare(y.d.topic));

  const perTopic = new Map();
  const picked = [];
  for (const { d } of scored) {
    const key = `${d.category}/${d.topic}`;
    if ((perTopic.get(key) || 0) >= 2) continue;
    perTopic.set(key, (perTopic.get(key) || 0) + 1);
    picked.push(d);
    if (picked.length >= limit) break;
  }
  return picked.map((d) => {
    const [tool, arg] = TOOL_FOR[d.category];
    // A level-1 section is the whole file, so no section argument is needed.
    const sec = d.level > 1 ? `, section="${d.heading}"` : "";
    return { call: `${tool}(${arg}="${d.topic}"${sec})`, snippet: snippetOf(d.text, terms, snippet) };
  });
}

export function formatSearch(results) {
  if (results.length === 0) return "No match. Try list_topics, or different words.";
  return results.map((r, i) => `${i + 1}. ${r.call} - ${r.snippet}`).join("\n");
}

/** One compact line per topic, grouped by the tool that serves it. */
export function listTopics(knowledge) {
  return Object.entries(knowledge)
    .map(([category, entries]) => {
      const [tool, arg] = TOOL_FOR[category] || [category, "topic"];
      const rows = Object.values(entries).map((e) => `- ${e.name}: ${e.title}`);
      return `${tool}(${arg}):\n${rows.join("\n")}`;
    })
    .join("\n\n");
}
