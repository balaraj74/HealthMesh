import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { TopHeader } from "@/components/top-header";
import { AuthProvider } from "@/auth/AuthProvider";
import { ProtectedRoute } from "@/auth/ProtectedRoute";
import { lazy, Suspense } from "react";

// ============================================================================
// LAZY LOADED PAGES - Code splitting for better performance
// Only the landing page is loaded immediately, all other pages load on demand
// ============================================================================

// Landing page - loaded immediately for fast initial load
import LandingPage from "@/pages/landing";

// Auth pages - lazy loaded
const Login = lazy(() => import("@/pages/login"));
const Signup = lazy(() => import("@/pages/signup"));
const NotFound = lazy(() => import("@/pages/not-found"));

// Marketing pages - lazy loaded
const SolutionsPage = lazy(() => import("@/pages/solutions"));
const PricingPage = lazy(() => import("@/pages/pricing"));
const AboutPage = lazy(() => import("@/pages/about"));
const BlogPage = lazy(() => import("@/pages/blog"));
const BlogPostPage = lazy(() => import("@/pages/blog-post"));
const ContactPage = lazy(() => import("@/pages/contact"));
const PrivacyPolicy = lazy(() => import("@/pages/privacy"));
const TermsOfService = lazy(() => import("@/pages/terms"));

// Protected dashboard pages - lazy loaded
const Dashboard = lazy(() => import("@/pages/dashboard"));
const Cases = lazy(() => import("@/pages/cases"));
const CaseNew = lazy(() => import("@/pages/case-new"));
const CaseDetail = lazy(() => import("@/pages/case-detail"));
const Patients = lazy(() => import("@/pages/patients"));
const PatientNew = lazy(() => import("@/pages/patient-new"));
const PatientDetail = lazy(() => import("@/pages/patient-detail"));
const Labs = lazy(() => import("@/pages/labs"));
const Orchestrator = lazy(() => import("@/pages/orchestrator"));
const RiskSafety = lazy(() => import("@/pages/risk-safety"));
const Chat = lazy(() => import("@/pages/chat"));
const AuditLogs = lazy(() => import("@/pages/audit"));
const Settings = lazy(() => import("@/pages/settings"));
const QRScan = lazy(() => import("@/pages/qr-scan"));
const EarlyDeterioration = lazy(() => import("@/pages/early-deterioration"));
const MedicationSafety = lazy(() => import("@/pages/medication-safety"));
const LabTrends = lazy(() => import("@/pages/lab-trends"));

// Loading fallback for lazy loaded components
function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="flex flex-col items-center gap-4">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <span className="text-sm text-muted-foreground">Loading...</span>
      </div>
    </div>
  );
}

function Router() {
  return (
    <Switch>
      {/* Public routes - Marketing and Auth pages (no sidebar) */}
      <Route path="/" component={LandingPage} />
      <Route path="/solutions" component={SolutionsPage} />
      <Route path="/pricing" component={PricingPage} />
      <Route path="/about" component={AboutPage} />
      <Route path="/blog" component={BlogPage} />
      <Route path="/blog/:slug" component={BlogPostPage} />
      <Route path="/contact" component={ContactPage} />
      <Route path="/privacy" component={PrivacyPolicy} />
      <Route path="/terms" component={TermsOfService} />
      <Route path="/login" component={Login} />
      <Route path="/signup" component={Signup} />

      {/* Protected routes - Require authentication */}
      <Route path="/dashboard">
        <ProtectedRoute>
          <Dashboard />
        </ProtectedRoute>
      </Route>
      <Route path="/cases">
        <ProtectedRoute>
          <Cases />
        </ProtectedRoute>
      </Route>
      <Route path="/cases/new">
        <ProtectedRoute>
          <CaseNew />
        </ProtectedRoute>
      </Route>
      <Route path="/cases/:id">
        <ProtectedRoute>
          <CaseDetail />
        </ProtectedRoute>
      </Route>
      <Route path="/patients">
        <ProtectedRoute>
          <Patients />
        </ProtectedRoute>
      </Route>
      <Route path="/patients/new">
        <ProtectedRoute>
          <PatientNew />
        </ProtectedRoute>
      </Route>
      <Route path="/patients/:id">
        <ProtectedRoute>
          <PatientDetail />
        </ProtectedRoute>
      </Route>
      <Route path="/labs">
        <ProtectedRoute>
          <Labs />
        </ProtectedRoute>
      </Route>
      <Route path="/orchestrator">
        <ProtectedRoute>
          <Orchestrator />
        </ProtectedRoute>
      </Route>
      <Route path="/early-deterioration">
        <ProtectedRoute>
          <EarlyDeterioration />
        </ProtectedRoute>
      </Route>
      <Route path="/medication-safety">
        <ProtectedRoute>
          <MedicationSafety />
        </ProtectedRoute>
      </Route>
      <Route path="/lab-trends">
        <ProtectedRoute>
          <LabTrends />
        </ProtectedRoute>
      </Route>
      <Route path="/risk-safety">
        <ProtectedRoute>
          <RiskSafety />
        </ProtectedRoute>
      </Route>
      <Route path="/chat">
        <ProtectedRoute>
          <Chat />
        </ProtectedRoute>
      </Route>
      <Route path="/qr-scan">
        <ProtectedRoute>
          <QRScan />
        </ProtectedRoute>
      </Route>
      <Route path="/audit">
        <ProtectedRoute>
          <AuditLogs />
        </ProtectedRoute>
      </Route>
      <Route path="/settings">
        <ProtectedRoute>
          <Settings />
        </ProtectedRoute>
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

// Wrap Router with Suspense for lazy loading
function SuspendedRouter() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Router />
    </Suspense>
  );
}

// Wrapper to conditionally render sidebar based on route
function AppContent() {
  const [location] = useLocation();
  // Public pages: Landing, Solutions, Pricing, About, Blog, Contact, Privacy, Terms, Login, Signup (no sidebar)
  const isPublicPage = location === "/" || location.startsWith("/solutions") || location.startsWith("/pricing") || location.startsWith("/about") || location.startsWith("/blog") || location.startsWith("/contact") || location === "/privacy" || location === "/terms" || location === "/login" || location === "/signup";

  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  // Public pages: No sidebar, just the page content
  if (isPublicPage) {
    return <SuspendedRouter />;
  }

  // Protected pages: Full layout with sidebar
  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <div className="flex flex-col flex-1 overflow-hidden">
          <TopHeader />
          <main className="flex-1 overflow-auto bg-background">
            <SuspendedRouter />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

import { ErrorBoundary } from "@/components/error-boundary";

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider defaultTheme="dark" storageKey="clinical-care-theme">
            <TooltipProvider>
              <AppContent />
              <Toaster />
            </TooltipProvider>
          </ThemeProvider>
        </QueryClientProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
