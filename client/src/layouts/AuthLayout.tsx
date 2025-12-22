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
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-blue-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      {/* Theme toggle in top right */}
      <div className="absolute top-4 right-4 z-50">
        <ThemeToggle />
      </div>
      
      {/* Main content - centered */}
      <div className="flex-1 flex items-center justify-center p-4">
        {children}
      </div>
      
      {/* Footer */}
      <footer className="py-6 text-center text-sm text-slate-600 dark:text-slate-400">
        <p>HealthMesh © 2025 | Decision Support Only</p>
        <p className="mt-1 text-xs">
          This system is intended for use by authorized healthcare professionals only
        </p>
      </footer>
    </div>
  );
}
