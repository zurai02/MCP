# Coin pickup with leaderstats, sound and respawn timer

**Setup**

1. Insert a `Script` into `ServerScriptService` named `Coins`.
2. In Workspace create a `Folder` named `Coins`. Put your coin parts inside it (anchored, `CanCollide` off).
3. Optional: put a `Sound` named `Pickup` inside each coin part. If it is missing, no sound plays.

```lua
--!strict
local Players = game:GetService("Players")

local coinsFolder = workspace:WaitForChild("Coins")
local VALUE = 1
local RESPAWN_SECONDS = 8

local function onPlayerAdded(player: Player)
	local leaderstats = Instance.new("Folder")
	leaderstats.Name = "leaderstats"

	local coins = Instance.new("IntValue")
	coins.Name = "Coins"
	coins.Value = 0
	coins.Parent = leaderstats

	leaderstats.Parent = player
end

Players.PlayerAdded:Connect(onPlayerAdded)
for _, player in Players:GetPlayers() do
	task.spawn(onPlayerAdded, player)
end

local function setupCoin(coin: BasePart)
	local available = true
	local startTransparency = coin.Transparency

	coin.Touched:Connect(function(hit: BasePart)
		if not available then return end
		local character = hit.Parent
		if not character then return end
		local player = Players:GetPlayerFromCharacter(character)
		if not player then return end
		local stats = player:FindFirstChild("leaderstats")
		local coins = stats and stats:FindFirstChild("Coins")
		if not coins or not coins:IsA("IntValue") then return end

		available = false
		coins.Value += VALUE

		local sound = coin:FindFirstChild("Pickup")
		if sound and sound:IsA("Sound") then
			sound:Play()
		end

		coin.Transparency = 1
		coin.CanTouch = false

		task.delay(RESPAWN_SECONDS, function()
			coin.Transparency = startTransparency
			coin.CanTouch = true
			available = true
		end)
	end)
end

for _, child in coinsFolder:GetChildren() do
	if child:IsA("BasePart") then
		setupCoin(child)
	end
end
coinsFolder.ChildAdded:Connect(function(child: Instance)
	if child:IsA("BasePart") then
		setupCoin(child)
	end
end)
```

**Test:** Play, touch a coin. The `Coins` value in the leaderboard goes up and the coin returns after 8 seconds.

**Likely problem:** the leaderboard does not show. The folder must be named exactly `leaderstats` (lowercase) and be parented to the `Player`.

**Next step:** show it on screen with the `hud` UI pattern, and save it with the `datastores` guideline.
