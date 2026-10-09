# Luau types and strict mode

Start every script with `--!strict` on the first line. The editor then flags nil mistakes and wrong argument types before you run anything.

## Annotating code

```lua
--!strict
export type Item = {
	id: string,
	name: string,
	price: number,
	icon: string?, -- the ? means it may be nil
}

local function totalPrice(items: {Item}): number
	local sum = 0
	for _, item in items do
		sum += item.price
	end
	return sum
end
```

## Rules of thumb

- Annotate function parameters and return types. Local variables are usually inferred.
- Arrays are `{T}`. Dictionaries are `{[K]: V}`.
- Unions use `|`: `string | number`. String literals work as enums: `"Idle" | "Running" | "Dead"`.
- Use `::` to tell the checker what Roblox returns: `script.Parent :: BasePart`, `Players.LocalPlayer :: Player`.
- `WaitForChild("Name") :: TextButton` gives you a typed reference.
- Narrow before use: `if instance:IsA("BasePart") then ... end` or `if typeof(x) == "number" then ... end`.
- Use `export type` in ModuleScripts so other scripts can import the type: `local Inventory = require(path)`, then `Inventory.Item`.
- Generics: `local function first<T>(list: {T}): T? return list[1] end`.
- Prefer `--!strict` for new code. Use `--!nonstrict` only while migrating old scripts.
