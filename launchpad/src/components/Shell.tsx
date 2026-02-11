"use client";

import { Toaster } from "sonner";
import { Header } from "./Header";
import { ChainGuard } from "./ChainGuard";
import { ThemeToggle } from "./ThemeToggle";

export function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Toaster position="bottom-right" richColors closeButton />
      <Header />
      <main className="pt-20 pb-6">
        <div className="mx-auto max-w-6xl px-4">
          <ChainGuard />
        </div>
        {children}
      </main>
      {/* Floating theme toggle — bottom right */}
      <div className="fixed right-4 bottom-4 z-50">
        <ThemeToggle />
      </div>
    </div>
  );
}
