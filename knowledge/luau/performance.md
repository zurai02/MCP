# Performance habits for Luau

## Instances

- Set every property first and `Parent` last. Setting `Parent` first replicates and re-renders after every change.
- Cache references. Do not call `FindFirstChild`, `WaitForChild` or `GetService` inside a per-frame loop.
- Use `Instance:Clone()` on a template instead of building the same thing property by property.
- `Destroy()` things you are done with. It also disconnects events on them.

## Finding things

- Tag groups of parts with `CollectionService` (`AddTag`, `GetTagged`, `GetInstanceAddedSignal`) instead of looping over `workspace:GetDescendants()`.
- Use `workspace:GetPartBoundsInBox`, `GetPartBoundsInRadius` and `Raycast` with `OverlapParams` or `RaycastParams` for spatial queries.
- Avoid `GetDescendants()` on large trees more than once, and never every frame.

## Loops and timing

- Never run a loop without a yield. Prefer events over polling.
- For many timers, use one `Heartbeat` loop and a table of due times, not hundreds of `task.delay` threads.
- Scale movement by `dt` from `Heartbeat`.

## Tables and strings

- Preallocate with `table.create(n)` when you know the size.
- Use `table.insert(t, v)` or `t[#t + 1] = v`. Use `table.remove(t, i)` sparingly on big arrays.
- Build large strings with `table.concat`, not repeated `..` in a loop.
- `table.clear(t)` reuses a table instead of making a new one.

## Network

- Fire remotes on change, not every frame. Throttle client to server messages.
- Send small values (numbers and short strings), not whole tables of instances.
- Enable `Workspace.StreamingEnabled` for large maps and use `WaitForChild` on the client for streamed parts.

## Check before optimizing

Use the MicroProfiler (Ctrl+F6) and the Script Performance window in Studio to find the real cost. Fix what shows up there first.
