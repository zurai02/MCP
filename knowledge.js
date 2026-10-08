import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "knowledge");

export const CATEGORIES = ["luau", "ui", "studio", "recipes"];

/**
 * Reads every .md file under knowledge/<category>/ and returns
 * { category: { topicName: { name, title, text } } }.
 * To add a topic, drop a new .md file in the right folder. No code changes needed.
 */
export function loadKnowledge() {
  const out = {};
  for (const category of CATEGORIES) {
    out[category] = {};
    const dir = join(root, category);
    let files = [];
    try {
      files = readdirSync(dir).filter((f) => f.endsWith(".md")).sort();
    } catch {
      // folder missing: leave the category empty
    }
    for (const file of files) {
      const text = readFileSync(join(dir, file), "utf8").trim();
      const name = file.replace(/\.md$/, "");
      const title = (text.match(/^#\s+(.+)$/m) || [null, name])[1];
      out[category][name] = { name, title, text };
    }
  }
  return out;
}
