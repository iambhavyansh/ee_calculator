import React from "react";
import { Outlet } from "react-router-dom";
import { ThemeProvider } from "@/context/ThemeContext";
import { Header } from "@/components/layout/Header";

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <div className="min-h-screen flex flex-col bg-background text-foreground antialiased selection:bg-primary/20 selection:text-primary">
        <Header />
        <main className="flex-1 pb-16">
          <Outlet />
        </main>
        <footer className="border-t py-4 text-center text-xs text-muted-foreground">
          <div className="w-full max-w-[1700px] mx-auto px-4 sm:px-6 lg:px-8">
            EE Calculator &bull; Academic Engineering Platform
          </div>
        </footer>
      </div>
    </ThemeProvider>
  );
};

export default App;

