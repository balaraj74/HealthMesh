/**
 * Login Page Component
 * 
 * ENTERPRISE-GRADE: Microsoft Entra ID is the ONLY authentication method
 * 
 * ❌ NO email/password
 * ❌ NO local authentication
 * ❌ NO signup form
 * ✅ Microsoft Entra ID ONLY
 * 
 * This page provides a clean, enterprise-grade login experience
 * using Microsoft Entra ID (Azure AD) for authentication.
 */

import { useEffect, useState, useRef } from "react";
import { useMsal, useIsAuthenticated } from "@azure/msal-react";
import { useLocation } from "wouter";
import { InteractionStatus } from "@azure/msal-browser";
import { loginRequest, isEntraConfigured } from "../auth/authConfig";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Loader2,
  Shield,
  Activity,
  AlertCircle,
  Building2,
  Lock,
  CheckCircle2,
} from "lucide-react";
import { AuthLayout } from "@/layouts/AuthLayout";

export default function Login() {
  const { instance, inProgress, accounts } = useMsal();
  const isAuthenticated = useIsAuthenticated();
  const [, setLocation] = useLocation();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessingCallback, setIsProcessingCallback] = useState(false);
  const hasRedirected = useRef(false);

  // Check if this is a redirect callback from Microsoft
  const isRedirectCallback = window.location.hash.includes("code=") ||
    window.location.hash.includes("id_token=") ||
    window.location.search.includes("code=");

  // Debug logging
  useEffect(() => {
    console.log("[Login] Auth state - isAuthenticated:", isAuthenticated, "inProgress:", inProgress, "accounts:", accounts.length);
    console.log("[Login] Current URL:", window.location.href);
    console.log("[Login] Is redirect callback:", isRedirectCallback);
    console.log("[Login] Active account:", instance.getActiveAccount()?.username);
  }, [isAuthenticated, inProgress, accounts, isRedirectCallback, instance]);

  // Handle redirect callback
  useEffect(() => {
    if (isRedirectCallback && inProgress === InteractionStatus.HandleRedirect) {
      setIsProcessingCallback(true);
      console.log("[Login] Processing redirect callback...");
    }
  }, [isRedirectCallback, inProgress]);

  // Redirect to dashboard if already authenticated
  useEffect(() => {
    // Only redirect when MSAL is completely done processing
    if (inProgress === InteractionStatus.None && !hasRedirected.current) {
      if (isAuthenticated && accounts.length > 0) {
        console.log("[Login] User authenticated - redirecting to dashboard");
        console.log("[Login] Active account:", instance.getActiveAccount()?.username);
        hasRedirected.current = true;
        // Use setLocation for SPA navigation (no full page reload)
        // Adding a small delay to ensure MSAL state is fully propagated
        setTimeout(() => {
          setLocation("/");
        }, 100);
      }
    }
  }, [isAuthenticated, inProgress, accounts, instance, setLocation]);

  // Show loading while MSAL is handling redirect
  // inProgress can be: "none", "handleRedirect", "login", "logout", etc.
  if (inProgress !== "none" && inProgress !== "login") {
    console.log("[Login] MSAL operation in progress:", inProgress);
    return (
      <AuthLayout>
        <div className="w-full max-w-md animate-fade-in">
          <div className="text-center space-y-6">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 rounded-full blur-2xl animate-pulse" />
              <div className="relative bg-card/50 backdrop-blur-md p-6 rounded-full shadow-2xl mx-auto w-fit border border-white/10">
                <Shield className="h-12 w-12 text-primary" />
              </div>
            </div>
            <div className="space-y-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
              <div className="space-y-1">
                <p className="text-lg font-medium tracking-tight text-foreground">
                  Authenticating securely...
                </p>
                <p className="text-sm text-muted-foreground">
                  Verifying credentials with Microsoft Entra ID
                </p>
              </div>
            </div>
          </div>
        </div>
      </AuthLayout>
    );
  }

  // Handle Microsoft login via redirect
  const handleMicrosoftLogin = async () => {
    if (!isEntraConfigured()) {
      setError(
        "Microsoft Entra ID is not configured. Please contact your administrator."
      );
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Use redirect flow for enterprise environments
      await instance.loginRedirect(loginRequest);
    } catch (err: any) {
      console.error("[Login] Microsoft login error:", err);

      if (err.errorCode === "user_cancelled") {
        setError("Sign-in was cancelled. Please try again.");
      } else if (err.errorCode === "popup_window_error") {
        // Try redirect if popup is blocked
        try {
          await instance.loginRedirect(loginRequest);
          return;
        } catch (redirectErr) {
          setError("Unable to open sign-in window. Please allow popups.");
        }
      } else {
        setError(
          err.errorMessage ||
          err.message ||
          "Unable to sign in with Microsoft. Please try again."
        );
      }
      setIsLoading(false);
    }
  };

  // Handle Microsoft login via popup (fallback)
  const handleMicrosoftLoginPopup = async () => {
    if (!isEntraConfigured()) {
      setError(
        "Microsoft Entra ID is not configured. Please contact your administrator."
      );
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await instance.loginPopup(loginRequest);
      // Successful login - will redirect via useEffect
    } catch (err: any) {
      console.error("[Login] Microsoft popup login error:", err);

      if (err.errorCode === "user_cancelled") {
        setError("Sign-in was cancelled. Please try again.");
      } else {
        setError(
          err.errorMessage || err.message || "Unable to sign in with Microsoft."
        );
      }
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout>
      <div className="w-full max-w-md animate-scale-in">
        {/* Logo and Title */}
        <div className="text-center mb-8 space-y-3">
          <div className="flex items-center justify-center mb-6">
            <div className="relative group">
              <div className="absolute inset-0 bg-primary/40 rounded-3xl blur-xl group-hover:blur-2xl transition-all duration-500" />
              <div className="relative bg-gradient-to-br from-primary to-blue-600 p-4 rounded-2xl shadow-xl border border-white/20">
                <Activity className="h-10 w-10 text-white" />
              </div>
            </div>
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-foreground bg-clip-text text-transparent bg-gradient-to-b from-foreground to-foreground/70">
            HealthMesh
          </h1>
          <p className="text-muted-foreground text-lg">
            Intelligent Healthcare Management
          </p>
        </div>

        {/* Login Card */}
        <Card className="shadow-2xl border-white/10 bg-card/70 backdrop-blur-xl overflow-hidden relative group">
          {/* Subtle sheen effect */}
          <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent pointer-events-none" />

          <CardHeader className="space-y-1 text-center pb-8 pt-8">
            <CardTitle className="text-2xl font-bold tracking-tight">Welcome Back</CardTitle>
            <CardDescription className="text-base">
              Secure access for authorized personnel
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6 px-8 pb-8">
            {/* Error Alert */}
            {error && (
              <Alert
                variant="destructive"
                className="animate-in fade-in-50 duration-300 border-destructive/50 bg-destructive/10"
              >
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="font-medium">{error}</AlertDescription>
              </Alert>
            )}

            {/* Microsoft Login Button */}
            <div className="space-y-4">
              <Button
                onClick={handleMicrosoftLogin}
                disabled={isLoading || inProgress !== "none"}
                className="w-full bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-medium h-14 text-base transition-all duration-300 shadow-lg hover:shadow-primary/25 rounded-xl border border-white/10 relative overflow-hidden group/btn"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover/btn:translate-x-[100%] transition-transform duration-1000" />

                {isLoading || inProgress !== "none" ? (
                  <>
                    <Loader2 className="mr-3 h-5 w-5 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <svg className="mr-3 h-5 w-5" viewBox="0 0 23 23" fill="none">
                      <path d="M11 0H0v11h11V0z" fill="#F25022" />
                      <path d="M23 0H12v11h11V0z" fill="#7FBA00" />
                      <path d="M11 12H0v11h11V12z" fill="#00A4EF" />
                      <path d="M23 12H12v11h11V12z" fill="#FFB900" />
                    </svg>
                    Continue with Microsoft
                  </>
                )}
              </Button>

              {/* Popup fallback button */}
              <button
                onClick={handleMicrosoftLoginPopup}
                disabled={isLoading || inProgress !== "none"}
                className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors py-2"
              >
                Having trouble? Try popup window
              </button>
            </div>

            {/* Enterprise Features */}
            <div className="space-y-3 pt-6 border-t border-border/50">
              <div className="flex items-center gap-3 text-sm text-muted-foreground group/item hover:text-foreground transition-colors">
                <div className="p-1.5 rounded-full bg-primary/10 text-primary">
                  <Building2 className="h-3.5 w-3.5" />
                </div>
                <span>Enterprise Single Sign-On</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-muted-foreground group/item hover:text-foreground transition-colors">
                <div className="p-1.5 rounded-full bg-primary/10 text-primary">
                  <Lock className="h-3.5 w-3.5" />
                </div>
                <span>Multi-Factor Authentication</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-muted-foreground group/item hover:text-foreground transition-colors">
                <div className="p-1.5 rounded-full bg-primary/10 text-primary">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                </div>
                <span>HIPAA-Compliant Security</span>
              </div>
            </div>

            {/* Security Notice */}
            <div className="space-y-3 text-center pt-6 border-t border-border/50">
              <div className="flex items-center justify-center gap-2 text-amber-500/90 bg-amber-500/10 py-1.5 px-3 rounded-full w-fit mx-auto border border-amber-500/20">
                <Shield className="h-3.5 w-3.5" />
                <p className="text-[11px] font-semibold uppercase tracking-wider">Authorized Use Only</p>
              </div>
              <p className="text-[11px] text-muted-foreground/80 leading-relaxed max-w-[280px] mx-auto">
                Confidential patient health information. <br />
                Unauthorized access is traceable and prohibited.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="mt-8 text-center space-y-2 animate-fade-in delay-100">
          <p className="text-xs font-medium text-muted-foreground">Protected by Microsoft Entra ID</p>
          <div className="flex justify-center gap-2">
            <div className="h-1 w-1 rounded-full bg-primary/40" />
            <div className="h-1 w-1 rounded-full bg-primary/40" />
            <div className="h-1 w-1 rounded-full bg-primary/40" />
          </div>
        </div>
      </div>
    </AuthLayout>
  );
}
