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
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-background via-background to-primary/5 relative overflow-hidden">
      {/* Animated background effects - Blue theme */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-40 w-80 h-80 bg-primary/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 -right-40 w-80 h-80 bg-accent/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl" />
        {/* Additional subtle grid pattern effect */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(56,189,248,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(56,189,248,0.03)_1px,transparent_1px)] bg-[size:50px_50px]" />
      </div>

      {/* Theme toggle in top right */}
      <div className="absolute top-4 right-4 z-50">
        <ThemeToggle />
      </div>

      {/* Main content - centered */}
      <div className="flex-1 flex items-center justify-center p-4 relative z-10">
        {children}
      </div>

      {/* Footer */}
      <footer className="py-6 text-center text-sm text-muted-foreground relative z-10">
        <p className="font-medium">HealthMesh © 2025 | Decision Support Only</p>
        <p className="mt-1 text-xs">
          This system is intended for use by authorized healthcare professionals only
        </p>
      </footer>
    </div>
  );
}
