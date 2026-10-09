# Round system: intermission, round, winner, repeat

The server runs the loop and publishes a status string through an attribute, so any UI can display it.

**Setup**

1. In Workspace create a `Folder` named `ArenaSpawns` with a few anchored parts where players start the round.
2. Insert a `Script` into `ServerScriptService` named `RoundSystem`.

```lua
--!strict
local Players = game:GetService("Players")

local MIN_PLAYERS = 2
local INTERMISSION = 15
local ROUND_LENGTH = 90

local spawnsFolder = workspace:WaitForChild("ArenaSpawns")

local function setStatus(text: string)
	workspace:SetAttribute("Status", text)
end

local function alivePlayers(inRound: {Player}): {Player}
	local alive = {}
	for _, player in inRound do
		local character = player.Character
		local humanoid = character and character:FindFirstChildOfClass("Humanoid")
		if humanoid and humanoid.Health > 0 and player.Parent == Players then
			table.insert(alive, player)
		end
	end
	return alive
end

local function teleportToArena(players: {Player})
	local spawns = spawnsFolder:GetChildren()
	if #spawns == 0 then return end
	for i, player in players do
		local character = player.Character
		local spawnPart = spawns[((i - 1) % #spawns) + 1]
		if character and spawnPart:IsA("BasePart") then
			character:PivotTo(spawnPart.CFrame + Vector3.new(0, 4, 0))
		end
	end
end

local function waitForPlayers()
	while #Players:GetPlayers() < MIN_PLAYERS do
		setStatus("Waiting for players (" .. #Players:GetPlayers() .. "/" .. MIN_PLAYERS .. ")")
		task.wait(1)
	end
end

local function intermission()
	for remaining = INTERMISSION, 1, -1 do
		if #Players:GetPlayers() < MIN_PLAYERS then return false end
		setStatus("Next round in " .. remaining)
		task.wait(1)
	end
	return true
end

local function runRound()
	local participants = Players:GetPlayers()
	teleportToArena(participants)

	for remaining = ROUND_LENGTH, 1, -1 do
		local alive = alivePlayers(participants)
		if #alive <= 1 then
			if #alive == 1 then
				setStatus(alive[1].Name .. " wins!")
			else
				setStatus("Nobody survived")
			end
			return
		end
		setStatus("Time left: " .. remaining .. "  Alive: " .. #alive)
		task.wait(1)
	end
	setStatus("Time is up!")
end

-- main loop: always yields through task.wait
while true do
	waitForPlayers()
	if intermission() then
		runRound()
		task.wait(5) -- show the result before the next intermission
	end
end
```

**Showing it in UI:** on the client, read `workspace:GetAttribute("Status")` and listen with `workspace:GetAttributeChangedSignal("Status")`, then set a `TextLabel.Text`.

**Test:** use Test → Clients and Servers with 2 players. After 15 seconds both are teleported. When one dies the other wins.

**Likely problem:** nobody teleports. Check the folder is named `ArenaSpawns` and has parts directly inside it (not models).

**Next steps:** award coins to the winner (see `coin-pickup`), choose a random map from `ServerStorage`, and reset characters at the end with `player:LoadCharacter()` if `Players.CharacterAutoLoads` is turned off.
