# Kill brick (tag based, with a per-player cooldown)

One script handles every kill brick in the game. Tag a part and it becomes deadly. No copying scripts into each part.

**Setup**

1. Insert a `Script` into `ServerScriptService` and name it `KillBricks`.
2. Select each deadly part in Workspace. In the Tag Editor (View → Tag Editor) add the tag `KillBrick`.

```lua
--!strict
local CollectionService = game:GetService("CollectionService")
local Players = game:GetService("Players")

local TAG = "KillBrick"
local COOLDOWN = 1

local lastHit: {[Player]: number} = {}

local function setup(instance: Instance)
	if not instance:IsA("BasePart") then return end
	instance.Touched:Connect(function(hit: BasePart)
		local character = hit.Parent
		if not character then return end
		local player = Players:GetPlayerFromCharacter(character)
		local humanoid = character:FindFirstChildOfClass("Humanoid")
		if not player or not humanoid or humanoid.Health <= 0 then return end

		local now = os.clock()
		if now - (lastHit[player] or 0) < COOLDOWN then return end
		lastHit[player] = now

		humanoid.Health = 0
	end)
end

for _, instance in CollectionService:GetTagged(TAG) do
	setup(instance)
end
CollectionService:GetInstanceAddedSignal(TAG):Connect(setup)

Players.PlayerRemoving:Connect(function(player: Player)
	lastHit[player] = nil
end)
```

**Test:** press Play and walk into a tagged part. You should respawn.

**Likely problem:** nothing happens. Check the part's tag is spelled exactly `KillBrick`, and that `CanTouch` is true on the part. Anchored parts still fire `Touched` when a character touches them.

**Variations:** for damage instead of instant death, replace `humanoid.Health = 0` with `humanoid:TakeDamage(20)`. For a per-part value, read `instance:GetAttribute("Damage")`.
