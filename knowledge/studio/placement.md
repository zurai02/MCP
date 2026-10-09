# Where scripts and assets go in Roblox Studio

Where a script lives decides where it runs and who can see it. Always tell the user the container, the script type and the exact names of anything the script expects to find.

## Script types

| Type | Runs on | Runs when it is inside |
| --- | --- | --- |
| `Script` | Server | Workspace, ServerScriptService |
| `Script` with `RunContext = Client` | Client | Anywhere a client can see it, such as ReplicatedStorage or a part in Workspace |
| `LocalScript` | Client | StarterPlayerScripts, StarterGui, StarterCharacterScripts, StarterPack, or the player's Backpack, PlayerGui and character |
| `ModuleScript` | Whoever requires it | Anywhere. It does nothing until something calls `require` |

A `LocalScript` sitting in Workspace or ServerScriptService never runs.

## Containers

- **ServerScriptService**: server scripts. Clients cannot see or download them. Put game logic, data saving and anything players must not tamper with here.
- **ServerStorage**: server-only assets and modules (round maps, weapon templates, loot tables).
- **ReplicatedStorage**: shared with server and client. Put RemoteEvents, RemoteFunctions, shared ModuleScripts and assets the client needs here. Never put secrets here.
- **ReplicatedFirst**: loading screens. Runs before everything else.
- **StarterGui**: UI. Copied into each player's `PlayerGui` on spawn (unless `ResetOnSpawn = false`).
- **StarterPlayer/StarterPlayerScripts**: client scripts that run once per player when they join.
- **StarterPlayer/StarterCharacterScripts**: scripts copied into the character on every spawn.
- **StarterPack**: tools given to each player on spawn.
- **Workspace**: the 3D world. Parts, models, spawns. Server scripts here run, but prefer ServerScriptService.
- **Lighting, SoundService, Teams**: their own services. Configure there.

## A tidy layout

```
ReplicatedStorage
  Remotes          (Folder)
    BuyItem        (RemoteEvent)
  Shared           (Folder)
    MathUtil       (ModuleScript)
ServerScriptService
  GameServer       (Script)
  PlayerData       (Script)
ServerStorage
  Templates        (Folder)
StarterPlayer
  StarterPlayerScripts
    MainMenu       (LocalScript)
Workspace
  Checkpoints      (Folder)
```

## How to describe a setup to the user

Say things like: "Insert a `Script` into `ServerScriptService` and name it `PlayerData`", and list required instances: "`ReplicatedStorage > Remotes > BuyItem` (RemoteEvent)". Use `WaitForChild` on the client for anything in ReplicatedStorage, since it may not have replicated yet.

## Tags, attributes and names

- Prefer tags (Tag Editor, or `CollectionService:AddTag`) to find groups of parts, instead of relying on parent names.
- Use attributes (Properties panel → Attributes) for per-part settings such as `Damage` or `RespawnTime`. The script reads them with `GetAttribute`.
- Use exact, case-sensitive names. `Coins` is not `coins`.
