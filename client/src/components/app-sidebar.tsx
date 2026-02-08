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
import { QrCode, Activity, HeartPulse } from "lucide-react";
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
    { title: "Dashboard", url: "/dashboard", icon: VscDashboard },
    { title: "Cases", url: "/cases", icon: VscFolderOpened },
    { title: "Patients", url: "/patients", icon: VscOrganization },
    { title: "Lab Reports", url: "/labs", icon: VscFile },
    { title: "QR Scan", url: "/qr-scan", icon: QrCode },
];

const aiNavItems = [
    { title: "Agent Orchestrator", url: "/orchestrator", icon: VscCircuitBoard },
    { title: "Early Deterioration", url: "/early-deterioration", icon: Activity, badge: "AI" },
    { title: "Medication Safety", url: "/medication-safety", icon: VscShield, badge: "AI" },
    { title: "Lab Trends", url: "/lab-trends", icon: VscPulse, badge: "AI" },
    { title: "Risk & Safety", url: "/risk-safety", icon: VscWarning },
    { title: "Clinical Chat", url: "/chat", icon: VscComment },
];

const systemNavItems = [
    { title: "Audit Logs", url: "/audit", icon: VscChecklist },
    { title: "Settings", url: "/settings", icon: VscSettingsGear },
];

export function AppSidebar() {
    const [location] = useLocation();
    const { instance, accounts } = useMsal();
    const msalAccount = accounts[0];

    const handleLogout = () => {
        instance.logoutPopup({
            postLogoutRedirectUri: "/login",
            mainWindowRedirectUri: "/login"
        }).catch(() => { window.location.href = "/login"; });
    };

    return (
        <Sidebar className="border-r border-sidebar-border/50">
            <SidebarHeader className="h-16 flex items-center px-4 border-b border-sidebar-border/50 bg-sidebar">
                <div className="flex items-center gap-3">
                    <div className="relative group">
                        <div className="absolute inset-0 bg-primary/40 rounded-xl blur-lg opacity-50 group-hover:opacity-100 transition-opacity duration-500" />
                        <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-sky-400 text-white shadow-lg shadow-primary/30">
                            <HeartPulse className="h-5 w-5" />
                        </div>
                    </div>
                    <div className="flex flex-col leading-none">
                        <span className="text-base font-bold tracking-tight">HealthMesh</span>
                        <span className="text-[10px] text-primary font-semibold uppercase tracking-widest mt-0.5 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 status-pulse" />
                            Healthcare AI
                        </span>
                    </div>
                </div>
            </SidebarHeader>

            <SidebarContent className="py-4 px-2">
                <SidebarGroup>
                    <SidebarGroupLabel className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-3 mb-2">Clinical</SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {clinicalNavItems.map((item) => (
                                <SidebarMenuItem key={item.title}>
                                    <SidebarMenuButton asChild isActive={location === item.url}
                                        className={cn("h-10 px-3 w-full justify-start gap-3 rounded-xl transition-all duration-200",
                                            location === item.url ? "bg-primary/15 text-primary font-medium shadow-sm border border-primary/20" : "text-muted-foreground hover:text-foreground hover:bg-muted/50")}>
                                        <Link href={item.url}>
                                            <item.icon className={cn("h-4 w-4 shrink-0", location === item.url && "text-primary")} />
                                            <span>{item.title}</span>
                                        </Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            ))}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>

                <SidebarGroup className="mt-4">
                    <SidebarGroupLabel className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-3 mb-2 flex items-center gap-2">
                        <span>AI & Decision Support</span>
                        <Badge variant="outline" className="h-4 px-1.5 text-[9px] font-bold bg-teal-500/10 text-teal-400 border-teal-500/30">BETA</Badge>
                    </SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {aiNavItems.map((item) => (
                                <SidebarMenuItem key={item.title}>
                                    <SidebarMenuButton asChild isActive={location === item.url}
                                        className={cn("h-10 px-3 w-full justify-start gap-3 rounded-xl transition-all duration-200",
                                            location === item.url ? "bg-primary/15 text-primary font-medium shadow-sm border border-primary/20" : "text-muted-foreground hover:text-foreground hover:bg-muted/50")}>
                                        <Link href={item.url}>
                                            <item.icon className={cn("h-4 w-4 shrink-0", location === item.url && "text-primary")} />
                                            <span className="flex-1">{item.title}</span>
                                            {item.badge && <Badge variant="outline" className="h-5 px-1.5 text-[10px] font-bold bg-teal-500/10 text-teal-400 border-teal-500/30">{item.badge}</Badge>}
                                        </Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            ))}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>

                <SidebarGroup className="mt-4">
                    <SidebarGroupLabel className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-3 mb-2">System</SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {systemNavItems.map((item) => (
                                <SidebarMenuItem key={item.title}>
                                    <SidebarMenuButton asChild isActive={location === item.url}
                                        className={cn("h-10 px-3 w-full justify-start gap-3 rounded-xl transition-all duration-200",
                                            location === item.url ? "bg-primary/15 text-primary font-medium shadow-sm border border-primary/20" : "text-muted-foreground hover:text-foreground hover:bg-muted/50")}>
                                        <Link href={item.url}>
                                            <item.icon className={cn("h-4 w-4 shrink-0", location === item.url && "text-primary")} />
                                            <span>{item.title}</span>
                                        </Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            ))}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
            </SidebarContent>

            <SidebarFooter className="p-3 border-t border-sidebar-border/50 bg-sidebar space-y-3">
                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-500/5 border border-amber-500/10">
                    <VscWarning className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                    <div className="flex flex-col gap-0.5">
                        <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wide">Clinical Support Only</span>
                        <span className="text-[10px] text-muted-foreground leading-tight">AI assists—clinicians decide.</span>
                    </div>
                </div>
                {msalAccount && (
                    <div className="flex items-center gap-3 p-2.5 rounded-xl bg-muted/30 border border-border/50">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-teal-500/20 border border-primary/30">
                            <VscAccount className="h-4 w-4 text-primary" />
                        </div>
                        <div className="flex flex-col flex-1 min-w-0">
                            <span className="text-xs font-medium truncate text-foreground">{msalAccount.name || "Clinician"}</span>
                            <span className="text-[10px] text-muted-foreground truncate">{msalAccount.username || "Authorized User"}</span>
                        </div>
                        <Button variant="ghost" size="icon" onClick={handleLogout} className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-rose-500/10 rounded-lg" title="Sign out">
                            <VscSignOut className="h-4 w-4" />
                        </Button>
                    </div>
                )}
            </SidebarFooter>
        </Sidebar>
    );
}
