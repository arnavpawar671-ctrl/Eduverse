import { useEffect, useState } from "react";

export type Theme = "light" | "dark";
const KEY = "eduverse-theme";

function apply(t: Theme) {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("dark", t === "dark");
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>("light");
  useEffect(() => {
    const saved = (typeof localStorage !== "undefined" && localStorage.getItem(KEY)) as Theme | null;
    const initial: Theme = saved ?? (window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    setTheme(initial);
    apply(initial);
  }, []);
  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    apply(next);
    try { localStorage.setItem(KEY, next); } catch { /* ignore */ }
  }
  return { theme, toggle };
}
