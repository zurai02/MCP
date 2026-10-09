# ModuleScripts and project structure

A ModuleScript returns one value (usually a table). `require` runs it once per environment and caches the result, so every script that requires it shares the same table.

## Basic module

```lua
--!strict
-- ReplicatedStorage/Shared/MathUtil (ModuleScript)
local MathUtil = {}

function MathUtil.round(n: number, places: number?): number
	local m = 10 ^ (places or 0)
	return math.floor(n * m + 0.5) / m
end

return MathUtil
```

```lua
--!strict
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local MathUtil = require(ReplicatedStorage:WaitForChild("Shared"):WaitForChild("MathUtil") :: ModuleScript)
print(MathUtil.round(3.14159, 2))
```

## Class pattern with types

```lua
--!strict
local Door = {}
Door.__index = Door

export type Door = typeof(setmetatable({} :: {
	model: Model,
	isOpen: boolean,
}, Door))

function Door.new(model: Model): Door
	return setmetatable({ model = model, isOpen = false }, Door)
end

function Door.toggle(self: Door)
	self.isOpen = not self.isOpen
	self.model:SetAttribute("Open", self.isOpen)
end

return Door
```

## Rules

- One job per module. A script wires things together, modules hold the logic.
- Where it lives decides who can use it. ReplicatedStorage: client and server. ServerScriptService or ServerStorage: server only, and the client can never read the code.
- Never put secrets or trusted rules (prices, admin lists) in a module the client can require.
- Avoid circular requires (A requires B requires A). It errors or returns nil. Move the shared part into a third module.
- A module that holds state is a singleton per side. The client and server each get their own copy.
- Return a table even for a single function, so you can add more later without changing callers.
