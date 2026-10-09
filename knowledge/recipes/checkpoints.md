# Obstacle course checkpoints (obby stages)

Players respawn at the last checkpoint they touched, and a `Stage` leaderstat tracks progress.

**Setup**

1. In Workspace create a `Folder` named `Checkpoints`.
2. Inside it put `SpawnLocation` parts named `1`, `2`, `3`, and so on, in course order. Set each one's `Neutral` property to **true** so it works for any player, and `Duration` to 0 (no forcefield).
3. Insert a `Script` into `ServerScriptService` named `Checkpoints`.

```lua
--!strict
local Players = game:GetService("Players")

local folder = workspace:WaitForChild("Checkpoints")

local function setupPlayer(player: Player)
	local leaderstats = Instance.new("Folder")
	leaderstats.Name = "leaderstats"

	local stage = Instance.new("IntValue")
	stage.Name = "Stage"
	stage.Value = 1
	stage.Parent = leaderstats

	leaderstats.Parent = player
end

Players.PlayerAdded:Connect(setupPlayer)
for _, player in Players:GetPlayers() do
	task.spawn(setupPlayer, player)
end

for _, checkpoint in folder:GetChildren() do
	if not checkpoint:IsA("SpawnLocation") then continue end
	local number = tonumber(checkpoint.Name)
	if not number then continue end

	checkpoint.Touched:Connect(function(hit: BasePart)
		local character = hit.Parent
		if not character then return end
		local player = Players:GetPlayerFromCharacter(character)
		if not player then return end

		local stats = player:FindFirstChild("leaderstats")
		local stage = stats and stats:FindFirstChild("Stage")
		if not stage or not stage:IsA("IntValue") then return end

		-- only move forward, never back
		if number > stage.Value then
			stage.Value = number
			player.RespawnLocation = checkpoint
		end
	end)
end
```

**Test:** Play, touch checkpoint 2, fall off, and you respawn there. In Output there should be no errors.

**Likely problems**

- You respawn at the start every time: the checkpoint must be a `SpawnLocation` (not a Part) and `Neutral` must be true.
- Checkpoints skipped in order: the code only checks `number > stage.Value`, so skipping ahead counts. Add `number == stage.Value + 1` if you want strict order.

**Saving progress:** store `stage.Value` with the `datastores` pattern, then on join set `stage.Value` and `player.RespawnLocation = folder:FindFirstChild(tostring(savedStage))`.
