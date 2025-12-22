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
import Login from "@/pages/login";
import Signup from "@/pages/signup";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import Cases from "@/pages/cases";
import CaseNew from "@/pages/case-new";
import CaseDetail from "@/pages/case-detail";
import Patients from "@/pages/patients";
import PatientNew from "@/pages/patient-new";
import PatientDetail from "@/pages/patient-detail";
import Labs from "@/pages/labs";
import Orchestrator from "@/pages/orchestrator";
import RiskSafety from "@/pages/risk-safety";
import Chat from "@/pages/chat";
import AuditLogs from "@/pages/audit";
import Settings from "@/pages/settings";

function Router() {
  return (
    <Switch>
      {/* Public routes - Login and Signup pages (no sidebar) */}
      <Route path="/login" component={Login} />
      <Route path="/signup" component={Signup} />

      {/* Protected routes - Require authentication */}
      <Route path="/">
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

// Wrapper to conditionally render sidebar based on route
function AppContent() {
  const [location] = useLocation();
  const isAuthPage = location === "/login" || location === "/signup";

  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  // Auth pages: No sidebar, just the page content
  if (isAuthPage) {
    return <Router />;
  }

  // Protected pages: Full layout with sidebar
  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <div className="flex flex-col flex-1 overflow-hidden">
          <TopHeader />
          <main className="flex-1 overflow-auto bg-background">
            <Router />
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
          <ThemeProvider defaultTheme="light" storageKey="clinical-care-theme">
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
