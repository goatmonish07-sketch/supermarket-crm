// Keep in sync with the [data-theme] blocks in app/globals.css.
export const THEMES = [
  { id: "emerald", name: "Emerald", swatch: ["#266244", "#153c29", "#d6a85c"] },
  { id: "rose", name: "Rose", swatch: ["#a04062", "#702442", "#c8965a"] },
  { id: "midnight", name: "Midnight", swatch: ["#4848a8", "#2a2a74", "#78c8dc"] },
  { id: "sand", name: "Sand", swatch: ["#966828", "#684616", "#6e8c64"] },
  { id: "ocean", name: "Ocean", swatch: ["#187084", "#0c4858", "#ec9660"] },
] as const;

export type ThemeId = (typeof THEMES)[number]["id"];

export const THEME_MODES = ["LIGHT", "DARK", "SYSTEM"] as const;
export type ThemeModeId = (typeof THEME_MODES)[number];

export function isThemeId(value: string): value is ThemeId {
  return THEMES.some((t) => t.id === value);
}
