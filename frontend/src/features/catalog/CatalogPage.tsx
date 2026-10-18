import React, { useEffect, useState } from "react";
import { Search, LayoutGrid, ListFilter, AlertCircle, RefreshCw } from "lucide-react";
import { fetchCalculators } from "@/api/discovery";
import { CalculatorMetadata } from "@/api/types";
import { CalculatorCard } from "./CalculatorCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const CatalogPage: React.FC = () => {
  const [calculators, setCalculators] = useState<CalculatorMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"grouped" | "all">("grouped");

  const loadCalculators = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetchCalculators();
      setCalculators(res.calculators || []);
    } catch (err) {
      setError("Unable to connect to the backend calculator service. Ensure the backend is running.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCalculators();
  }, []);

  const filtered = calculators.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.description.toLowerCase().includes(search.toLowerCase()) ||
      c.category_label.toLowerCase().includes(search.toLowerCase())
  );

  const categories = Array.from(new Set(filtered.map((c) => c.category_label)));

  return (
    <div className="w-full max-w-[1700px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            EE Calculator Catalog
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Modular engineering calculators with interactive visual analysis.
          </p>
        </div>

        {/* Search and view toggle */}
        <div className="flex items-center gap-3">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search calculators..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-xs"
            />
          </div>

          <div className="flex items-center rounded-md border p-0.5 bg-muted/40">
            <button
              type="button"
              onClick={() => setViewMode("grouped")}
              className={`p-1.5 rounded text-xs flex items-center gap-1 transition-colors ${
                viewMode === "grouped"
                  ? "bg-background text-foreground shadow-sm font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title="Grouped by Category"
            >
              <ListFilter className="h-4 w-4" />
              <span className="hidden sm:inline text-xs">Grouped</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("all")}
              className={`p-1.5 rounded text-xs flex items-center gap-1 transition-colors ${
                viewMode === "all"
                  ? "bg-background text-foreground shadow-sm font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title="All Calculators Flat View"
            >
              <LayoutGrid className="h-4 w-4" />
              <span className="hidden sm:inline text-xs">All</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="h-40 rounded-lg border border-border bg-card/50 p-6 animate-pulse space-y-3"
            >
              <div className="h-4 w-24 bg-muted rounded" />
              <div className="h-6 w-48 bg-muted rounded" />
              <div className="h-3 w-full bg-muted rounded" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-center space-y-3">
          <AlertCircle className="h-8 w-8 text-destructive mx-auto" />
          <h3 className="font-semibold text-destructive">Failed to Load Catalog</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">{error}</p>
          <Button variant="outline" size="sm" onClick={loadCalculators} className="mt-2">
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
            Retry
          </Button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center text-muted-foreground space-y-2">
          <p className="font-medium text-sm">No calculators match your search.</p>
          <Button variant="ghost" size="sm" onClick={() => setSearch("")} className="text-xs">
            Clear search filter
          </Button>
        </div>
      ) : viewMode === "grouped" ? (
        <div className="space-y-10">
          {categories.map((category) => {
            const items = filtered.filter((c) => c.category_label === category);
            return (
              <div key={category} className="space-y-4">
                <div className="flex items-center gap-2 border-b pb-2">
                  <h2 className="text-lg font-bold text-foreground tracking-tight">
                    {category}
                  </h2>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-mono">
                    {items.length}
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {items.map((calc) => (
                    <CalculatorCard key={calc.id} calculator={calc} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((calc) => (
            <CalculatorCard key={calc.id} calculator={calc} />
          ))}
        </div>
      )}
    </div>
  );
};

