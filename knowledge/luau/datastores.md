# DataStores: saving player data safely

DataStore requests can fail (throttling, outages). Always wrap them in `pcall`, and never save over data you failed to load.

## Setup in Studio

Game Settings → Security → turn on "Enable Studio Access to API Services", and publish the place at least once. Otherwise calls error in Studio.

## Load and save pattern

```lua
--!strict
-- ServerScriptService/PlayerData (Script)
local Players = game:GetService("Players")
local DataStoreService = game:GetService("DataStoreService")

local store = DataStoreService:GetDataStore("PlayerData_v1")

type Data = { coins: number, stage: number }
local DEFAULT: Data = { coins = 0, stage = 1 }

local cache: {[Player]: Data} = {}
local loadFailed: {[Player]: boolean} = {}

local function withRetry<T>(fn: () -> T, tries: number): (boolean, T | string)
	local ok, result
	for attempt = 1, tries do
		ok, result = pcall(fn)
		if ok then break end
		task.wait(2 ^ attempt * 0.5)
	end
	return ok, result
end

local function load(player: Player)
	local key = "u_" .. player.UserId
	local ok, result = withRetry(function()
		return store:GetAsync(key)
	end, 3)

	if not ok then
		loadFailed[player] = true -- do NOT save later, or we wipe their data
		cache[player] = table.clone(DEFAULT)
		warn("Load failed for", player.Name, result)
		return
	end

	local data = table.clone(DEFAULT)
	if typeof(result) == "table" then
		local saved = result :: any
		data.coins = tonumber(saved.coins) or data.coins
		data.stage = tonumber(saved.stage) or data.stage
	end
	cache[player] = data
end

local function save(player: Player)
	local data = cache[player]
	if not data or loadFailed[player] then return end
	local key = "u_" .. player.UserId
	local ok, err = withRetry(function()
		store:UpdateAsync(key, function()
			return data
		end)
	end, 3)
	if not ok then warn("Save failed for", player.Name, err) end
end

Players.PlayerAdded:Connect(load)
for _, p in Players:GetPlayers() do task.spawn(load, p) end

Players.PlayerRemoving:Connect(function(player: Player)
	save(player)
	cache[player], loadFailed[player] = nil, nil
end)

game:BindToClose(function()
	for _, p in Players:GetPlayers() do task.spawn(save, p) end
	task.wait(3) -- give the saves time to finish
end)
```

## Rules

- Key by `UserId`, never by name.
- Use `UpdateAsync` when the new value depends on the old one. `SetAsync` overwrites blindly.
- Save on `PlayerRemoving` and in `game:BindToClose`. Also autosave every few minutes.
- Store plain tables, numbers, strings and booleans only. No Instances, no Vector3 or CFrame (convert to numbers).
- Respect the limits: about 60 + 10 per player requests per minute per key type. Do not save every change, batch them.
- Change the store name (`PlayerData_v2`) to reset everyone while testing, never in production without a migration.
- Only one server should own a player's data at a time. For anything where duplication matters (trading, currency), use session locking via `UpdateAsync` or a proven library such as ProfileService.
