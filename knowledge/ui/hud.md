# HUD: a coin counter that updates itself

**Needs:** the server creates `leaderstats` with an `IntValue` named `Coins` on each player (see the `coin-pickup` recipe).

**Where it goes:** a `LocalScript` named `CoinHud` in `StarterPlayer/StarterPlayerScripts`.

```lua
--!strict
local Players = game:GetService("Players")
local TweenService = game:GetService("TweenService")

local player = Players.LocalPlayer
local playerGui = player:WaitForChild("PlayerGui")

local gui = Instance.new("ScreenGui")
gui.Name = "CoinHud"
gui.ResetOnSpawn = false
gui.ScreenInsets = Enum.ScreenInsets.DeviceSafeInsets

local label = Instance.new("TextLabel")
label.AnchorPoint = Vector2.new(1, 0)
label.Position = UDim2.new(1, -16, 0, 16)
label.Size = UDim2.fromScale(0.18, 0.07)
label.BackgroundColor3 = Color3.fromRGB(18, 22, 29)
label.BackgroundTransparency = 0.2
label.TextColor3 = Color3.fromRGB(255, 214, 102)
label.Font = Enum.Font.GothamBold
label.TextScaled = true
label.Text = "Coins: 0"
label.Parent = gui

local corner = Instance.new("UICorner")
corner.CornerRadius = UDim.new(0, 10)
corner.Parent = label

local limit = Instance.new("UITextSizeConstraint")
limit.MinTextSize = 14
limit.MaxTextSize = 30
limit.Parent = label

local ratio = Instance.new("UIAspectRatioConstraint")
ratio.AspectRatio = 3.2
ratio.Parent = label

gui.Parent = playerGui

local leaderstats = player:WaitForChild("leaderstats")
local coins = leaderstats:WaitForChild("Coins") :: IntValue

local popInfo = TweenInfo.new(0.15, Enum.EasingStyle.Back, Enum.EasingDirection.Out)

local function render()
	label.Text = "Coins: " .. coins.Value
	label.Rotation = -4
	TweenService:Create(label, popInfo, { Rotation = 0 }):Play()
end

coins:GetPropertyChangedSignal("Value"):Connect(render)
render()
```

**Notes**

- Read values the server already replicates (`leaderstats`, attributes, `Values`). Never trust a number the client made up for gameplay, it is for display only.
- For values that are not in `leaderstats`, use attributes: the server calls `player:SetAttribute("Gems", 5)`, the client listens with `player:GetAttributeChangedSignal("Gems")`.
- Anchor to the top-right and keep it small so it does not cover the Roblox menu (top-left) or touch controls (bottom).
