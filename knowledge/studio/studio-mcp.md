# Editing Roblox Studio directly with Studio's built-in MCP

Studio has its own MCP server. Run it next to this one. This server brings the know-how and the checks. Studio's server does the editing.

## Turn it on (the user does this once)

1. Open the place in Roblox Studio and open Assistant.
2. Open the three-dot menu, then Manage MCP Servers.
3. Turn on "Enable Studio as MCP server".
4. Under Quick Connect, turn on Claude Desktop or Claude Code. A green indicator means connected.
5. Restart Claude. If Claude is not listed, restart Studio first.

Tool names depend on the Studio version. Go by the tool list Claude sees. Expect tools to read and search scripts, edit scripts, create missing scripts, inspect the DataModel and properties, run Luau, start and stop playtests, and read the Output.

## The edit loop

1. **Look first.** Inspect the Explorer area you will touch. Read any existing script before changing it.
2. **Look up.** `search_knowledge`, then the lookup tool with `detail="brief"` or one `section`. Fetch `full` only when you need the code.
3. **Plan the placement.** Container and script type from the `placement` guide. List instances the script expects.
4. **Write the smallest change.** Prefer a targeted edit to rewriting a whole script. Keep the user's names, comments and style.
5. **Review.** Run the new code through `review_luau`. Fix what it flags.
6. **Apply** with Studio's tools. Create missing scripts in the right container.
7. **Verify.** Read the Output, or start a playtest and watch for errors. Fix the real cause, not the symptom.
8. **Report** in a few lines: what changed, where, how to test, and how to undo.

## Safety rules

- Studio's tools can read and change the open place. Only work in the place the user asked about.
- With several Studio windows open, confirm which one is active before editing.
- Before large changes, ask the user to save a version or work on a copy. Ctrl+Z undoes Studio edits, and Version History is the backup.
- Ask before deleting anything, overwriting a script the user did not mention, or editing many scripts at once.
- Never save `compress_luau` output over a script. It has no comments.
- Do not publish or touch a live game unless the user says to.
- Keep each request narrow. One feature per change makes problems easy to find.

## When Studio is not connected

Say so in one line. Give paste-ready code, state the container and script type, list the instances to create, and add short test steps.

## Token tips

- Start with `search_knowledge`, not a full topic.
- Use `detail="outline"` to see what a topic contains, then ask for one `section`.
- Read big existing scripts through `compress_luau`, then edit with Studio's tools on the real script.
- Set `max_tokens` when you only need a quick answer.
