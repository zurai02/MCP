# RemoteEvents and RemoteFunctions

The client is controlled by the player, and exploiters can fire any remote with any arguments. The server must treat every argument as untrusted.

## Setup

Create the remotes once, in ReplicatedStorage, so both sides see them. Example: `ReplicatedStorage/Remotes/BuyItem` (RemoteEvent).

## Server handler with validation

```lua
--!strict
-- ServerScriptService/ShopServer (Script)
local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local remotes = ReplicatedStorage:WaitForChild("Remotes")
local buyItem = remotes:WaitForChild("BuyItem") :: RemoteEvent

local PRICES: {[string]: number} = { Sword = 100, Shield = 150 } -- the server owns prices
local lastRequest: {[Player]: number} = {}

buyItem.OnServerEvent:Connect(function(player: Player, itemId: unknown)
	-- 1. type check
	if typeof(itemId) ~= "string" then return end
	-- 2. exists
	local price = PRICES[itemId]
	if not price then return end
	-- 3. rate limit
	local now = os.clock()
	if now - (lastRequest[player] or 0) < 0.25 then return end
	lastRequest[player] = now
	-- 4. permission and state, checked on the server
	local stats = player:FindFirstChild("leaderstats")
	local coins = stats and stats:FindFirstChild("Coins") :: IntValue?
	if not coins or coins.Value < price then return end

	coins.Value -= price
	-- grant the item here
end)

Players.PlayerRemoving:Connect(function(player: Player)
	lastRequest[player] = nil
end)
```

## Rules

- The first argument on the server is always the `Player`. Never accept a player, price, damage or "is admin" value from the client.
- Send intent ("I want to buy Sword"), not results ("give me Sword for 0 coins").
- Check type, range (`math.clamp`, `n == n` to reject NaN), existence and permission, in that order.
- Rate-limit anything a player can spam.
- Server to client: `remote:FireClient(player, ...)` or `FireAllClients(...)`. The client listens with `OnClientEvent`.
- Prefer RemoteEvents. A RemoteFunction can hang the server if a client never answers. Never `InvokeClient` from the server. `InvokeServer` from the client is fine for request and response.
- Keep payloads small and send changes, not whole tables, every frame.
