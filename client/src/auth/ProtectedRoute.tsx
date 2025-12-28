/**
 * Protected Route Component
 * 
 * ENTERPRISE-GRADE: Microsoft Entra ID is the ONLY authentication method
 * 
 * Wrapper component that protects routes requiring authentication.
 * Redirects unauthenticated users to the login page.
 * 
 * ❌ NO dev bypass
 * ❌ NO local JWT tokens
 * ❌ NO fallback authentication
 * ✅ Microsoft Entra ID (MSAL) ONLY
 * 
 * Usage:
 * <ProtectedRoute>
 *   <YourComponent />
 * </ProtectedRoute>
 */

import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useIsAuthenticated, useMsal } from "@azure/msal-react";
import { InteractionStatus } from "@azure/msal-browser";
import { Loader2, Shield } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: string; // Optional: require specific role from Entra ID
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredRole,
}) => {
  const isAuthenticated = useIsAuthenticated();
  const { inProgress, accounts, instance } = useMsal();
  const [, setLocation] = useLocation();
  const [isInitializing, setIsInitializing] = useState(true);
  const [hasWaited, setHasWaited] = useState(false);

  // Give MSAL time to restore session from cache
  useEffect(() => {
    const timer = setTimeout(() => {
      setHasWaited(true);
    }, 500); // Wait 500ms for MSAL to restore session
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    // Wait for MSAL to finish any in-progress operations AND for the wait timer
    if (inProgress === InteractionStatus.None && hasWaited) {
      setIsInitializing(false);

      // Check both isAuthenticated hook and direct account check
      const hasAccounts = accounts.length > 0 || instance.getAllAccounts().length > 0;

      console.log("[ProtectedRoute] Auth check - isAuthenticated:", isAuthenticated, "accounts:", accounts.length, "hasAccounts:", hasAccounts);

      // Redirect to login if not authenticated via Microsoft Entra ID
      if (!isAuthenticated && !hasAccounts) {
        console.log("[ProtectedRoute] User not authenticated - redirecting to login");
        setLocation("/login");
      }
    }
  }, [isAuthenticated, inProgress, setLocation, hasWaited, accounts, instance]);

  // Show loading state while MSAL is initializing
  if (isInitializing || inProgress !== InteractionStatus.None) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="text-center space-y-4">
          <div className="relative">
            <div className="absolute inset-0 bg-[#0078D4]/20 rounded-full blur-xl animate-pulse" />
            <div className="relative bg-white dark:bg-slate-900 p-4 rounded-full shadow-lg">
              <Shield className="h-12 w-12 text-[#0078D4]" />
            </div>
          </div>
          <div className="space-y-2">
            <Loader2 className="h-6 w-6 animate-spin text-[#0078D4] mx-auto" />
            <p className="text-slate-600 dark:text-slate-400 font-medium">
              Verifying authentication...
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-500">
              Validating Microsoft Entra ID credentials
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Check if user has accounts (from cache or fresh login)
  const hasAccounts = accounts.length > 0;

  // Not authenticated - will redirect
  if (!isAuthenticated && !hasAccounts) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="text-center space-y-4">
          <Shield className="h-12 w-12 text-amber-500 mx-auto" />
          <p className="text-slate-600 dark:text-slate-400">
            Redirecting to Microsoft sign-in...
          </p>
        </div>
      </div>
    );
  }

  // Optional: Check for required role
  if (requiredRole && accounts.length > 0) {
    const account = accounts[0];
    const roles = (account.idTokenClaims as any)?.roles || [];

    if (!roles.includes(requiredRole)) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
          <div className="text-center space-y-4 max-w-md mx-auto p-6">
            <Shield className="h-12 w-12 text-red-500 mx-auto" />
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
              Access Denied
            </h2>
            <p className="text-slate-600 dark:text-slate-400">
              You don't have the required permissions to access this page.
              Please contact your administrator.
            </p>
            <p className="text-xs text-slate-500">
              Required role: {requiredRole}
            </p>
          </div>
        </div>
      );
    }
  }

  // Authenticated - render protected content
  return <>{children}</>;
};
