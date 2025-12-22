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

import { useEffect, useState } from "react";
import { useMsal, useIsAuthenticated } from "@azure/msal-react";
import { useLocation } from "wouter";
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
  const { instance, inProgress } = useMsal();
  const isAuthenticated = useIsAuthenticated();
  const [, setLocation] = useLocation();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Redirect to dashboard if already authenticated
  useEffect(() => {
    if (isAuthenticated && inProgress === "none") {
      console.log("[Login] User authenticated - redirecting to dashboard");
      setLocation("/");
    }
  }, [isAuthenticated, inProgress, setLocation]);

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
      <div className="w-full max-w-md">
        {/* Logo and Title */}
        <div className="text-center mb-8 space-y-2">
          <div className="flex items-center justify-center mb-4">
            <div className="relative">
              <div className="absolute inset-0 bg-[#0078D4]/30 rounded-2xl blur-lg" />
              <div className="relative bg-[#0078D4] p-3 rounded-2xl shadow-lg">
                <Activity className="h-10 w-10 text-white" />
              </div>
            </div>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            HealthMesh
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Intelligent Healthcare Management Platform
          </p>
        </div>

        {/* Login Card */}
        <Card className="shadow-xl border-slate-200 dark:border-slate-800">
          <CardHeader className="space-y-1 text-center">
            <CardTitle className="text-2xl font-bold">Sign In</CardTitle>
            <CardDescription>
              Sign in with your organization's Microsoft account
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Error Alert */}
            {error && (
              <Alert
                variant="destructive"
                className="animate-in fade-in-50 duration-300"
              >
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Microsoft Login Button */}
            <div className="space-y-4">
              <Button
                onClick={handleMicrosoftLogin}
                disabled={isLoading || inProgress !== "none"}
                className="w-full bg-[#0078D4] hover:bg-[#106EBE] text-white font-medium py-6 transition-all duration-200 shadow-md hover:shadow-lg"
                size="lg"
              >
                {isLoading || inProgress !== "none" ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  <>
                    <svg className="mr-2 h-5 w-5" viewBox="0 0 23 23" fill="none">
                      <path d="M11 0H0v11h11V0z" fill="#F25022" />
                      <path d="M23 0H12v11h11V0z" fill="#7FBA00" />
                      <path d="M11 12H0v11h11V12z" fill="#00A4EF" />
                      <path d="M23 12H12v11h11V12z" fill="#FFB900" />
                    </svg>
                    Sign in with Microsoft
                  </>
                )}
              </Button>

              {/* Popup fallback button */}
              <button
                onClick={handleMicrosoftLoginPopup}
                disabled={isLoading || inProgress !== "none"}
                className="w-full text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
              >
                Having trouble? Try popup sign-in
              </button>
            </div>

            {/* Enterprise Features */}
            <div className="space-y-3 pt-4 border-t border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-400">
                <Building2 className="h-4 w-4 text-[#0078D4] flex-shrink-0" />
                <span>Enterprise Single Sign-On (SSO)</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-400">
                <Lock className="h-4 w-4 text-[#0078D4] flex-shrink-0" />
                <span>Multi-Factor Authentication (MFA)</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-400">
                <CheckCircle2 className="h-4 w-4 text-[#0078D4] flex-shrink-0" />
                <span>HIPAA-Compliant Authentication</span>
              </div>
            </div>

            {/* Security Notice */}
            <div className="space-y-2 text-center pt-4 border-t border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-center gap-2 text-amber-600 dark:text-amber-500">
                <Shield className="h-4 w-4" />
                <p className="text-xs font-semibold">Authorized Users Only</p>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                This system contains confidential patient health information
                protected under HIPAA. Unauthorized access is prohibited.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="mt-6 text-center text-xs text-slate-500 dark:text-slate-400 space-y-1">
          <p>Protected by Microsoft Entra ID</p>
          <p className="text-[10px]">Enterprise-grade security & compliance</p>
        </div>
      </div>
    </AuthLayout>
  );
}
