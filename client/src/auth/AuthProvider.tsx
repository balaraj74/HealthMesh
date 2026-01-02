/**
 * Authentication Provider Component
 * 
 * Wraps the application with Microsoft Authentication Library (MSAL) provider.
 * Handles authentication state, token management, and user context.
 * 
 * Features:
 * - Automatic token refresh
 * - Silent authentication
 * - Account persistence
 * - Error handling
 * - Proper initialization waiting
 */

import React, { useState, useEffect } from "react";
import { MsalProvider } from "@azure/msal-react";
import { PublicClientApplication, EventType, EventMessage, AuthenticationResult } from "@azure/msal-browser";
import { msalConfig } from "./authConfig";
import { Loader2, Shield } from "lucide-react";

// Create MSAL instance
const msalInstance = new PublicClientApplication(msalConfig);

// Track initialization state
let msalInitialized = false;
let msalInitializationPromise: Promise<void> | null = null;

// Initialize MSAL instance
const initializeMsal = async (): Promise<void> => {
  if (msalInitialized) return;

  if (msalInitializationPromise) {
    return msalInitializationPromise;
  }

  msalInitializationPromise = (async () => {
    try {
      console.log("[MSAL] Starting initialization...");
      console.log("[MSAL] Current URL:", window.location.href);
      console.log("[MSAL] URL hash present:", !!window.location.hash);

      await msalInstance.initialize();
      console.log("[MSAL] Instance initialized, calling handleRedirectPromise...");

      // Handle redirect response after login
      const response = await msalInstance.handleRedirectPromise();
      console.log("[MSAL] handleRedirectPromise result:", response ? "Got response" : "No response (null)");

      if (response) {
        // Set the active account after successful redirect
        msalInstance.setActiveAccount(response.account);
        console.log("[MSAL] Login redirect completed, account set:", response.account?.username);
        console.log("[MSAL] Token type:", response.tokenType);

        // Clear the URL hash/query params to prevent re-processing on refresh
        if (window.location.hash || window.location.search.includes("code=")) {
          console.log("[MSAL] Clearing authentication params from URL");
          // Navigate to root/dashboard after successful login
          window.history.replaceState({}, document.title, "/");
          console.log("[MSAL] Navigated to dashboard after login");
        }
      } else {
        // Account selection logic for existing sessions
        const accounts = msalInstance.getAllAccounts();
        console.log("[MSAL] No redirect response. Existing accounts:", accounts.length);
        if (accounts.length > 0) {
          msalInstance.setActiveAccount(accounts[0]);
          console.log("[MSAL] Existing account found and set:", accounts[0].username);
        } else {
          console.log("[MSAL] No accounts found - user is not authenticated");
        }
      }

      // Listen for sign-in event and set active account
      msalInstance.addEventCallback((event: EventMessage) => {
        if (event.eventType === EventType.LOGIN_SUCCESS && event.payload) {
          const payload = event.payload as AuthenticationResult;
          const account = payload.account;
          msalInstance.setActiveAccount(account);
          console.log("[MSAL] Login success event, account set");
        }
      });

      msalInitialized = true;
      console.log("[MSAL] Initialization complete");
    } catch (error) {
      console.error("[MSAL] Initialization failed:", error);
      msalInitialized = true; // Mark as initialized even on error to prevent infinite loading
      throw error;
    }
  })();

  return msalInitializationPromise;
};

/**
 * AuthProvider Component
 * 
 * Provides authentication context to the entire application.
 * Must wrap the root component for authentication to work.
 * Waits for MSAL to initialize before rendering children.
 */
interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [isReady, setIsReady] = useState(msalInitialized);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (msalInitialized) {
      setIsReady(true);
      return;
    }

    initializeMsal()
      .then(() => {
        setIsReady(true);
      })
      .catch((err) => {
        console.error("[AuthProvider] MSAL init error:", err);
        setError(err?.message || "Authentication system failed to initialize");
        setIsReady(true); // Show children anyway so app is usable
      });
  }, []);

  // Show loading state while MSAL initializes
  if (!isReady) {
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
              Initializing HealthMesh...
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-500">
              Setting up secure authentication
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Show error state if MSAL failed to initialize
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-6">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 shadow-xl rounded-xl overflow-hidden border border-red-200 dark:border-red-900">
          <div className="bg-red-50 dark:bg-red-900/20 p-6 flex flex-col items-center text-center">
            <div className="bg-red-100 dark:bg-red-800 p-3 rounded-full mb-4">
              <Shield className="h-8 w-8 text-red-600 dark:text-red-400" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">
              Authentication Error
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
              We couldn't initialize the security system. This usually happens due to network issues or configuration errors.
            </p>
            <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded text-xs font-mono text-slate-700 dark:text-slate-300 w-full overflow-auto mb-6">
              {error}
            </div>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-lg hover:opacity-90 transition-opacity font-medium text-sm"
            >
              Reload Application
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <MsalProvider instance={msalInstance}>{children}</MsalProvider>;
};

/**
 * Export MSAL instance for use in other parts of the application
 * Use this to manually trigger login/logout or acquire tokens
 */
export { msalInstance };
