# Tweens and UI animation

Let `TweenService` animate properties. Do not move things yourself in a `while` loop.

```lua
--!strict
local TweenService = game:GetService("TweenService")

local info = TweenInfo.new(
	0.3,                            -- time in seconds
	Enum.EasingStyle.Quint,         -- curve
	Enum.EasingDirection.Out,       -- Out feels responsive, In accelerates away
	0,                              -- repeat count (-1 loops forever)
	false,                          -- reverses
	0                               -- delay
)

local tween = TweenService:Create(frame, info, {
	Position = UDim2.fromScale(0.5, 0.5),
	BackgroundTransparency = 0,
})
tween:Play()
tween.Completed:Wait()  -- yields until done
```

## Good defaults

- Open and close panels: `Quint` or `Quad`, 0.25 to 0.5 seconds, `Out` when appearing and `In` when leaving.
- Hover and press feedback: `Quad`, 0.1 to 0.15 seconds.
- Pop or bounce: `Back` with `Out`.
- Keep motion short. Players click again and again.

## Tweenable properties

Numbers, `UDim2`, `Color3`, `Vector2`, `Vector3`, `CFrame`, `bool` (snaps). Examples: `Position`, `Size`, `Rotation`, `BackgroundColor3`, `BackgroundTransparency`, `TextTransparency`, `ImageTransparency`, `Transparency`.

## Avoid overlapping tweens

Two tweens fighting over the same property cause jitter. Keep the active one and cancel it first:

```lua
local active: {[GuiObject]: Tween} = {}

local function tweenTo(obj: GuiObject, info: TweenInfo, goal: {[string]: any})
	local old = active[obj]
	if old then old:Cancel() end
	local t = TweenService:Create(obj, info, goal)
	active[obj] = t
	t.Completed:Once(function()
		if active[obj] == t then active[obj] = nil end
	end)
	t:Play()
end
```

## Sequences

```lua
local fadeIn = TweenService:Create(label, TweenInfo.new(0.3), { TextTransparency = 0 })
local slide = TweenService:Create(label, TweenInfo.new(0.3), { Position = UDim2.fromScale(0.5, 0.5) })
fadeIn:Play()
fadeIn.Completed:Wait()
slide:Play()
```

## Fading a whole panel

Tween the `GroupTransparency` of a `CanvasGroup` instead of tweening every child.
