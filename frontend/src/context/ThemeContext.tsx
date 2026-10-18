import React, { createContext, useContext, useEffect, useState } from "react";

export type Theme = "light" | "dark" | "system";
export type AccentColor = "blue" | "violet" | "emerald" | "rose" | "amber" | "cyan";

export interface AccentOption {
  id: AccentColor;
  label: string;
  lightHex: string;
  darkHex: string;
}

export const ACCENT_OPTIONS: AccentOption[] = [
  { id: "blue", label: "Blue", lightHex: "#2563eb", darkHex: "#3b82f6" },
  { id: "violet", label: "Violet", lightHex: "#7c3aed", darkHex: "#a78bfa" },
  { id: "emerald", label: "Emerald", lightHex: "#059669", darkHex: "#34d399" },
  { id: "rose", label: "Rose", lightHex: "#e11d48", darkHex: "#fb7185" },
  { id: "amber", label: "Amber", lightHex: "#d97706", darkHex: "#fbbf24" },
  { id: "cyan", label: "Cyan", lightHex: "#0891b2", darkHex: "#22d3ee" },
];

interface ThemeContextType {
  theme: Theme;
  resolvedTheme: "light" | "dark";
  accent: AccentColor;
  setTheme: (theme: Theme) => void;
  setAccent: (accent: AccentColor) => void;
  getAccentHex: () => string;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>(() => {
    try {
      return (localStorage.getItem("ee_theme") as Theme) || "system";
    } catch {
      return "system";
    }
  });

  const [accent, setAccentState] = useState<AccentColor>(() => {
    try {
      return (localStorage.getItem("ee_accent") as AccentColor) || "blue";
    } catch {
      return "blue";
    }
  });

  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">(() => {
    if (typeof window === "undefined") return "light";
    if (theme === "system") {
      return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
    return theme;
  });

  useEffect(() => {
    const handleSystemChange = (e: MediaQueryListEvent) => {
      if (theme === "system") {
        setResolvedTheme(e.matches ? "dark" : "light");
      }
    };

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    mediaQuery.addEventListener("change", handleSystemChange);
    return () => mediaQuery.removeEventListener("change", handleSystemChange);
  }, [theme]);

  useEffect(() => {
    const root = document.documentElement;
    const currentResolved = theme === "system"
      ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
      : theme;

    setResolvedTheme(currentResolved);

    if (currentResolved === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }

    root.setAttribute("data-accent", accent);

    try {
      localStorage.setItem("ee_theme", theme);
      localStorage.setItem("ee_accent", accent);
    } catch {}
  }, [theme, accent]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
  };

  const setAccent = (newAccent: AccentColor) => {
    setAccentState(newAccent);
  };

  const getAccentHex = (): string => {
    const option = ACCENT_OPTIONS.find((o) => o.id === accent) || ACCENT_OPTIONS[0];
    return resolvedTheme === "dark" ? option.darkHex : option.lightHex;
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        resolvedTheme,
        accent,
        setTheme,
        setAccent,
        getAccentHex,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};

