import React from "react";
import { Link, useLocation } from "react-router-dom";
import { Home, Calculator } from "lucide-react";
import { ThemeAccentPopup } from "./ThemeAccentPopup";
import { Button } from "@/components/ui/button";

export const Header: React.FC = () => {
  const location = useLocation();
  const isHome = location.pathname === "/" || location.pathname === "/calculators";

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="w-full max-w-[1700px] mx-auto flex h-14 items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Top Left: Home Button and App Title */}
        <div className="flex items-center gap-3">
          <Link to="/" className="flex items-center gap-2 group">
            <Button
              variant={isHome ? "default" : "outline"}
              size="sm"
              className="flex items-center gap-1.5 h-8 px-2.5"
              aria-label="Go to Home"
            >
              <Home className="h-4 w-4" />
              <span className="text-xs font-semibold">Home</span>
            </Button>
          </Link>

          <div className="h-4 w-px bg-border hidden sm:block" />

          <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="h-7 w-7 rounded-md bg-primary flex items-center justify-center text-primary-foreground">
              <Calculator className="h-4 w-4" />
            </div>
            <span className="font-semibold text-sm tracking-tight text-foreground">
              EE Calculator
            </span>
          </Link>
        </div>

        {/* Top Right: Theme & Accent Selector Popup */}
        <div className="flex items-center gap-3">
          <ThemeAccentPopup />
        </div>
      </div>
    </header>
  );
};

