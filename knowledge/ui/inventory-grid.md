# Inventory screen: grid of slots, hover tooltip, drag to reorder

**Where it goes:** a `LocalScript` named `Inventory` in `StarterPlayer/StarterPlayerScripts`. The item list below is sample data. In a real game the server owns the inventory and the client only displays it.

Uses `IgnoreGuiInset = false` on purpose. That keeps `InputObject.Position` and `GetGuiObjectsAtPosition` in the same coordinate space as the UI, so dragging lines up.

```lua
--!strict
local Players = game:GetService("Players")
local UserInputService = game:GetService("UserInputService")

local player = Players.LocalPlayer
local playerGui = player:WaitForChild("PlayerGui")

local ITEMS = { "Sword", "Shield", "Potion", "Bow", "Key", "Map", "Torch", "Gem" }
local SLOT_COUNT = 24

local gui = Instance.new("ScreenGui")
gui.Name = "Inventory"
gui.ResetOnSpawn = false
gui.IgnoreGuiInset = false
gui.ZIndexBehavior = Enum.ZIndexBehavior.Sibling
gui.Enabled = false

local window = Instance.new("Frame")
window.AnchorPoint = Vector2.new(0.5, 0.5)
window.Position = UDim2.fromScale(0.5, 0.5)
window.Size = UDim2.fromScale(0.5, 0.6)
window.BackgroundColor3 = Color3.fromRGB(24, 28, 36)
window.Active = true
window.Parent = gui
Instance.new("UICorner").Parent = window

local minmax = Instance.new("UISizeConstraint")
minmax.MinSize = Vector2.new(300, 260)
minmax.MaxSize = Vector2.new(720, 560)
minmax.Parent = window

local scroll = Instance.new("ScrollingFrame")
scroll.Size = UDim2.new(1, -24, 1, -24)
scroll.Position = UDim2.fromOffset(12, 12)
scroll.BackgroundTransparency = 1
scroll.BorderSizePixel = 0
scroll.ScrollBarThickness = 6
scroll.CanvasSize = UDim2.new()
scroll.AutomaticCanvasSize = Enum.AutomaticSize.Y
scroll.Parent = window

local grid = Instance.new("UIGridLayout")
grid.CellSize = UDim2.fromOffset(72, 72)
grid.CellPadding = UDim2.fromOffset(8, 8)
grid.SortOrder = Enum.SortOrder.LayoutOrder
grid.Parent = scroll

local tooltip = Instance.new("TextLabel")
tooltip.Visible = false
tooltip.Size = UDim2.fromOffset(120, 28)
tooltip.BackgroundColor3 = Color3.fromRGB(0, 0, 0)
tooltip.BackgroundTransparency = 0.2
tooltip.TextColor3 = Color3.new(1, 1, 1)
tooltip.Font = Enum.Font.Gotham
tooltip.TextSize = 16
tooltip.ZIndex = 10
tooltip.Parent = gui

local slots: {Frame} = {}
local dragging: Frame? = nil
local ghost: Frame? = nil

local function itemName(slot: Frame): string
	return slot:GetAttribute("Item") :: string? or ""
end

local function setItem(slot: Frame, name: string)
	slot:SetAttribute("Item", name)
	local text = slot:FindFirstChild("Name") :: TextLabel
	text.Text = name
end

local function makeSlot(index: number): Frame
	local slot = Instance.new("Frame")
	slot.Name = "Slot" .. index
	slot.LayoutOrder = index
	slot.BackgroundColor3 = Color3.fromRGB(42, 48, 60)
	Instance.new("UICorner").Parent = slot

	local label = Instance.new("TextLabel")
	label.Name = "Name"
	label.Size = UDim2.fromScale(1, 1)
	label.BackgroundTransparency = 1
	label.TextColor3 = Color3.new(1, 1, 1)
	label.Font = Enum.Font.Gotham
	label.TextScaled = true
	label.Text = ""
	label.Parent = slot

	slot.MouseEnter:Connect(function()
		local name = itemName(slot)
		if name == "" or dragging then return end
		tooltip.Text = name
		tooltip.Visible = true
	end)
	slot.MouseLeave:Connect(function()
		tooltip.Visible = false
	end)

	slot.InputBegan:Connect(function(input: InputObject)
		local t = input.UserInputType
		if t ~= Enum.UserInputType.MouseButton1 and t ~= Enum.UserInputType.Touch then return end
		if itemName(slot) == "" then return end
		dragging = slot
		tooltip.Visible = false
		local g = slot:Clone()
		g.AnchorPoint = Vector2.new(0.5, 0.5)
		g.Size = UDim2.fromOffset(72, 72)
		g.Position = UDim2.fromOffset(input.Position.X, input.Position.Y)
		g.BackgroundTransparency = 0.3
		g.ZIndex = 20
		g.Parent = gui
		ghost = g
	end)

	slot.Parent = scroll
	return slot
end

for i = 1, SLOT_COUNT do
	local slot = makeSlot(i)
	slots[i] = slot
	local name = ITEMS[i]
	if name then setItem(slot, name) end
end

UserInputService.InputChanged:Connect(function(input: InputObject)
	local t = input.UserInputType
	if t == Enum.UserInputType.MouseMovement or t == Enum.UserInputType.Touch then
		if ghost then
			ghost.Position = UDim2.fromOffset(input.Position.X, input.Position.Y)
		elseif tooltip.Visible then
			tooltip.Position = UDim2.fromOffset(input.Position.X + 16, input.Position.Y + 16)
		end
	end
end)

UserInputService.InputEnded:Connect(function(input: InputObject)
	local t = input.UserInputType
	if t ~= Enum.UserInputType.MouseButton1 and t ~= Enum.UserInputType.Touch then return end
	local from = dragging
	if from then
		for _, obj in playerGui:GetGuiObjectsAtPosition(input.Position.X, input.Position.Y) do
			if obj ~= ghost and table.find(slots, obj :: any) and obj ~= from then
				local to = obj :: Frame
				local a, b = itemName(from), itemName(to)
				setItem(from, b)
				setItem(to, a)
				break
			end
		end
	end
	if ghost then ghost:Destroy() end
	ghost, dragging = nil, nil
end)

-- Toggle with the I key
UserInputService.InputBegan:Connect(function(input: InputObject, processed: boolean)
	if processed then return end
	if input.KeyCode == Enum.KeyCode.I then
		gui.Enabled = not gui.Enabled
	end
end)

gui.Parent = playerGui
```

**Notes**

- `AutomaticCanvasSize` makes the scroll area grow with the number of slots.
- On phones add an on-screen button that sets `gui.Enabled`, since there is no I key.
- Swapping items here is visual only. To make it real, fire a RemoteEvent with the two slot numbers and let the server validate and apply the swap.
