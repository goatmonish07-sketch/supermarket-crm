import { Check, Monitor, Moon, Sun } from "lucide-react";
import { THEMES } from "@/lib/themes";
import { cn } from "@/lib/utils";
import { saveAppearanceAction } from "./actions";

const MODES = [
  { id: "LIGHT", label: "Light", icon: Sun },
  { id: "DARK", label: "Dark", icon: Moon },
  { id: "SYSTEM", label: "Auto", icon: Monitor },
] as const;

export function Appearance({ theme, mode }: { theme: string; mode: string }) {
  return (
    <div className="space-y-6">
      <div>
        <p className="label">Theme</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {THEMES.map((t) => (
            <form key={t.id} action={saveAppearanceAction}>
              <input type="hidden" name="theme" value={t.id} />
              <input type="hidden" name="themeMode" value={mode} />
              <button
                aria-pressed={theme === t.id}
                className={cn(
                  "relative w-full rounded-2xl border-2 p-3 text-left transition hover:-translate-y-0.5",
                  theme === t.id ? "border-primary" : "border-border",
                )}
              >
                <span className="flex h-14 overflow-hidden rounded-xl">
                  {t.swatch.map((c) => (
                    <span key={c} className="flex-1" style={{ background: c }} />
                  ))}
                </span>
                <span className="mt-2 block text-sm font-semibold">{t.name}</span>
                {theme === t.id && (
                  <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-fg">
                    <Check className="h-4 w-4" />
                  </span>
                )}
              </button>
            </form>
          ))}
        </div>
      </div>
      <div>
        <p className="label">Mode</p>
        <div className="inline-flex rounded-full bg-surface-2 p-1">
          {MODES.map((m) => (
            <form key={m.id} action={saveAppearanceAction}>
              <input type="hidden" name="theme" value={theme} />
              <input type="hidden" name="themeMode" value={m.id} />
              <button
                aria-pressed={mode === m.id}
                className={cn(
                  "inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm font-medium transition",
                  mode === m.id ? "bg-surface text-fg shadow-card" : "text-muted hover:text-fg",
                )}
              >
                <m.icon className="h-4 w-4" />
                {m.label}
              </button>
            </form>
          ))}
        </div>
      </div>
    </div>
  );
}
