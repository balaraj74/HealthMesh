import { Link, useLocation } from "wouter";
import { useMsal } from "@azure/msal-react";
import {
  VscDashboard,
  VscOrganization,
  VscFolderOpened,
  VscFile,
  VscPulse,
  VscCircuitBoard,
  VscShield,
  VscComment,
  VscChecklist,
  VscSettingsGear,
  VscWarning,
  VscSignOut,
  VscAccount,
} from "react-icons/vsc";
import { QrCode, Activity } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const clinicalNavItems = [
  {
    title: "Dashboard",
    url: "/",
    icon: VscDashboard,
  },
  {
    title: "Cases",
    url: "/cases",
    icon: VscFolderOpened,
  },
  {
    title: "Patients",
    url: "/patients",
    icon: VscOrganization,
  },
  {
    title: "Lab Reports",
    url: "/labs",
    icon: VscFile,
  },
  {
    title: "QR Scan",
    url: "/qr-scan",
    icon: QrCode,
  },
];

const aiNavItems = [
  {
    title: "Agent Orchestrator",
    url: "/orchestrator",
    icon: VscCircuitBoard,
  },
  {
    title: "Early Deterioration",
    url: "/early-deterioration",
    icon: Activity,
    badge: "AI",
  },
  {
    title: "Medication Safety",
    url: "/medication-safety",
    icon: VscShield,
    badge: "AI",
  },
  {
    title: "Lab Trends",
    url: "/lab-trends",
    icon: VscPulse,
    badge: "AI",
  },
  {
    title: "Risk & Safety",
    url: "/risk-safety",
    icon: VscWarning,
  },
  {
    title: "Clinical Chat",
    url: "/chat",
    icon: VscComment,
  },
];

const systemNavItems = [
  {
    title: "Audit Logs",
    url: "/audit",
    icon: VscChecklist,
  },
  {
    title: "Settings",
    url: "/settings",
    icon: VscSettingsGear,
  },
];

export function AppSidebar() {
  const [location] = useLocation();
  const { instance, accounts } = useMsal();
  const msalAccount = accounts[0];

  const handleLogout = () => {
    instance.logoutPopup({
      postLogoutRedirectUri: "/login",
      mainWindowRedirectUri: "/login"
    }).catch((error) => {
      console.error("Logout error:", error);
      window.location.href = "/login";
    });
  };

  return (
    <Sidebar>
      <SidebarHeader className="h-14 flex items-center px-4 border-b border-sidebar-border bg-sidebar">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded bg-primary text-primary-foreground">
            <VscPulse className="h-5 w-5" />
          </div>
          <div className="flex flex-col leading-none">
            <span className="text-sm font-bold tracking-tight">HealthMesh</span>
            <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider mt-0.5">Enterprise</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="py-2">
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70 px-4 mb-2">Clinical</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {clinicalNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={location === item.url}
                    className={cn(
                      "h-9 px-4 w-full justify-start gap-3 transition-colors",
                      location === item.url
                        ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium border-l-2 border-primary rounded-none"
                        : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/50"
                    )}
                  >
                    <Link href={item.url} data-testid={`link-nav-${item.title.toLowerCase().replace(/\s+/g, '-')}`}>
                      <item.icon className="h-4 w-4 shrink-0" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mt-2">
          <SidebarGroupLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70 px-4 mb-2">AI & Decision Support</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {aiNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={location === item.url}
                    className={cn(
                      "h-9 px-4 w-full justify-start gap-3 transition-colors",
                      location === item.url
                        ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium border-l-2 border-primary rounded-none"
                        : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/50"
                    )}
                  >
                    <Link href={item.url} data-testid={`link-nav-${item.title.toLowerCase().replace(/\s+/g, '-')}`}>
                      <item.icon className="h-4 w-4 shrink-0" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mt-2">
          <SidebarGroupLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70 px-4 mb-2">System</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {systemNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={location === item.url}
                    className={cn(
                      "h-9 px-4 w-full justify-start gap-3 transition-colors",
                      location === item.url
                        ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium border-l-2 border-primary rounded-none"
                        : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/50"
                    )}
                  >
                    <Link href={item.url} data-testid={`link-nav-${item.title.toLowerCase().replace(/\s+/g, '-')}`}>
                      <item.icon className="h-4 w-4 shrink-0" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-sidebar-border bg-sidebar space-y-4">
        {/* Clinical Disclaimer */}
        <div className="flex items-start gap-3 p-3 rounded bg-destructive/5 border border-destructive/10">
          <VscWarning className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
          <div className="flex flex-col gap-0.5">
            <span className="text-[11px] font-bold text-destructive uppercase tracking-wide">Decision Support Only</span>
            <span className="text-[10px] text-muted-foreground leading-tight">
              AI recommendations must be verified by a clinician. Not for automated diagnosis.
            </span>
          </div>
        </div>

        {/* User Profile Section */}
        {msalAccount && (
          <div className="flex items-center gap-3 pt-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary border border-primary/20">
              <VscAccount className="h-4 w-4" />
            </div>
            <div className="flex flex-col flex-1 min-w-0">
              <span className="text-xs font-medium truncate text-foreground">
                {msalAccount.name || "Clinician"}
              </span>
              <span className="text-[10px] text-muted-foreground truncate">
                {msalAccount.username || "Authorized User"}
              </span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
              title="Sign out"
            >
              <VscSignOut className="h-4 w-4" />
            </Button>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
