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
 * 🔥 ELITE VIBE-CODED: Premium animations, glowing CTAs, human warmth
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
  AlertCircle,
  Building2,
  Lock,
  CheckCircle2,
  HeartPulse,
  Stethoscope,
  Users,
} from "lucide-react";
import { AuthLayout } from "@/layouts/AuthLayout";
import { SEO, pageSEO } from "@/components/seo";

export default function Login() {
  const { instance, inProgress, accounts } = useMsal();
  const isAuthenticated = useIsAuthenticated();
  const [, setLocation] = useLocation();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const hasRedirected = useRef(false);

  const isRedirectCallback = window.location.hash.includes("code=") ||
    window.location.hash.includes("id_token=") ||
    window.location.search.includes("code=");

  useEffect(() => {
    console.log("[Login] Auth state - isAuthenticated:", isAuthenticated, "inProgress:", inProgress, "accounts:", accounts.length);
  }, [isAuthenticated, inProgress, accounts]);

  useEffect(() => {
    if (inProgress === InteractionStatus.None && !hasRedirected.current) {
      if (isAuthenticated && accounts.length > 0) {
        console.log("[Login] User authenticated - redirecting to dashboard");
        hasRedirected.current = true;
        setTimeout(() => {
          setLocation("/dashboard");
        }, 100);
      }
    }
  }, [isAuthenticated, inProgress, accounts, instance, setLocation]);

  if (inProgress !== "none" && inProgress !== "login") {
    return (
      <AuthLayout>
        <div className="w-full max-w-md animate-fadeIn">
          <div className="text-center space-y-6">
            <div className="relative mx-auto w-fit">
              <div className="absolute inset-0 bg-primary/40 rounded-full blur-2xl animate-pulse" />
              <div className="relative bg-card border border-border/50 p-5 rounded-2xl shadow-xl">
                <HeartPulse className="h-14 w-14 text-primary" />
              </div>
            </div>
            <div className="space-y-3">
              <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto" />
              <p className="text-lg font-medium text-foreground">
                Completing sign-in...
              </p>
              <p className="text-sm text-warm-muted">
                Processing Microsoft authentication
              </p>
            </div>
          </div>
        </div>
      </AuthLayout>
    );
  }

  const handleMicrosoftLogin = async () => {
    if (!isEntraConfigured()) {
      setError("Microsoft Entra ID is not configured. Please contact your administrator.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await instance.loginRedirect(loginRequest);
    } catch (err: any) {
      console.error("[Login] Microsoft login error:", err);

      if (err.errorCode === "user_cancelled") {
        setError("Sign-in was cancelled. Please try again.");
      } else if (err.errorCode === "popup_window_error") {
        try {
          await instance.loginRedirect(loginRequest);
          return;
        } catch (redirectErr) {
          setError("Unable to open sign-in window. Please allow popups.");
        }
      } else {
        setError(err.errorMessage || err.message || "Unable to sign in with Microsoft. Please try again.");
      }
      setIsLoading(false);
    }
  };

  const handleMicrosoftLoginPopup = async () => {
    if (!isEntraConfigured()) {
      setError("Microsoft Entra ID is not configured. Please contact your administrator.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await instance.loginPopup(loginRequest);
    } catch (err: any) {
      console.error("[Login] Microsoft popup login error:", err);

      if (err.errorCode === "user_cancelled") {
        setError("Sign-in was cancelled. Please try again.");
      } else {
        setError(err.errorMessage || err.message || "Unable to sign in with Microsoft.");
      }
      setIsLoading(false);
    }
  };

  const features = [
    { icon: Building2, text: "Enterprise Single Sign-On (SSO)" },
    { icon: Lock, text: "Multi-Factor Authentication (MFA)" },
    { icon: CheckCircle2, text: "HIPAA-Compliant Authentication" },
  ];

  return (
    <AuthLayout>
      <SEO {...pageSEO.login} />
      <div className="w-full max-w-md">
        {/* Logo and Title - with staggered animation */}
        <div className="text-center mb-8 space-y-3 opacity-0 animate-slideUp" style={{ animationFillMode: 'forwards' }}>
          <div className="flex items-center justify-center mb-6">
            <div className="relative group">
              {/* Multi-layer glow */}
              <div className="absolute inset-0 bg-primary/50 rounded-2xl blur-2xl transition-all duration-500 group-hover:blur-3xl" />
              <div className="absolute inset-0 bg-teal-500/30 rounded-2xl blur-xl animate-pulse" style={{ animationDuration: '3s' }} />
              <div className="relative bg-gradient-to-br from-primary to-sky-400 p-4 rounded-2xl shadow-xl transition-transform duration-300 group-hover:scale-105">
                <HeartPulse className="h-12 w-12 text-white" />
              </div>
            </div>
          </div>
          <h1 className="text-4xl font-bold tracking-tight">
            HealthMesh
          </h1>
          <p className="text-warm-muted flex items-center justify-center gap-2">
            <Stethoscope className="h-4 w-4 text-primary" />
            Intelligent Healthcare Platform
          </p>
        </div>

        {/* Login Card */}
        <Card className="shadow-2xl border-border/50 bg-card/90 backdrop-blur-xl opacity-0 animate-slideUp stagger-2" style={{ animationFillMode: 'forwards' }}>
          <CardHeader className="space-y-2 text-center pb-4">
            <CardTitle className="text-2xl font-bold">Welcome Back</CardTitle>
            <CardDescription className="text-warm-muted">
              Sign in with your organization's Microsoft account
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Error Alert */}
            {error && (
              <Alert variant="destructive" className="animate-scaleIn border-rose-500/30 bg-rose-500/10">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* 🔥 COMMANDING Microsoft Login Button */}
            <div className="space-y-4">
              <Button
                onClick={handleMicrosoftLogin}
                disabled={isLoading || inProgress !== "none"}
                className="w-full bg-[#0078D4] hover:bg-[#106EBE] text-white font-semibold py-6 glow-cta rounded-xl"
                size="lg"
                style={{
                  boxShadow: '0 0 0 1px rgba(0, 120, 212, 0.3), 0 4px 20px rgba(0, 120, 212, 0.35), 0 8px 40px rgba(0, 120, 212, 0.2)'
                }}
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

              <button
                onClick={handleMicrosoftLoginPopup}
                disabled={isLoading || inProgress !== "none"}
                className="w-full text-xs text-warm-muted hover:text-primary transition-colors duration-200"
              >
                Having trouble? Try popup sign-in
              </button>
            </div>

            {/* Enterprise Features with micro-animations */}
            <div className="space-y-2 pt-4 border-t border-border/50">
              {features.map((feature, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 text-sm text-warm p-2.5 rounded-xl hover:bg-muted/30 transition-all duration-200 group/feature opacity-0 animate-slideIn"
                  style={{ animationDelay: `${(index + 3) * 100}ms`, animationFillMode: 'forwards' }}
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 border border-primary/20 transition-all duration-200 group-hover/feature:scale-110 group-hover/feature:bg-primary/20">
                    <feature.icon className="h-4 w-4 text-primary" />
                  </div>
                  <span>{feature.text}</span>
                </div>
              ))}
            </div>

            {/* Human warmth - Security Notice */}
            <div className="space-y-2 text-center pt-4 border-t border-border/50">
              <div className="flex items-center justify-center gap-2 text-amber-400">
                <Shield className="h-4 w-4" />
                <p className="text-xs font-semibold">Authorized Personnel Only</p>
              </div>
              <p className="text-xs text-warm-muted leading-relaxed">
                This system contains confidential patient information protected under HIPAA.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Footer with human touch */}
        <div className="mt-8 text-center text-xs text-warm-muted space-y-2 opacity-0 animate-fadeIn stagger-4" style={{ animationFillMode: 'forwards' }}>
          <div className="flex items-center justify-center gap-4">
            <span className="flex items-center gap-1.5">
              <Shield className="h-3 w-3 text-primary" />
              Protected by Microsoft Entra ID
            </span>
          </div>
          <p className="flex items-center justify-center gap-1.5 text-[10px]">
            <Users className="h-3 w-3" />
            Caring for patients with intelligent support
          </p>
        </div>
      </div>
    </AuthLayout>
  );
}
