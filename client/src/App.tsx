import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import Cases from "@/pages/cases";
import CaseNew from "@/pages/case-new";
import CaseDetail from "@/pages/case-detail";
import Patients from "@/pages/patients";
import PatientNew from "@/pages/patient-new";
import Labs from "@/pages/labs";
import Orchestrator from "@/pages/orchestrator";
import RiskSafety from "@/pages/risk-safety";
import Chat from "@/pages/chat";
import AuditLogs from "@/pages/audit";
import Settings from "@/pages/settings";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/cases" component={Cases} />
      <Route path="/cases/new" component={CaseNew} />
      <Route path="/cases/:id" component={CaseDetail} />
      <Route path="/patients" component={Patients} />
      <Route path="/patients/new" component={PatientNew} />
      <Route path="/labs" component={Labs} />
      <Route path="/orchestrator" component={Orchestrator} />
      <Route path="/risk-safety" component={RiskSafety} />
      <Route path="/chat" component={Chat} />
      <Route path="/audit" component={AuditLogs} />
      <Route path="/settings" component={Settings} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light" storageKey="clinical-care-theme">
        <TooltipProvider>
          <SidebarProvider style={style as React.CSSProperties}>
            <div className="flex h-screen w-full">
              <AppSidebar />
              <div className="flex flex-col flex-1 overflow-hidden">
                <header className="flex items-center justify-between gap-4 p-2 border-b bg-background z-10">
                  <SidebarTrigger data-testid="button-sidebar-toggle" />
                  <ThemeToggle />
                </header>
                <main className="flex-1 overflow-auto bg-background">
                  <Router />
                </main>
              </div>
            </div>
          </SidebarProvider>
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
