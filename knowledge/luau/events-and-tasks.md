# Events, the task library and cleanup

Use events instead of polling, and the `task` library instead of the old `wait`, `spawn` and `delay`.

## The task library

```lua
--!strict
task.wait(0.5)                       -- yield, returns the real time waited
task.spawn(function() ... end)       -- run now, in a new thread
task.defer(function() ... end)       -- run at the end of the current frame
task.delay(3, function() ... end)    -- run after 3 seconds
local thread = task.delay(10, fn)
task.cancel(thread)                  -- cancel a pending delay or spawn
```

## Connecting events

```lua
--!strict
local connection = part.Touched:Connect(function(hit: BasePart)
	-- handle it
end)

connection:Disconnect()          -- stop listening
part.Touched:Once(function() end) -- runs one time, then disconnects itself
```

- The method is `:Connect`. Lowercase `:connect` is deprecated.
- Every `Connect` on something that outlives the listener needs a matching `Disconnect`, or it leaks. Events on an instance you `Destroy()` are cleaned up automatically.
- Keep connections in a table when a system starts and stops, and loop over it to disconnect.

## Players: handle existing and future players

`PlayerAdded` does not fire for players who joined before the script ran. Always do both:

```lua
--!strict
local Players = game:GetService("Players")

local function onPlayerAdded(player: Player)
	player.CharacterAdded:Connect(function(character: Model)
		-- character setup
	end)
	if player.Character then
		-- handle a character that already exists
	end
end

Players.PlayerAdded:Connect(onPlayerAdded)
for _, player in Players:GetPlayers() do
	task.spawn(onPlayerAdded, player)
end
```

## Per-frame work

```lua
local RunService = game:GetService("RunService")
RunService.Heartbeat:Connect(function(dt: number)
	-- runs every frame after physics. Scale movement by dt.
end)
```

- Server and client: `Heartbeat`.
- Client only, before rendering: `RunService.RenderStepped` (keep it very light, it blocks the frame). Use `BindToRenderStep` when the order matters, for example cameras.

## Avoid

- `while true do task.wait() ... end` to watch for a change. Use `GetPropertyChangedSignal`, `Changed`, attributes or a custom signal.
- `while true do` with no yield. It freezes the game and Roblox kills the script ("exhausted allowed execution time").
- Long work inside an event handler without yielding. Hand it to `task.spawn`.
