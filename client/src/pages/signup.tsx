/**
 * Signup Page - REDIRECTS TO MICROSOFT ENTRA ID
 * 
 * ENTERPRISE-GRADE: User signup is handled via Microsoft Entra ID
 * 
 * This page informs users that:
 * - Local signup is not available
 * - They must be provisioned in Microsoft Entra ID by their organization
 * - They should contact their IT administrator for access
 * 
 * ❌ NO local signup
 * ❌ NO email/password registration
 * ✅ Microsoft Entra ID provisioning ONLY
 */

import { useEffect } from "react";
import { useLocation } from "wouter";
import { useMsal, useIsAuthenticated } from "@azure/msal-react";
import { loginRequest } from "../auth/authConfig";
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
  Shield,
  Activity,
  Info,
  Building2,
  UserPlus,
  ArrowLeft,
} from "lucide-react";
import { AuthLayout } from "@/layouts/AuthLayout";

export default function Signup() {
  const { instance } = useMsal();
  const isAuthenticated = useIsAuthenticated();
  const [, setLocation] = useLocation();

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      setLocation("/dashboard");
    }
  }, [isAuthenticated, setLocation]);

  const handleMicrosoftLogin = async () => {
    try {
      await instance.loginRedirect(loginRequest);
    } catch (err) {
      console.error("Login error:", err);
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
            Enterprise Healthcare Platform
          </p>
        </div>

        {/* Information Card */}
        <Card className="shadow-xl border-slate-200 dark:border-slate-800">
          <CardHeader className="space-y-1 text-center">
            <div className="flex justify-center mb-2">
              <div className="bg-amber-100 dark:bg-amber-900/30 p-3 rounded-full">
                <UserPlus className="h-8 w-8 text-amber-600 dark:text-amber-500" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold">
              Request Access
            </CardTitle>
            <CardDescription>
              HealthMesh uses enterprise identity management
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Information Alert */}
            <Alert className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
              <Info className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800 dark:text-blue-200">
                Self-registration is not available. Users must be provisioned by
                their organization's IT administrator.
              </AlertDescription>
            </Alert>

            {/* Instructions */}
            <div className="space-y-4">
              <h3 className="font-semibold text-slate-900 dark:text-white">
                How to Get Access
              </h3>

              <div className="space-y-3">
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-[#0078D4] text-white flex items-center justify-center text-sm font-medium">
                    1
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Contact your organization's IT administrator or helpdesk
                  </p>
                </div>

                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-[#0078D4] text-white flex items-center justify-center text-sm font-medium">
                    2
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Request access to HealthMesh via your Microsoft Entra ID account
                  </p>
                </div>

                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-[#0078D4] text-white flex items-center justify-center text-sm font-medium">
                    3
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Once provisioned, sign in with your Microsoft account
                  </p>
                </div>
              </div>
            </div>

            {/* Enterprise Benefits */}
            <div className="space-y-3 pt-4 border-t border-slate-200 dark:border-slate-700">
              <h4 className="text-sm font-medium text-slate-900 dark:text-white">
                Enterprise Benefits
              </h4>
              <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-400">
                <Building2 className="h-4 w-4 text-[#0078D4] flex-shrink-0" />
                <span>Centralized identity management</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-400">
                <Shield className="h-4 w-4 text-[#0078D4] flex-shrink-0" />
                <span>Enterprise-grade security compliance</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3 pt-4">
              <Button
                onClick={handleMicrosoftLogin}
                className="w-full bg-[#0078D4] hover:bg-[#106EBE] text-white font-medium py-6"
                size="lg"
              >
                <svg className="mr-2 h-5 w-5" viewBox="0 0 23 23" fill="none">
                  <path d="M11 0H0v11h11V0z" fill="#F25022" />
                  <path d="M23 0H12v11h11V0z" fill="#7FBA00" />
                  <path d="M11 12H0v11h11V12z" fill="#00A4EF" />
                  <path d="M23 12H12v11h11V12z" fill="#FFB900" />
                </svg>
                Already have access? Sign in
              </Button>

              <Button
                variant="ghost"
                onClick={() => setLocation("/login")}
                className="w-full"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Sign In
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="mt-6 text-center text-xs text-slate-500 dark:text-slate-400">
          <p>Secured by Microsoft Entra ID</p>
        </div>
      </div>
    </AuthLayout>
  );
}
