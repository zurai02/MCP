// Quick pattern-based checks for common Luau and Roblox mistakes.
// This is not a full analyzer. It catches the usual suspects fast.

const LINE_RULES = [
  {
    re: /(^|[^.\w:])wait\s*\(/,
    severity: "warn",
    message: "`wait()` is deprecated.",
    fix: "Use `task.wait()`.",
  },
  {
    re: /(^|[^.\w:])spawn\s*\(/,
    severity: "warn",
    message: "`spawn()` is deprecated.",
    fix: "Use `task.spawn()` (or `task.defer()`).",
  },
  {
    re: /(^|[^.\w:])delay\s*\(/,
    severity: "warn",
    message: "`delay()` is deprecated.",
    fix: "Use `task.delay()`.",
  },
  {
    re: /:connect\s*\(/,
    severity: "warn",
    message: "Lowercase `:connect` is deprecated.",
    fix: "Use `:Connect(...)`.",
  },
  {
    re: /Instance\.new\(\s*["'][^"']+["']\s*,\s*[^)\s][^)]*\)/,
    severity: "warn",
    message: "Passing a parent to `Instance.new` is slow and discouraged.",
    fix: "Set all properties first, then set `.Parent` last.",
  },
  {
    re: /FindFirstChild\(\s*["']Humanoid["']\s*\)/,
    severity: "info",
    message: "`FindFirstChild(\"Humanoid\")` matches by name only.",
    fix: "Use `FindFirstChildOfClass(\"Humanoid\")`.",
  },
  {
    re: /[hH]umanoid\s*:\s*LoadAnimation\s*\(/,
    severity: "warn",
    message: "`Humanoid:LoadAnimation` is deprecated.",
    fix: "Load animations through the Animator: `humanoid:WaitForChild(\"Animator\"):LoadAnimation(anim)`.",
  },
  {
    re: /:\s*[Rr]emove\s*\(\s*\)/,
    severity: "warn",
    message: "`:Remove()` is deprecated.",
    fix: "Use `:Destroy()`.",
  },
  {
    re: /^function\s+\w+\s*\(/,
    severity: "warn",
    message: "Global function (missing `local`).",
    fix: "Declare it as `local function name(...)`.",
  },
  {
    re: /\bgame\.(Players|ReplicatedStorage|ServerStorage|ServerScriptService|Lighting|RunService|TweenService|UserInputService|DataStoreService|CollectionService)\b/,
    severity: "info",
    message: "Services accessed by property name.",
    fix: "Use `game:GetService(\"Name\")`.",
  },
  {
    re: /\b(BodyVelocity|BodyGyro|BodyPosition|BodyForce|BodyAngularVelocity)\b/,
    severity: "warn",
    message: "Legacy body movers are deprecated.",
    fix: "Use LinearVelocity, AlignOrientation, AlignPosition or VectorForce.",
  },
];

export function reviewLuau(code) {
  const lines = code.split(/\r?\n/);
  const findings = [];

  // Header check
  const head = lines.slice(0, 3).join("\n");
  if (!/^\s*--!(strict|nonstrict|nocheck)/m.test(head)) {
    findings.push({
      line: 1,
      severity: "info",
      message: "No type-checking mode set.",
      fix: "Put `--!strict` on the first line.",
    });
  }

  // Per-line checks
  lines.forEach((line, i) => {
    if (/^\s*--/.test(line)) return; // full-line comment
    for (const rule of LINE_RULES) {
      if (rule.re.test(line)) {
        findings.push({ line: i + 1, severity: rule.severity, message: rule.message, fix: rule.fix });
      }
    }
  });

  // Whole-file checks
  const firstLineWith = (re) => {
    const idx = lines.findIndex((l) => !/^\s*--/.test(l) && re.test(l));
    return idx === -1 ? 1 : idx + 1;
  };

  if (/\b(GetAsync|SetAsync|UpdateAsync|IncrementAsync|RemoveAsync)\b/.test(code) && !/pcall/.test(code)) {
    findings.push({
      line: firstLineWith(/\b(GetAsync|SetAsync|UpdateAsync|IncrementAsync|RemoveAsync)\b/),
      severity: "warn",
      message: "DataStore call with no `pcall` in the file. DataStore requests can fail.",
      fix: "Wrap calls in `pcall` and retry or handle the failure. Never save over data you failed to load.",
    });
  }

  if (/OnServerEvent|OnServerInvoke/.test(code) && !/typeof\s*\(|\btype\s*\(|tonumber|tostring/.test(code)) {
    findings.push({
      line: firstLineWith(/OnServerEvent|OnServerInvoke/),
      severity: "warn",
      message: "Remote handler with no visible argument validation. The client can send anything.",
      fix: "Check `typeof(arg)`, ranges and permissions on the server before acting.",
    });
  }

  if (/while\s+true\s+do/.test(code) && !/task\.wait|:Wait\s*\(|Heartbeat|Stepped|RenderStepped|WaitForChild/.test(code)) {
    findings.push({
      line: firstLineWith(/while\s+true\s+do/),
      severity: "warn",
      message: "`while true do` with no yield can freeze the game (\"exhausted allowed execution time\").",
      fix: "Add `task.wait()` or switch to an event such as `RunService.Heartbeat`.",
    });
  }

  findings.sort((a, b) => a.line - b.line);

  if (findings.length === 0) {
    return "No issues from the automatic checks (pattern checks only, not a full analyzer).";
  }

  // Group repeats so a script with 30 `wait()` calls costs one row, not thirty.
  const groups = new Map();
  for (const f of findings) {
    const key = `${f.severity}|${f.message}`;
    const g = groups.get(key) || { ...f, lines: [] };
    g.lines.push(f.line);
    groups.set(key, g);
  }
  const where = (lines) => {
    const shown = lines.slice(0, 8).join(", ");
    const more = lines.length > 8 ? ` +${lines.length - 8} more` : "";
    return `${lines.length === 1 ? "line" : "lines"} ${shown}${more}`;
  };
  const rows = [...groups.values()].map((g) => `- [${g.severity}] ${where(g.lines)}: ${g.message} ${g.fix}`);
  return `${findings.length} issue${findings.length === 1 ? "" : "s"}:\n${rows.join("\n")}`;
}
