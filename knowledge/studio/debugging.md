# Build, test and fix loop in Roblox Studio

## Testing modes (Test tab)

- **Play** (F5): you spawn as a player. Tests client and server together, in one window.
- **Run** (F8): runs the server only, no player. Good for scripts that do not need a character.
- **Clients and Servers**: starts a local server with 2 to 8 players. Use it for anything with multiple players, remotes or rounds.
- Open **View → Output** before every test, and watch the **Server** and **Client** views of the Output when testing with Play.

## Reading errors

```
ServerScriptService.GameServer:12: attempt to index nil with 'Parent'
```

That is: script path, line number, message. Go to that line. Something on it is `nil`.

| Message | Usual cause and fix |
| --- | --- |
| `attempt to index nil with 'X'` | The thing before `.X` is nil. It was not found, not loaded yet, or misspelled. Use `WaitForChild` on the client, and check names and parents. |
| `X is not a valid member of Y` | The child does not exist (or has a different name or case). Check the Explorer. |
| `Infinite yield possible on 'X:WaitForChild("Y")'` | `Y` never appears. Wrong name, wrong parent, or it is created later than the wait. |
| `attempt to call a nil value` | The function name is misspelled, or the method is not on that class. |
| `attempt to perform arithmetic on nil` | A variable you do math on was never set. |
| `Script timeout: exhausted allowed execution time` | A loop with no yield. Add `task.wait()`. |
| `Players.X.PlayerGui... is not a valid member` | UI not built yet. Wait for it, or make it with the script. |
| `HTTP 403` or `Studio access to APIs is not allowed` | Turn on Game Settings → Security → "Enable Studio Access to API Services" (DataStore, MessagingService). |
| `Argument 1 missing or nil` | A required argument was nil. Print it first to see which. |
| Remote does nothing | `FireServer` only works from a LocalScript, and `OnServerEvent` only from a Script. Check the remote's name and that both sides use the same instance. |

## Techniques

- `print("here", value)` and `warn(...)` to trace. Use `typeof(x)` to check types.
- Breakpoints: click the line number in the script editor, then Play. The debugger pauses there and shows variables.
- Wrap risky calls in `pcall` and print the error: `local ok, err = pcall(fn); if not ok then warn(err) end`.
- Use `assert(condition, "message")` for things that must be true.
- Enable the **Script Analysis** panel (View → Script Analysis) for type errors and unused variables as you type.
- In a published game, press F9 (developer console) to see logs from live servers.

## A fix loop that works

1. Reproduce it and copy the exact Output message with the line number.
2. Read the line and the lines above it. Name what is nil or wrong.
3. Fix the smallest thing that explains the error.
4. Test again. If the error changed, you made progress, repeat.
5. Before moving on, re-test the feature, the neighbors it touches, and a fresh join.

When reporting back, always say what was wrong, what you changed, and what to test next.
