# Main menu with tweened buttons (works on phone and desktop)

**Where it goes:** a `LocalScript` named `MainMenu` in `StarterPlayer/StarterPlayerScripts`. It builds the whole UI in code, so nothing else needs to exist.

```lua
--!strict
local Players = game:GetService("Players")
local TweenService = game:GetService("TweenService")

local player = Players.LocalPlayer
local playerGui = player:WaitForChild("PlayerGui")

local gui = Instance.new("ScreenGui")
gui.Name = "MainMenu"
gui.ResetOnSpawn = false
gui.IgnoreGuiInset = true
gui.ZIndexBehavior = Enum.ZIndexBehavior.Sibling
gui.ScreenInsets = Enum.ScreenInsets.DeviceSafeInsets

local panel = Instance.new("Frame")
panel.Name = "Panel"
panel.AnchorPoint = Vector2.new(0.5, 0.5)
panel.Size = UDim2.fromScale(0.35, 0.55)
panel.Position = UDim2.fromScale(0.5, 1.5) -- starts below the screen
panel.BackgroundColor3 = Color3.fromRGB(24, 28, 36)
panel.Active = true
panel.Parent = gui

local corner = Instance.new("UICorner")
corner.CornerRadius = UDim.new(0, 16)
corner.Parent = panel

local size = Instance.new("UISizeConstraint")
size.MinSize = Vector2.new(260, 260)
size.MaxSize = Vector2.new(480, 520)
size.Parent = panel

local padding = Instance.new("UIPadding")
padding.PaddingTop = UDim.new(0, 16)
padding.PaddingBottom = UDim.new(0, 16)
padding.PaddingLeft = UDim.new(0, 16)
padding.PaddingRight = UDim.new(0, 16)
padding.Parent = panel

local list = Instance.new("UIListLayout")
list.Padding = UDim.new(0, 12)
list.FillDirection = Enum.FillDirection.Vertical
list.HorizontalAlignment = Enum.HorizontalAlignment.Center
list.VerticalAlignment = Enum.VerticalAlignment.Center
list.SortOrder = Enum.SortOrder.LayoutOrder
list.Parent = panel

local function makeButton(text: string, order: number): TextButton
	local button = Instance.new("TextButton")
	button.Name = text
	button.LayoutOrder = order
	button.Size = UDim2.new(1, 0, 0.2, 0)
	button.BackgroundColor3 = Color3.fromRGB(42, 107, 255)
	button.TextColor3 = Color3.new(1, 1, 1)
	button.Font = Enum.Font.GothamBold
	button.TextScaled = true
	button.Text = text
	button.AutoButtonColor = false

	local c = Instance.new("UICorner")
	c.CornerRadius = UDim.new(0, 12)
	c.Parent = button

	local textLimit = Instance.new("UITextSizeConstraint")
	textLimit.MinTextSize = 14
	textLimit.MaxTextSize = 28
	textLimit.Parent = button

	local hover = TweenInfo.new(0.12, Enum.EasingStyle.Quad, Enum.EasingDirection.Out)
	button.MouseEnter:Connect(function()
		TweenService:Create(button, hover, { BackgroundColor3 = Color3.fromRGB(80, 140, 255) }):Play()
	end)
	button.MouseLeave:Connect(function()
		TweenService:Create(button, hover, { BackgroundColor3 = Color3.fromRGB(42, 107, 255) }):Play()
	end)

	button.Parent = panel
	return button
end

local play = makeButton("Play", 1)
local settings = makeButton("Settings", 2)
local credits = makeButton("Credits", 3)

local function slideIn()
	local info = TweenInfo.new(0.5, Enum.EasingStyle.Quint, Enum.EasingDirection.Out)
	TweenService:Create(panel, info, { Position = UDim2.fromScale(0.5, 0.5) }):Play()
end

local function slideOutAndClose()
	local info = TweenInfo.new(0.35, Enum.EasingStyle.Quint, Enum.EasingDirection.In)
	local tween = TweenService:Create(panel, info, { Position = UDim2.fromScale(0.5, 1.5) })
	tween.Completed:Once(function()
		gui:Destroy()
	end)
	tween:Play()
end

play.Activated:Connect(slideOutAndClose)
settings.Activated:Connect(function()
	-- open your settings panel here
end)
credits.Activated:Connect(function()
	-- open your credits panel here
end)

gui.Parent = playerGui
slideIn()
```

**Why it works on mobile:** sizes are scale-based with min and max caps, the buttons are large, and `Activated` fires for mouse, touch and gamepad.

**Most likely problem:** the menu does not appear. Check the script is a `LocalScript` (not a `Script`) and sits in `StarterPlayerScripts`. Look in the Output for errors.
