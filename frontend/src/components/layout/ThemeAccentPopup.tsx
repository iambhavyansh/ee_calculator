import React, { useState, useRef, useEffect } from "react";
import { Palette, Sun, Moon, Laptop, Check } from "lucide-react";
import { useTheme, ACCENT_OPTIONS, AccentColor } from "@/context/ThemeContext";
import { Button } from "@/components/ui/button";

export const ThemeAccentPopup: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const popupRef = useRef<HTMLDivElement>(null);
  const { theme, setTheme, accent, setAccent } = useTheme();

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  return (
    <div className="relative" ref={popupRef}>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 border-border bg-card text-card-foreground hover:bg-accent"
        aria-label="Theme and Accent Settings"
      >
        <Palette className="h-4 w-4" />
        <span className="hidden sm:inline text-xs font-medium">Appearance</span>
      </Button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 rounded-lg border bg-popover p-4 text-popover-foreground shadow-lg z-50 animate-in fade-in-50 zoom-in-95">
          {/* Theme Mode Toggle */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Theme Mode
            </h4>
            <div className="grid grid-cols-3 gap-1 rounded-md border p-1 bg-muted/40">
              <button
                type="button"
                onClick={() => setTheme("light")}
                className={`flex items-center justify-center gap-1 rounded py-1.5 text-xs font-medium transition-colors ${
                  theme === "light"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Sun className="h-3.5 w-3.5" />
                Light
              </button>
              <button
                type="button"
                onClick={() => setTheme("dark")}
                className={`flex items-center justify-center gap-1 rounded py-1.5 text-xs font-medium transition-colors ${
                  theme === "dark"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Moon className="h-3.5 w-3.5" />
                Dark
              </button>
              <button
                type="button"
                onClick={() => setTheme("system")}
                className={`flex items-center justify-center gap-1 rounded py-1.5 text-xs font-medium transition-colors ${
                  theme === "system"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Laptop className="h-3.5 w-3.5" />
                Auto
              </button>
            </div>
          </div>

          {/* Accent Color Selection (6 Options) */}
          <div className="mt-4 space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Accent Color
            </h4>
            <div className="grid grid-cols-3 gap-2">
              {ACCENT_OPTIONS.map((opt) => {
                const isSelected = accent === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setAccent(opt.id as AccentColor)}
                    className={`flex items-center gap-2 rounded-md border p-2 text-xs font-medium transition-all ${
                      isSelected
                        ? "border-primary bg-primary/10 text-foreground ring-1 ring-primary"
                        : "border-border hover:bg-accent hover:text-accent-foreground text-muted-foreground"
                    }`}
                  >
                    <span
                      className="h-3.5 w-3.5 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: opt.lightHex }}
                    >
                      {isSelected && <Check className="h-2.5 w-2.5 text-white stroke-[3]" />}
                    </span>
                    <span className="truncate">{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
