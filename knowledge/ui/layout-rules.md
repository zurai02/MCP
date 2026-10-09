# Layout rules for Roblox UI that works on every screen

Phones, tablets, consoles and 4K monitors all run the same UI. Size it with scale and constraints, not fixed pixels.

## UDim2 in one minute

`UDim2.new(xScale, xOffset, yScale, yOffset)`. Scale is a fraction of the parent (0 to 1). Offset is pixels.

```lua
UDim2.fromScale(0.3, 0.5)    -- 30% wide, 50% tall
UDim2.fromOffset(200, 50)    -- exactly 200 x 50 pixels
UDim2.new(0.5, -100, 0, 40)  -- half the parent minus 100px, 40px from the top
```

## Rules

1. Use scale for position and size. Use offset only for small things that must stay the same, such as a 2px border or 8px padding.
2. Center with `AnchorPoint = Vector2.new(0.5, 0.5)` and `Position = UDim2.fromScale(0.5, 0.5)`.
3. Keep shape with `UIAspectRatioConstraint` (square buttons, 16:9 panels).
4. Cap growth with `UISizeConstraint` (`MinSize` and `MaxSize` in pixels) so panels do not stretch across a 4K monitor or shrink to nothing.
5. Text: `TextScaled = true` plus `UITextSizeConstraint` (`MinTextSize` 14, `MaxTextSize` 36). Or use fixed `TextSize` for body text.
6. Let layout objects position children: `UIListLayout` (rows or columns), `UIGridLayout` (grids), `UIPadding`, `UICorner`, `UIStroke`. Do not hand-place every child.
7. Parent containers that grow with content use `AutomaticSize` (`Enum.AutomaticSize.Y`). Scrolling lists use `ScrollingFrame.AutomaticCanvasSize = Enum.AutomaticSize.Y`.

## Phones

- Touch targets at least 44 x 44 pixels. Use `Active = true` on frames that should block clicks from passing through.
- Respect safe areas. `ScreenGui.ScreenInsets = Enum.ScreenInsets.DeviceSafeInsets` keeps UI clear of notches and rounded corners.
- Keep the top-left clear (the Roblox menu button lives there) and the bottom-right on phones (jump and thumbstick area).
- Test with Studio's device emulator (Test tab → Device) for phone, tablet and console sizes.

## ScreenGui settings

```lua
gui.ResetOnSpawn = false                              -- keep the UI when the character respawns
gui.ZIndexBehavior = Enum.ZIndexBehavior.Sibling      -- layering follows the tree and ZIndex
gui.IgnoreGuiInset = true                             -- true: starts at the very top of the screen (below the safe area if set)
```

## Where UI code goes

A `LocalScript` in `StarterGui` (or inside the ScreenGui) runs on each client. Build UI on the client only. The server must never trust what the client's UI says (see the remotes guideline).
