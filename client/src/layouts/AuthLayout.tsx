/**
 * Authentication Layout Component
 * 
 * Separate layout for login/signup pages WITHOUT sidebar navigation.
 * Provides a clean, focused authentication experience for HealthMesh.
 * 
 * Features:
 * - No sidebar or top navigation
 * - Full-screen auth experience
 * - Healthcare-appropriate branding
 * - Theme toggle support
 * - Responsive design
 */

import { ReactNode } from "react";
import { ThemeToggle } from "@/components/theme-toggle";

interface AuthLayoutProps {
  children: ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden bg-background">
      {/* Animated Ambient Background */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40vw] h-[40vw] rounded-full bg-primary/20 blur-[120px] animate-fade-in" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40vw] h-[40vw] rounded-full bg-blue-500/20 blur-[120px] animate-fade-in" style={{ animationDelay: "0.5s" }} />
        <div className="absolute top-[30%] left-[50%] -translate-x-1/2 w-[50vw] h-[50vw] rounded-full bg-indigo-500/10 blur-[150px] animate-pulse" style={{ animationDuration: "8s" }} />
        {/* Grid Pattern Overlay */}
        <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]" style={{ opacity: 0.1 }} />
      </div>

      <div className="relative z-10 flex-1 flex flex-col">
        {/* Theme toggle in top right */}
        <div className="absolute top-6 right-6 z-50">
          <ThemeToggle />
        </div>

        {/* Main content - centered */}
        <div className="flex-1 flex items-center justify-center p-4">
          {children}
        </div>

        {/* Footer */}
        <footer className="py-8 text-center text-sm text-muted-foreground/60 backdrop-blur-sm">
          <p className="font-medium tracking-wide">HealthMesh © 2026</p>
          <p className="mt-2 text-xs opacity-75">
            Advanced Clinical Decision Support System
          </p>
        </footer>
      </div>
    </div>
  );
}
